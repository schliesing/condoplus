const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getCondoPool } = require('../services/database');
const auditService = require('../services/audit');

const router = express.Router();

// GET /api/config - Get all configurations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { condoSchema } = req;
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT chave, valor, descricao, tipo FROM ${condoSchema}.configuracoes ORDER BY chave`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/config/:chave - Get specific configuration
router.get('/:chave', authenticateToken, async (req, res) => {
  try {
    const { condoSchema } = req;
    const { chave } = req.params;
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT chave, valor, descricao, tipo FROM ${condoSchema}.configuracoes WHERE chave = $1`,
      [chave]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Configuração não encontrada' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/config/:chave - Update configuration (admin only)
router.put('/:chave', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { chave } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({ success: false, error: 'Valor é obrigatório' });
    }

    const pool = getCondoPool();

    // Verify configuration exists
    const existing = await pool.query(
      `SELECT chave, tipo FROM ${condoSchema}.configuracoes WHERE chave = $1`,
      [chave]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Configuração não encontrada' });
    }

    // Validate based on type
    const { tipo } = existing.rows[0];
    let validValue = valor;
    if (tipo === 'integer') {
      const intVal = parseInt(valor);
      if (isNaN(intVal)) {
        return res.status(400).json({ success: false, error: 'Valor deve ser um número inteiro' });
      }
      validValue = intVal;
    } else if (tipo === 'boolean') {
      if (typeof valor !== 'boolean' && valor !== 'true' && valor !== 'false') {
        return res.status(400).json({ success: false, error: 'Valor deve ser booleano' });
      }
      validValue = valor === true || valor === 'true';
    }

    await pool.query(
      `UPDATE ${condoSchema}.configuracoes SET valor = $1, updated_at = NOW() WHERE chave = $2`,
      [validValue, chave]
    );

    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'ATUALIZAR_CONFIGURACAO',
      entidade_tipo: 'configuracao',
      entidade_id: chave,
      detalhes: { chave, novo_valor: validValue }
    });

    const updatedResult = await pool.query(
      `SELECT chave, valor, descricao, tipo FROM ${condoSchema}.configuracoes WHERE chave = $1`,
      [chave]
    );

    res.json({
      success: true,
      data: updatedResult.rows[0],
      message: 'Configuração atualizada com sucesso'
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
