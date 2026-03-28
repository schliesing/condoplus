const jwt = require('jsonwebtoken');
const { queryCondoSchema, queryAdmin } = require('../config/database');

/**
 * Middleware: Verificar JWT token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não encontrado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware: Verificar role do usuário
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    next();
  };
}

/**
 * Middleware: Injetar condomínio no request
 */
async function injectCondoSchema(req, res, next) {
  const schemaName = req.headers['x-condo-schema'] || req.user?.condo_schema;

  if (!schemaName) {
    return res.status(400).json({ error: 'Condomínio não especificado' });
  }

  // Validar formato do schema (ex: condo_001)
  if (!/^condo_\d{3}$/.test(schemaName)) {
    return res.status(400).json({ error: 'Schema inválido' });
  }

  req.condoSchema = schemaName;
  next();
}

/**
 * Middleware: Registrar ação em audit log
 */
function logAuditAction(tabela, acao) {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (req.user && req.condoSchema && res.statusCode < 400) {
        try {
          const sql = `
            INSERT INTO audit_logs
            (user_id, acao, tabela, dados_novos, timestamp)
            VALUES ($1, $2, $3, $4, NOW())
          `;
          const valores = [
            req.user.id,
            acao,
            tabela,
            JSON.stringify(req.body),
          ];

          // Usar pool do condomínio
          const { getCondoPool } = require('../config/database');
          const pool = getCondoPool(req.condoSchema);
          await pool.query(sql, valores);
          await pool.end();
        } catch (error) {
          console.error('Erro ao registrar audit log:', error);
        }
      }
    });
    next();
  };
}

module.exports = {
  authenticateToken,
  authorize,
  injectCondoSchema,
  logAuditAction,
};
