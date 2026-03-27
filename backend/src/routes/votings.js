const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize, injectCondoSchema, logAuditAction } = require('../middleware/auth');
const votingService = require('../services/voting');
const signatureService = require('../services/signature');
const notificationService = require('../services/notifications');

const router = express.Router();

// Middleware: requer schema do condomínio
router.use(authenticateToken);
router.use(injectCondoSchema);

/**
 * GET /api/votings
 * Listar todas as votações do condomínio
 */
router.get('/', async (req, res) => {
  try {
    const votacoes = await votingService.listVotacoes(req.condoSchema);
    res.json(votacoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/votings
 * Criar nova votação (admin apenas)
 */
router.post(
  '/',
  authorize('admin'),
  body('titulo').notEmpty(),
  body('data_inicio_sugestoes').isISO8601(),
  body('data_fim_sugestoes').isISO8601(),
  body('data_inicio_votacao').isISO8601(),
  body('data_fim_votacao').isISO8601(),
  logAuditAction('votacoes', 'criar_votacao'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const votacao = await votingService.createVotacao(
        req.condoSchema,
        req.body,
        req.user.id
      );

      // Enfileirar notificações para moradores
      const { queueNotification } = notificationService;
      // Será enviado um job para notificar todos os moradores depois

      res.status(201).json(votacao);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/votings/:id
 * Obter detalhes de uma votação
 */
router.get('/:id', async (req, res) => {
  try {
    const votacao = await votingService.getVotacaoWithResult(
      req.condoSchema,
      req.params.id
    );

    res.json(votacao);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/votings/:id/votar
 * Registrar voto do morador
 */
router.post(
  '/:id/votar',
  authorize('morador', 'admin'),
  body('voto').isIn(['sim', 'nao', 'abstencao']),
  logAuditAction('votos', 'registrar_voto'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const voto = await votingService.registerVote(
        req.condoSchema,
        req.params.id,
        req.user.id,
        req.body.voto
      );

      res.status(201).json(voto);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/votings/:id/voto
 * Alterar voto (antes de assinar)
 */
router.put(
  '/:id/voto',
  authorize('morador', 'admin'),
  body('voto').isIn(['sim', 'nao', 'abstencao']),
  logAuditAction('votos', 'alterar_voto'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const voto = await votingService.updateVote(
        req.condoSchema,
        req.params.id,
        req.user.id,
        req.body.voto
      );

      res.json(voto);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/votings/:id/voto
 * Cancelar voto
 */
router.delete(
  '/:id/voto',
  authorize('morador', 'admin'),
  logAuditAction('votos', 'cancelar_voto'),
  async (req, res) => {
    try {
      await votingService.cancelVote(
        req.condoSchema,
        req.params.id,
        req.user.id
      );

      res.json({ message: 'Voto cancelado com sucesso' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/votings/:id/enviar-para-assinatura
 * Enviar resultado da votação para assinatura digital
 */
router.post(
  '/:id/enviar-para-assinatura',
  authorize('morador', 'admin'),
  logAuditAction('assinaturas', 'enviar_para_assinatura'),
  async (req, res) => {
    try {
      // Obter resultado da votação
      const resultado = await votingService.getVotacaoWithResult(
        req.condoSchema,
        req.params.id
      );

      // Gerar PDF
      const pdf = await signatureService.generateVotingPDF(
        resultado.votacao,
        resultado.resultado
      );

      // Enviar para assinatura (placeholder - será integrado depois)
      const assinatura = await signatureService.sendForSignature(
        req.condoSchema,
        req.params.id,
        req.user.id,
        `https://cdn.example.com/pdfs/${pdf.hash}.pdf`, // URL placeholder
        pdf.hash
      );

      res.json({
        message: 'Votação enviada para assinatura',
        assinatura,
        resultado: resultado.resultado,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/votings/:id/resultado
 * Obter resultado da votação (com popup de confirmação antes de assinar)
 */
router.get('/:id/resultado', async (req, res) => {
  try {
    const resultado = await votingService.getVotacaoWithResult(
      req.condoSchema,
      req.params.id
    );

    // Verificar se morador já assinou
    const assinatura = await signatureService.getSignature(
      req.condoSchema,
      req.params.id,
      req.user.id
    );

    res.json({
      resultado: resultado.resultado,
      votacao: resultado.votacao,
      totalVotos: resultado.totalVotos,
      totalMoradores: resultado.totalMoradores,
      percentualParticipacao: resultado.percentualParticipacao,
      quorumAtingido: resultado.quorumAtingido,
      jaAssinou: assinatura && assinatura.status_assinatura === 'assinado',
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/votings/:id/iniciar
 * Iniciar votação (muda status para 'votando')
 */
router.post(
  '/:id/iniciar',
  authorize('admin'),
  logAuditAction('votacoes', 'iniciar_votacao'),
  async (req, res) => {
    try {
      const votacao = await votingService.startVoting(
        req.condoSchema,
        req.params.id
      );

      res.json({
        message: 'Votação iniciada',
        votacao,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/votings/:id/encerrar
 * Encerrar votação
 */
router.post(
  '/:id/encerrar',
  authorize('admin'),
  logAuditAction('votacoes', 'encerrar_votacao'),
  async (req, res) => {
    try {
      const votacao = await votingService.finishVoting(
        req.condoSchema,
        req.params.id
      );

      res.json({
        message: 'Votação encerrada',
        votacao,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
