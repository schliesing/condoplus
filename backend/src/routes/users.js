const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { getCondoPool } = require('../config/database');
const auditService = require('../services/auditLogs');
const bcrypt = require('bcrypt');

const router = express.Router();

// GET /api/users/me - Current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        condoSchema: user.condoSchema,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { condoSchema } = req;
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT id, email, nome, role, status, created_at, updated_at FROM ${condoSchema}.users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id - Get user details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    if (user.id !== id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT id, email, nome, role, status, created_at, updated_at FROM ${condoSchema}.users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const { nome, status } = req.body;
    if (user.id !== id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }
    const pool = getCondoPool();
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    if (nome !== undefined) {
      updateFields.push(`nome = $${paramCount}`);
      values.push(nome);
      paramCount++;
    }
    if (status !== undefined && user.role === 'admin') {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    const query = `UPDATE ${condoSchema}.users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, nome, role, status, created_at, updated_at`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'ATUALIZAR_USUARIO',
      entidade_tipo: 'usuario',
      entidade_id: id,
      detalhes: { email: result.rows[0].email, campos_alterados: Object.keys(req.body) }
    });
    res.json({ success: true, data: result.rows[0], message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/:id/password - Change password
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (user.id !== id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Nova senha deve ter no mínimo 8 caracteres' });
    }
    const pool = getCondoPool();
    const userResult = await pool.query(`SELECT password_hash FROM ${condoSchema}.users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${condoSchema}.users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hashedPassword, id]);
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'ALTERAR_SENHA',
      entidade_tipo: 'usuario',
      entidade_id: id,
      detalhes: { mudanca_senha: true }
    });
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/:id - Deactivate user (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    if (user.id === id) {
      return res.status(400).json({ success: false, error: 'Não é possível deletar sua própria conta' });
    }
    const pool = getCondoPool();
    const userResult = await pool.query(`SELECT email, nome FROM ${condoSchema}.users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    await pool.query(`UPDATE ${condoSchema}.users SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [id]);
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'DESATIVAR_USUARIO',
      entidade_tipo: 'usuario',
      entidade_id: id,
      detalhes: { email: userResult.rows[0].email, nome: userResult.rows[0].nome }
    });
    res.json({ success: true, message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
