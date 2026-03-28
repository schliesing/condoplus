const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCondoPool } = require('../config/database');

/**
 * Fazer hash de senha
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Comparar senha com hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Gerar JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      condo_schema: user.condo_schema,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '24h' }
  );
}

/**
 * Login do usuário
 */
async function login(condoSchema, email, password) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      'SELECT id, email, senha_hash, role, apartamento FROM users WHERE email = $1 AND ativo = true',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuário ou senha inválidos');
    }

    const user = result.rows[0];
    const passwordMatch = await comparePassword(password, user.senha_hash);

    if (!passwordMatch) {
      throw new Error('Usuário ou senha inválidos');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      condo_schema: condoSchema,
    });

    // Armazenar sessão
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\')',
      [user.id, token]
    );

    await pool.end();

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        apartamento: user.apartamento,
      },
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Registrar novo usuário (admin apenas)
 */
async function createUser(condoSchema, userData) {
  const pool = getCondoPool(condoSchema);

  try {
    const senhaCriptografada = await hashPassword(userData.senha);

    const result = await pool.query(
      `INSERT INTO users (nome, email, senha_hash, apartamento, telefone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, role, apartamento`,
      [
        userData.nome,
        userData.email,
        senhaCriptografada,
        userData.apartamento,
        userData.telefone,
        userData.role || 'morador',
      ]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    if (error.code === '23505') {
      throw new Error('Email já existe');
    }
    throw error;
  }
}

/**
 * Logout do usuário (remover sessão)
 */
async function logout(condoSchema, token) {
  const pool = getCondoPool(condoSchema);

  try {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  login,
  createUser,
  logout,
};
