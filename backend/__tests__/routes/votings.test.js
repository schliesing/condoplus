const request = require('supertest');
const app = require('../../src/server');

// Mock all database calls
jest.mock('../../src/services/database');
jest.mock('../../src/services/voting');
jest.mock('../../src/services/audit');

describe('Votings Routes', () => {
  let token;
  let adminToken;

  beforeEach(() => {
    // Generate test tokens
    token = global.testUtils.generateToken(1, 'morador', 1);
    adminToken = global.testUtils.generateToken(2, 'admin', 1);
  });

  describe('GET /api/votings', () => {
    it('should return list of votations', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.listVotacoes.mockResolvedValueOnce([
        {
          id: 1,
          titulo: 'Votação 1',
          status: 'pauta_definida',
          created_at: new Date()
        },
        {
          id: 2,
          titulo: 'Votação 2',
          status: 'votando',
          created_at: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/votings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].titulo).toBe('Votação 1');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/votings')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/votings', () => {
    it('should create votation as admin', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.createVotacao.mockResolvedValueOnce({
        id: 1,
        titulo: 'Nova Votação',
        descricao: 'Descrição',
        status: 'sugestoes'
      });

      const response = await request(app)
        .post('/api/votings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Nova Votação',
          descricao: 'Descrição',
          prazo_sugestoes: '2026-04-10T00:00:00Z'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.titulo).toBe('Nova Votação');
    });

    it('should reject creation by non-admin', async () => {
      const response = await request(app)
        .post('/api/votings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Nova Votação',
          descricao: 'Descrição'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/votings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          descricao: 'Descrição sem título'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/votings/:id', () => {
    it('should return votation with results', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.getVotacaoWithResult.mockResolvedValueOnce({
        id: 1,
        titulo: 'Votação 1',
        status: 'encerrada',
        votos_a_favor: 10,
        votos_contra: 2,
        percentual_favor: 83.3,
        quorum_atingido: true
      });

      const response = await request(app)
        .get('/api/votings/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.percentual_favor).toBe(83.3);
    });

    it('should return 404 for non-existent votation', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.getVotacaoWithResult.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/votings/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/votings/:id/votar', () => {
    it('should register vote', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.registerVote.mockResolvedValueOnce({
        id: 1,
        votacao_id: 1,
        usuario_id: 1,
        voto: 'favor',
        timestamp: new Date()
      });

      const response = await request(app)
        .post('/api/votings/1/votar')
        .set('Authorization', `Bearer ${token}`)
        .send({ voto: 'favor' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voto).toBe('favor');
    });

    it('should reject invalid vote value', async () => {
      const response = await request(app)
        .post('/api/votings/1/votar')
        .set('Authorization', `Bearer ${token}`)
        .send({ voto: 'maybe' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/votings/:id/voto', () => {
    it('should update vote before signing', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.updateVote.mockResolvedValueOnce({
        id: 1,
        voto: 'contra',
        updated_at: new Date()
      });

      const response = await request(app)
        .put('/api/votings/1/voto')
        .set('Authorization', `Bearer ${token}`)
        .send({ voto: 'contra' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voto).toBe('contra');
    });

    it('should prevent vote update after signing', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.updateVote.mockRejectedValueOnce(
        new Error('Voto já assinado digitalmente')
      );

      const response = await request(app)
        .put('/api/votings/1/voto')
        .set('Authorization', `Bearer ${token}`)
        .send({ voto: 'contra' })
        .expect(400);

      expect(response.body.error).toContain('assinado');
    });
  });

  describe('POST /api/votings/:id/iniciar', () => {
    it('should start voting as admin', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.startVoting.mockResolvedValueOnce({
        id: 1,
        status: 'votando',
        started_at: new Date()
      });

      const response = await request(app)
        .post('/api/votings/1/iniciar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('votando');
    });

    it('should reject start by non-admin', async () => {
      const response = await request(app)
        .post('/api/votings/1/iniciar')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/votings/:id/encerrar', () => {
    it('should finish voting as admin', async () => {
      const mockVotings = require('../../src/services/voting');
      mockVotings.finishVoting.mockResolvedValueOnce({
        id: 1,
        status: 'encerrada',
        ended_at: new Date()
      });

      const response = await request(app)
        .post('/api/votings/1/encerrar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('encerrada');
    });
  });
});
