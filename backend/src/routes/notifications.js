const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getCondoPool } = require('../services/database');
const notificationsService = require('../services/notifications');
const notificationSender = require('../services/notification-sender');

const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { status = 'all', limit = 20, offset = 0 } = req.query;
    const pool = getCondoPool();

    let query = `SELECT id, usuario_id, tipo, titulo, mensagem, status, lido, created_at 
                 FROM ${condoSchema}.notification_queue 
                 WHERE usuario_id = $1`;
    const params = [user.id];
    let paramCount = 2;

    if (status !== 'all') {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get unread count
    const unreadResult = await pool.query(
      `SELECT COUNT(*) as count FROM ${condoSchema}.notification_queue WHERE usuario_id = $1 AND lido = false`,
      [user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/:id - Get specific notification
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const pool = getCondoPool();

    const result = await pool.query(
      `SELECT id, usuario_id, tipo, titulo, mensagem, status, lido, created_at 
       FROM ${condoSchema}.notification_queue 
       WHERE id = $1 AND usuario_id = $2`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const pool = getCondoPool();

    const result = await pool.query(
      `UPDATE ${condoSchema}.notification_queue 
       SET lido = true, updated_at = NOW() 
       WHERE id = $1 AND usuario_id = $2 
       RETURNING id, usuario_id, tipo, titulo, mensagem, status, lido, created_at`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const pool = getCondoPool();

    await pool.query(
      `UPDATE ${condoSchema}.notification_queue 
       SET lido = true, updated_at = NOW() 
       WHERE usuario_id = $1 AND lido = false`,
      [user.id]
    );

    res.json({ success: true, message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/preferences - Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const prefs = await notificationsService.getUserNotificationPrefs(condoSchema, user.id);
    res.json({ success: true, data: prefs || {} });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/preferences - Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const preferences = req.body;

    await notificationsService.updateNotificationPrefs(condoSchema, user.id, preferences);

    res.json({ success: true, data: preferences, message: 'Preferências atualizadas com sucesso' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const pool = getCondoPool();

    const result = await pool.query(
      `DELETE FROM ${condoSchema}.notification_queue
       WHERE id = $1 AND usuario_id = $2
       RETURNING id`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }

    res.json({ success: true, message: 'Notificação deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications/worker/process - Process notification queue (internal endpoint)
router.post('/worker/process', async (req, res) => {
  try {
    const { condoSchema, batchSize = 10 } = req.body;

    if (!condoSchema) {
      return res.status(400).json({ success: false, error: 'condoSchema is required' });
    }

    const results = await notificationSender.processNotificationQueue(condoSchema, batchSize);

    res.json({
      success: true,
      data: results,
      processed: results.length
    });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
