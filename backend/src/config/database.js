const { Pool } = require('pg');
require('dotenv').config();

const adminPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Conectar a um schema específico (condomínio)
 * @param {string} schemaName - Nome do schema (ex: 'condo_001')
 * @returns {Pool}
 */
function getCondoPool(schemaName) {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Definir schema na conexão
  pool.on('connect', (client) => {
    client.query(`SET search_path TO ${schemaName}`);
  });

  return pool;
}

/**
 * Executar query no schema admin (público)
 */
async function queryAdmin(sql, params = []) {
  try {
    const result = await adminPool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database error (admin):', error);
    throw error;
  }
}

/**
 * Executar query em um schema de condomínio
 */
async function queryCondoSchema(schemaName, sql, params = []) {
  const pool = getCondoPool(schemaName);
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error(`Database error (${schemaName}):`, error);
    throw error;
  } finally {
    await pool.end();
  }
}

module.exports = {
  adminPool,
  getCondoPool,
  queryAdmin,
  queryCondoSchema,
};
