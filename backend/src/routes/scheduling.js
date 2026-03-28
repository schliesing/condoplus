const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, authorize, injectCondoSchema, logAuditAction } = require('../middleware/auth');
const schedulingService = require('../services/scheduling');
const notificationService = require('../services/notifications');

const router = express.Router();

// Middleware: requer schema do condomínio
router.use(authenticateToken);
router.use(injectCondoSchema);

/**
 * GET /api/scheduling/areas
 * Listar áreas de agendamento
 */
router.get('/areas', async (req, res) => {
  try {
    const areas = await schedulingService.listAreas(req.condoSchema);
    res.json(areas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scheduling/areas/:id/schedule
 * Obter agendamentos de uma área
 */
router.get(
  '/areas/:id/schedule',
  query('dataInicio').isISO8601(),
  query('dataFim').isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const schedule = await schedulingService.getAreaSchedule(
        req.condoSchema,
        req.params.id,
        req.query.dataInicio,
        req.query.dataFim
      );

      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/scheduling/agendar
 * Criar novo agendamento (reserva)
 */
router.post(
  '/agendar',
  authorize('morador', 'admin'),
  body('areaId').isInt(),
  body('dataInicio').isISO8601(),
  body('dataFim').isISO8601(),
  logAuditAction('agendamentos', 'criar_agendamento'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const agendamento = await schedulingService.createAgendamento(
        req.condoSchema,
        req.body.areaId,
        req.user.id,
        req.body.dataInicio,
        req.body.dataFim
      );

      // Enfileirar notificação de confirmação
      await notificationService.queueNotification(
        req.condoSchema,
        req.user.id,
        'agendamento_confirmacao',
        `Sua reserva foi confirmada para ${new Date(req.body.dataInicio).toLocaleDateString('pt-BR')}`
      );

      res.status(201).json(agendamento);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/scheduling/meus-agendamentos
 * Obter agendamentos do morador
 */
router.get('/meus-agendamentos', authorize('morador', 'admin'), async (req, res) => {
  try {
    const agendamentos = await schedulingService.getUserAgendamentos(
      req.condoSchema,
      req.user.id
    );

    res.json(agendamentos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/scheduling/agendamentos/:id
 * Cancelar agendamento
 */
router.delete(
  '/agendamentos/:id',
  authorize('morador', 'admin'),
  logAuditAction('agendamentos', 'cancelar_agendamento'),
  async (req, res) => {
    try {
      const agendamento = await schedulingService.cancelAgendamento(
        req.condoSchema,
        req.params.id,
        req.user.id
      );

      // Enfileirar notificação de cancelamento
      await notificationService.queueNotification(
        req.condoSchema,
        req.user.id,
        'agendamento_cancelado',
        'Seu agendamento foi cancelado'
      );

      res.json({
        message: 'Agendamento cancelado com sucesso',
        agendamento,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/scheduling/areas/:id/bloquear
 * Bloquear horário de uma área (admin apenas)
 */
router.post(
  '/areas/:id/bloquear',
  authorize('admin'),
  body('dataInicio').isISO8601(),
  body('dataFim').isISO8601(),
  body('motivo').notEmpty(),
  logAuditAction('bloqueios_area', 'bloquear_horario'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const bloqueio = await schedulingService.blockAreaTime(
        req.condoSchema,
        req.params.id,
        req.body.dataInicio,
        req.body.dataFim,
        req.body.motivo,
        req.user.id
      );

      res.status(201).json(bloqueio);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
