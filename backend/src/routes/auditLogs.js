const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getCondoPool } = require('../services/database');

const router = express.Router();

// GET /api/audit-logs - List audit logs (admin only)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema } = req;
    const { limit = 100, offset = 0, acao, entidade_tipo, usuario_id } = req.query;
    const pool = getCondoPool();

    let query = `SELECT id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at FROM ${condoSchema}.audit_logs WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (acao) {
      query += ` AND acao = $${paramCount}`;
      params.push(acao);
      paramCount++;
    }
    if (entidade_tipo) {
      query += ` AND entidade_tipo = $${paramCount}`;
      params.push(entidade_tipo);
      paramCount++;
    }
    if (usuario_id) {
      query += ` AND usuario_id = $${paramCount}`;
      params.push(usuario_id);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM ${condoSchema}.audit_logs WHERE 1=1`;
    const countParams = [];
    let countParamCount = 1;

    if (acao) {
      countQuery += ` AND acao = $${countParamCount}`;
      countParams.push(acao);
      countParamCount++;
    }
    if (entidade_tipo) {
      countQuery += ` AND entidade_tipo = $${countParamCount}`;
      countParams.push(entidade_tipo);
      countParamCount++;
    }
    if (usuario_id) {
      countQuery += ` AND usuario_id = $${countParamCount}`;
      countParams.push(usuario_id);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/audit-logs/:id - Get specific audit log
router.get('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema } = req;
    const { id } = req.params;
    const pool = getCondoPool();

    const result = await pool.query(
      `SELECT id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at FROM ${condoSchema}.audit_logs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Log de auditoria não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/audit-logs/user/:usuario_id - Get logs for specific user
router.get('/user/:usuario_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema } = req;
    const { usuario_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const pool = getCondoPool();

    const result = await pool.query(
      `SELECT id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at 
       FROM ${condoSchema}.audit_logs 
       WHERE usuario_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [usuario_id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/audit-logs/entity/:entidade_tipo/:entidade_id - Get logs for specific entity
router.get('/entity/:entidade_tipo/:entidade_id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema } = req;
    const { entidade_tipo, entidade_id } = req.params;
    const pool = getCondoPool();

    const result = await pool.query(
      `SELECT id, usuario_id, acao, entidade_tipo, entidade_id, detalhes, created_at 
       FROM ${condoSchema}.audit_logs 
       WHERE entidade_tipo = $1 AND entidade_id = $2 
       ORDER BY created_at DESC`,
      [entidade_tipo, entidade_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
