const { getCondoPool } = require('../config/database');

/**
 * Obter logs de auditoria com paginação
 */
async function getAuditLogs(condoSchema, options = {}) {
  const pool = getCondoPool(condoSchema);

  try {
    const {
      limit = 50,
      offset = 0,
      userId = null,
      acao = null,
      tabela = null,
      dataInicio = null,
      dataFim = null,
    } = options;

    let query = `SELECT id, usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, user_agent, criado_em
                 FROM audit_logs
                 WHERE 1=1`;
    const params = [];

    if (userId) {
      query += ` AND usuario_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (acao) {
      query += ` AND acao = $${params.length + 1}`;
      params.push(acao);
    }

    if (tabela) {
      query += ` AND tabela = $${params.length + 1}`;
      params.push(tabela);
    }

    if (dataInicio) {
      query += ` AND criado_em >= $${params.length + 1}`;
      params.push(dataInicio);
    }

    if (dataFim) {
      query += ` AND criado_em <= $${params.length + 1}`;
      params.push(dataFim);
    }

    // Contar total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${query.split('WHERE')[1]}`
    );
    const total = parseInt(countResult.rows[0].total);

    // Buscar registros
    query += ` ORDER BY criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    await pool.end();

    return {
      logs: result.rows,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Buscar logs por registro específico
 */
async function getAuditLogsByRecord(condoSchema, tabela, registroId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, usuario_id, acao, tabela, dados_anteriores, dados_novos, criado_em
       FROM audit_logs
       WHERE tabela = $1 AND registro_id = $2
       ORDER BY criado_em DESC`,
      [tabela, registroId]
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter estatísticas de auditoria (últimos 30 dias)
 */
async function getAuditStats(condoSchema) {
  const pool = getCondoPool(condoSchema);

  try {
    // Total de ações nos últimos 30 dias
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs
       WHERE criado_em >= NOW() - INTERVAL 30 DAY`
    );

    // Por tipo de ação
    const byAcaoResult = await pool.query(
      `SELECT acao, COUNT(*) as count FROM audit_logs
       WHERE criado_em >= NOW() - INTERVAL 30 DAY
       GROUP BY acao
       ORDER BY count DESC`
    );

    // Por usuário
    const byUserResult = await pool.query(
      `SELECT usuario_id, COUNT(*) as count FROM audit_logs
       WHERE criado_em >= NOW() - INTERVAL 30 DAY
       GROUP BY usuario_id
       ORDER BY count DESC
       LIMIT 10`
    );

    // Por tabela
    const byTableResult = await pool.query(
      `SELECT tabela, COUNT(*) as count FROM audit_logs
       WHERE criado_em >= NOW() - INTERVAL 30 DAY
       GROUP BY tabela
       ORDER BY count DESC`
    );

    await pool.end();

    return {
      total: parseInt(totalResult.rows[0].total),
      porAcao: byAcaoResult.rows,
      porUsuario: byUserResult.rows,
      porTabela: byTableResult.rows,
      periodo: '30 dias',
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Exportar logs para CSV (últimos N dias)
 */
async function exportAuditLogs(condoSchema, diasRetrocesso = 30) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, criado_em
       FROM audit_logs
       WHERE criado_em >= NOW() - INTERVAL '${diasRetrocesso} days'
       ORDER BY criado_em DESC`
    );

    await pool.end();

    // Converter para CSV
    const headers = ['Usuario ID', 'Ação', 'Tabela', 'Registro ID', 'Dados Anteriores', 'Dados Novos', 'IP', 'Data'];
    const rows = result.rows.map((log) => [
      log.usuario_id,
      log.acao,
      log.tabela,
      log.registro_id,
      JSON.stringify(log.dados_anteriores || {}),
      JSON.stringify(log.dados_novos || {}),
      log.ip_address,
      log.criado_em,
    ]);

    return {
      headers,
      rows,
      total: rows.length,
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogsByRecord,
  getAuditStats,
  exportAuditLogs,
};
