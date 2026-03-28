const { getCondoPool, queryAdmin } = require('../config/database');

/**
 * Obter usuário por ID
 */
async function getUser(condoSchema, userId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, email, nome, role, condominio_id, status, criado_em, atualizado_em
       FROM usuarios
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter usuário por email
 */
async function getUserByEmail(condoSchema, email) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, email, nome, role, condominio_id, status, criado_em
       FROM usuarios
       WHERE email = $1`,
      [email]
    );

    await pool.end();
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Listar usuários do condomínio
 */
async function listUsers(condoSchema, filters = {}) {
  const pool = getCondoPool(condoSchema);

  try {
    let query = `SELECT id, email, nome, role, status, criado_em, atualizado_em
                 FROM usuarios
                 WHERE 1=1`;
    const params = [];

    if (filters.role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(filters.role);
    }

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY criado_em DESC`;

    const result = await pool.query(query, params);

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Atualizar role do usuário (admin apenas)
 */
async function updateUserRole(condoSchema, userId, newRole) {
  const pool = getCondoPool(condoSchema);

  try {
    // Validar role
    const validRoles = ['morador', 'admin'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Role inválida');
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET role = $1, atualizado_em = NOW()
       WHERE id = $2
       RETURNING *`,
      [newRole, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Ativar/Desativar usuário
 */
async function updateUserStatus(condoSchema, userId, status) {
  const pool = getCondoPool(condoSchema);

  try {
    const validStatuses = ['ativo', 'inativo'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status inválido');
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET status = $1, atualizado_em = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Atualizar perfil do usuário
 */
async function updateUserProfile(condoSchema, userId, profileData) {
  const pool = getCondoPool(condoSchema);

  try {
    // Validar dados
    if (!profileData.nome) {
      throw new Error('Nome é obrigatório');
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET nome = $1, atualizado_em = NOW()
       WHERE id = $2
       RETURNING *`,
      [profileData.nome, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Remover usuário (admin apenas)
 */
async function removeUser(condoSchema, userId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Não permitir remover último admin
    const adminsResult = await pool.query(
      'SELECT COUNT(*) as count FROM usuarios WHERE role = $1 AND status = $2',
      ['admin', 'ativo']
    );

    if (parseInt(adminsResult.rows[0].count) <= 1) {
      const userResult = await pool.query(
        'SELECT role FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userResult.rows[0]?.role === 'admin') {
        throw new Error('Não é possível remover o último administrador do condomínio');
      }
    }

    // Remover usuário
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1',
      [userId]
    );

    await pool.end();
    return { success: true };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  getUser,
  getUserByEmail,
  listUsers,
  updateUserRole,
  updateUserStatus,
  updateUserProfile,
  removeUser,
};
