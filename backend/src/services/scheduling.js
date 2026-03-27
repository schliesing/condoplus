const { getCondoPool } = require('../config/database');

/**
 * Listar áreas de agendamento
 */
async function listAreas(condoSchema) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      'SELECT id, nome, descricao, capacidade FROM areas_agendamento ORDER BY nome'
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter agendamentos de uma área (com bloqueios)
 */
async function getAreaSchedule(condoSchema, areaId, dataInicio, dataFim) {
  const pool = getCondoPool(condoSchema);

  try {
    // Agendamentos confirmados
    const agendamentosResult = await pool.query(
      `SELECT * FROM agendamentos
       WHERE area_id = $1 AND status = 'confirmado'
       AND data_inicio >= $2 AND data_fim <= $3
       ORDER BY data_inicio`,
      [areaId, dataInicio, dataFim]
    );

    // Bloqueios
    const bloqueiosResult = await pool.query(
      `SELECT * FROM bloqueios_area
       WHERE area_id = $1
       AND data_inicio >= $2 AND data_fim <= $3
       ORDER BY data_inicio`,
      [areaId, dataInicio, dataFim]
    );

    await pool.end();

    return {
      agendamentos: agendamentosResult.rows,
      bloqueios: bloqueiosResult.rows,
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Verificar disponibilidade de horário
 */
async function checkAvailability(condoSchema, areaId, dataInicio, dataFim) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar agendamentos conflitantes
    const agendamentosResult = await pool.query(
      `SELECT COUNT(*) as count FROM agendamentos
       WHERE area_id = $1 AND status = 'confirmado'
       AND (
         (data_inicio < $2 AND data_fim > $1) OR
         (data_inicio < $3 AND data_fim > $2)
       )`,
      [areaId, dataFim, dataInicio]
    );

    if (parseInt(agendamentosResult.rows[0].count) > 0) {
      await pool.end();
      return { available: false, reason: 'Horário já reservado' };
    }

    // Verificar bloqueios
    const bloqueiosResult = await pool.query(
      `SELECT COUNT(*) as count FROM bloqueios_area
       WHERE area_id = $1
       AND (
         (data_inicio < $2 AND data_fim > $1) OR
         (data_inicio < $3 AND data_fim > $2)
       )`,
      [areaId, dataFim, dataInicio]
    );

    if (parseInt(bloqueiosResult.rows[0].count) > 0) {
      await pool.end();
      return { available: false, reason: 'Horário bloqueado pelo administrador' };
    }

    await pool.end();
    return { available: true };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Criar agendamento (reserva)
 */
async function createAgendamento(condoSchema, areaId, moradorId, dataInicio, dataFim) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar disponibilidade
    const availability = await checkAvailability(condoSchema, areaId, dataInicio, dataFim);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Criar agendamento
    const result = await pool.query(
      `INSERT INTO agendamentos (area_id, morador_id, data_inicio, data_fim)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [areaId, moradorId, dataInicio, dataFim]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter agendamentos do morador
 */
async function getUserAgendamentos(condoSchema, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT ag.*, aa.nome as area_nome
       FROM agendamentos ag
       JOIN areas_agendamento aa ON ag.area_id = aa.id
       WHERE ag.morador_id = $1 AND ag.status = 'confirmado'
       ORDER BY ag.data_inicio DESC`,
      [moradorId]
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Cancelar agendamento (até 24h antes)
 */
async function cancelAgendamento(condoSchema, agendamentoId, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Obter agendamento
    const agResult = await pool.query(
      'SELECT * FROM agendamentos WHERE id = $1 AND morador_id = $2',
      [agendamentoId, moradorId]
    );

    if (agResult.rows.length === 0) {
      throw new Error('Agendamento não encontrado');
    }

    const agendamento = agResult.rows[0];

    // Verificar se pode cancelar (até 24h antes)
    const horasAte = (new Date(agendamento.data_inicio) - new Date()) / (1000 * 60 * 60);
    const prazoMinimo = parseInt(process.env.PRAZO_CANCELAMENTO_AGENDAMENTO || '24');

    if (horasAte < prazoMinimo) {
      throw new Error(`Não é possível cancelar com menos de ${prazoMinimo}h de antecedência`);
    }

    // Cancelar agendamento
    const result = await pool.query(
      `UPDATE agendamentos
       SET status = 'cancelado', cancelado_em = NOW()
       WHERE id = $1
       RETURNING *`,
      [agendamentoId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Bloquear horário de uma área (admin apenas)
 */
async function blockAreaTime(condoSchema, areaId, dataInicio, dataFim, motivo, adminId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `INSERT INTO bloqueios_area (area_id, data_inicio, data_fim, motivo, bloqueado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [areaId, dataInicio, dataFim, motivo, adminId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  listAreas,
  getAreaSchedule,
  checkAvailability,
  createAgendamento,
  getUserAgendamentos,
  cancelAgendamento,
  blockAreaTime,
};
