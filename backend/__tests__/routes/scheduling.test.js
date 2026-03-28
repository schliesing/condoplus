const request = require('supertest');
const app = require('../../src/server');

jest.mock('../../src/services/database');
jest.mock('../../src/services/scheduling');
jest.mock('../../src/services/audit');

describe('Scheduling Routes', () => {
  let token;
  let adminToken;

  beforeEach(() => {
    token = global.testUtils.generateToken(1, 'morador', 1);
    adminToken = global.testUtils.generateToken(2, 'admin', 1);
  });

  describe('GET /api/scheduling/areas', () => {
    it('should return list of available areas', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.listAreas.mockResolvedValueOnce([
        {
          id: 1,
          nome: 'Salão de Festas',
          capacidade_maxima: 50,
          descricao: 'Grande salão para eventos'
        },
        {
          id: 2,
          nome: 'Churrasqueira',
          capacidade_maxima: 30,
          descricao: 'Área de churrasqueira'
        }
      ]);

      const response = await request(app)
        .get('/api/scheduling/areas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].nome).toBe('Salão de Festas');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/scheduling/areas')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/scheduling/areas/:id/schedule', () => {
    it('should return area schedule with available dates', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.getAreaSchedule.mockResolvedValueOnce({
        area_id: 1,
        area_nome: 'Salão de Festas',
        datas_disponiveis: [
          '2026-04-10',
          '2026-04-11',
          '2026-04-12',
          '2026-04-15',
          '2026-04-16'
        ],
        datas_bloqueadas: ['2026-04-13', '2026-04-14']
      });

      const response = await request(app)
        .get('/api/scheduling/areas/1/schedule')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datas_disponiveis).toHaveLength(5);
      expect(response.body.data.datas_bloqueadas).toHaveLength(2);
    });

    it('should return 404 for non-existent area', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.getAreaSchedule.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/scheduling/areas/999/schedule')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/scheduling/agendar', () => {
    it('should create agendamento successfully', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.createAgendamento.mockResolvedValueOnce({
        id: 1,
        area_id: 1,
        usuario_id: 1,
        data_inicio: new Date('2026-04-10T14:00:00'),
        data_fim: new Date('2026-04-10T16:00:00'),
        status: 'confirmado'
      });

      const response = await request(app)
        .post('/api/scheduling/agendar')
        .set('Authorization', `Bearer ${token}`)
        .send({
          area_id: 1,
          data_inicio: '2026-04-10T14:00:00Z',
          data_fim: '2026-04-10T16:00:00Z',
          descricao: 'Festa de aniversário'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmado');
    });

    it('should reject booking with conflict', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.createAgendamento.mockRejectedValueOnce(
        new Error('Área indisponível no período solicitado')
      );

      const response = await request(app)
        .post('/api/scheduling/agendar')
        .set('Authorization', `Bearer ${token}`)
        .send({
          area_id: 1,
          data_inicio: '2026-04-10T14:00:00Z',
          data_fim: '2026-04-10T16:00:00Z'
        })
        .expect(400);

      expect(response.body.error).toContain('indisponível');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/scheduling/agendar')
        .set('Authorization', `Bearer ${token}`)
        .send({ area_id: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/scheduling/meus-agendamentos', () => {
    it('should return user agendamentos', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.getUserAgendamentos.mockResolvedValueOnce([
        {
          id: 1,
          area_id: 1,
          area_nome: 'Salão de Festas',
          data_inicio: new Date('2026-04-10T14:00:00'),
          data_fim: new Date('2026-04-10T16:00:00'),
          status: 'confirmado'
        },
        {
          id: 2,
          area_id: 2,
          area_nome: 'Churrasqueira',
          data_inicio: new Date('2026-04-15T10:00:00'),
          data_fim: new Date('2026-04-15T12:00:00'),
          status: 'confirmado'
        }
      ]);

      const response = await request(app)
        .get('/api/scheduling/meus-agendamentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array if no agendamentos', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.getUserAgendamentos.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/scheduling/meus-agendamentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('DELETE /api/scheduling/agendamentos/:id', () => {
    it('should cancel agendamento within 24 hours', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.cancelAgendamento.mockResolvedValueOnce({
        id: 1,
        status: 'cancelado',
        cancelado_em: new Date()
      });

      const response = await request(app)
        .delete('/api/scheduling/agendamentos/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelado');
    });

    it('should reject cancellation within 24 hours', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.cancelAgendamento.mockRejectedValueOnce(
        new Error('Cancelamento permitido apenas com 24 horas de antecedência')
      );

      const response = await request(app)
        .delete('/api/scheduling/agendamentos/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toContain('24 horas');
    });

    it('should return 404 for non-existent agendamento', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.cancelAgendamento.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/scheduling/agendamentos/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/scheduling/areas/:id/bloquear', () => {
    it('should block area time as admin', async () => {
      const mockScheduling = require('../../src/services/scheduling');
      mockScheduling.blockAreaTime.mockResolvedValueOnce({
        id: 1,
        area_id: 1,
        data_inicio: new Date('2026-04-13T08:00:00'),
        data_fim: new Date('2026-04-13T12:00:00'),
        motivo: 'Manutenção'
      });

      const response = await request(app)
        .post('/api/scheduling/areas/1/bloquear')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data_inicio: '2026-04-13T08:00:00Z',
          data_fim: '2026-04-13T12:00:00Z',
          motivo: 'Manutenção'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.motivo).toBe('Manutenção');
    });

    it('should reject block by non-admin', async () => {
      const response = await request(app)
        .post('/api/scheduling/areas/1/bloquear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          data_inicio: '2026-04-13T08:00:00Z',
          data_fim: '2026-04-13T12:00:00Z',
          motivo: 'Manutenção'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
