const request = require('supertest');
const app = require('../../src/server');

jest.mock('../../src/services/database');
jest.mock('../../src/services/notifications');
jest.mock('../../src/services/audit');

describe('Notifications Routes', () => {
  let token;

  beforeEach(() => {
    token = global.testUtils.generateToken(1, 'morador', 1);
  });

  describe('GET /api/notifications/preferencias', () => {
    it('should return user notification preferences', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUserNotificationPrefs.mockResolvedValueOnce({
        usuario_id: 1,
        votacoes_ativas: true,
        agendamento_confirmacao: true,
        agendamento_cancelamento: false,
        fornecedor_resposta: true,
        notificacoes_gerais: true,
        canal_whatsapp: true,
        canal_email: true,
        canal_sms: false
      });

      const response = await request(app)
        .get('/api/notifications/preferencias')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.votacoes_ativas).toBe(true);
      expect(response.body.data.canal_whatsapp).toBe(true);
    });

    it('should return default preferences if not set', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUserNotificationPrefs.mockResolvedValueOnce({
        usuario_id: 1,
        votacoes_ativas: true,
        agendamento_confirmacao: true,
        agendamento_cancelamento: true,
        fornecedor_resposta: true,
        notificacoes_gerais: true,
        canal_whatsapp: true,
        canal_email: true,
        canal_sms: false
      });

      const response = await request(app)
        .get('/api/notifications/preferencias')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/notifications/preferencias', () => {
    it('should update notification preferences', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.updateNotificationPrefs.mockResolvedValueOnce({
        usuario_id: 1,
        votacoes_ativas: false,
        agendamento_confirmacao: true,
        canal_whatsapp: true,
        canal_email: false
      });

      const response = await request(app)
        .put('/api/notifications/preferencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          votacoes_ativas: false,
          agendamento_confirmacao: true,
          canal_email: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.votacoes_ativas).toBe(false);
      expect(response.body.data.canal_email).toBe(false);
    });

    it('should accept partial updates', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.updateNotificationPrefs.mockResolvedValueOnce({
        usuario_id: 1,
        canal_sms: true
      });

      const response = await request(app)
        .put('/api/notifications/preferencias')
        .set('Authorization', `Bearer ${token}`)
        .send({ canal_sms: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUserNotifications.mockResolvedValueOnce([
        {
          id: 1,
          usuario_id: 1,
          tipo: 'votacao_ativa',
          titulo: 'Nova votação disponível',
          mensagem: 'Uma nova votação foi aberta',
          lido: false,
          criado_em: new Date()
        },
        {
          id: 2,
          usuario_id: 1,
          tipo: 'agendamento_confirmado',
          titulo: 'Agendamento confirmado',
          mensagem: 'Seu agendamento foi confirmado',
          lido: true,
          criado_em: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].lido).toBe(false);
      expect(response.body.data[1].lido).toBe(true);
    });

    it('should support pagination', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUserNotifications.mockResolvedValueOnce(
        Array(10).fill({
          id: 1,
          tipo: 'votacao_ativa',
          titulo: 'Nova votação',
          lido: false
        })
      );

      const response = await request(app)
        .get('/api/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
    });

    it('should return empty array if no notifications', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUserNotifications.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/notifications/:id/marcar-lido', () => {
    it('should mark notification as read', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.markAsRead.mockResolvedValueOnce({
        id: 1,
        lido: true,
        lido_em: new Date()
      });

      const response = await request(app)
        .put('/api/notifications/1/marcar-lido')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lido).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.markAsRead.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/notifications/999/marcar-lido')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.deleteNotification.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .delete('/api/notifications/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.deleteNotification.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/notifications/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/marcar-todos-lidos', () => {
    it('should mark all notifications as read', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.markAllAsRead.mockResolvedValueOnce({
        updated: 5
      });

      const response = await request(app)
        .post('/api/notifications/marcar-todos-lidos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(5);
    });

    it('should handle no unread notifications', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.markAllAsRead.mockResolvedValueOnce({
        updated: 0
      });

      const response = await request(app)
        .post('/api/notifications/marcar-todos-lidos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(0);
    });
  });

  describe('GET /api/notifications/nao-lidas/count', () => {
    it('should return count of unread notifications', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUnreadCount.mockResolvedValueOnce({
        total: 3
      });

      const response = await request(app)
        .get('/api/notifications/nao-lidas/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
    });

    it('should return 0 if no unread notifications', async () => {
      const mockNotif = require('../../src/services/notifications');
      mockNotif.getUnreadCount.mockResolvedValueOnce({
        total: 0
      });

      const response = await request(app)
        .get('/api/notifications/nao-lidas/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(0);
    });
  });
});
