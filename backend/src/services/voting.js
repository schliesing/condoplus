const { getCondoPool } = require('../config/database');

/**
 * Criar nova votação
 */
async function createVotacao(condoSchema, votacaoData, adminId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `INSERT INTO votacoes
       (titulo, descricao, status, data_inicio_sugestoes, data_fim_sugestoes,
        data_inicio_votacao, data_fim_votacao, quorum_minimo, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        votacaoData.titulo,
        votacaoData.descricao,
        'sugestoes', // Status inicial
        new Date(votacaoData.data_inicio_sugestoes),
        new Date(votacaoData.data_fim_sugestoes),
        new Date(votacaoData.data_inicio_votacao),
        new Date(votacaoData.data_fim_votacao),
        votacaoData.quorum_minimo || 50,
        adminId,
      ]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Listar votações do condomínio
 */
async function listVotacoes(condoSchema) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, titulo, descricao, status,
              data_inicio_sugestoes, data_fim_sugestoes,
              data_inicio_votacao, data_fim_votacao,
              quorum_minimo, criado_em
       FROM votacoes
       ORDER BY criado_em DESC`
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter detalhes de uma votação com resultado
 */
async function getVotacaoWithResult(condoSchema, votacaoId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Obter votação
    const votacaoResult = await pool.query(
      'SELECT * FROM votacoes WHERE id = $1',
      [votacaoId]
    );

    if (votacaoResult.rows.length === 0) {
      throw new Error('Votação não encontrada');
    }

    const votacao = votacaoResult.rows[0];

    // Contar votos
    const votosResult = await pool.query(
      `SELECT voto, COUNT(*) as count FROM votos
       WHERE votacao_id = $1 GROUP BY voto`,
      [votacaoId]
    );

    // Contar total de moradores
    const moradoresResult = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE role = $1 AND ativo = true',
      ['morador']
    );

    const totalMoradores = parseInt(moradoresResult.rows[0].total);
    const votos = {};
    let totalVotos = 0;

    votosResult.rows.forEach(row => {
      votos[row.voto] = parseInt(row.count);
      totalVotos += parseInt(row.count);
    });

    // Calcular percentuais
    const resultado = {
      sim: { count: votos['sim'] || 0, percentual: totalVotos > 0 ? ((votos['sim'] || 0) / totalVotos * 100).toFixed(2) : 0 },
      nao: { count: votos['nao'] || 0, percentual: totalVotos > 0 ? ((votos['nao'] || 0) / totalVotos * 100).toFixed(2) : 0 },
      abstencao: { count: votos['abstencao'] || 0, percentual: totalVotos > 0 ? ((votos['abstencao'] || 0) / totalVotos * 100).toFixed(2) : 0 },
    };

    await pool.end();

    return {
      votacao,
      resultado,
      totalVotos,
      totalMoradores,
      percentualParticipacao: totalMoradores > 0 ? (totalVotos / totalMoradores * 100).toFixed(2) : 0,
      quorumAtingido: totalVotos >= (totalMoradores * votacao.quorum_minimo / 100),
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Registrar voto
 */
async function registerVote(condoSchema, votacaoId, moradorId, voto) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar se já votou
    const existingVote = await pool.query(
      'SELECT id FROM votos WHERE votacao_id = $1 AND morador_id = $2',
      [votacaoId, moradorId]
    );

    if (existingVote.rows.length > 0) {
      throw new Error('Você já votou nesta votação');
    }

    // Registrar voto
    const result = await pool.query(
      `INSERT INTO votos (votacao_id, morador_id, voto)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [votacaoId, moradorId, voto]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Alterar voto (enquanto não assinou)
 */
async function updateVote(condoSchema, votacaoId, moradorId, novoVoto) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar se já assinou
    const assinatura = await pool.query(
      'SELECT id FROM assinaturas_digitais WHERE votacao_id = $1 AND morador_id = $2',
      [votacaoId, moradorId]
    );

    if (assinatura.rows.length > 0) {
      throw new Error('Não é possível alterar o voto após assinar');
    }

    // Atualizar voto
    const result = await pool.query(
      `UPDATE votos SET voto = $1 WHERE votacao_id = $2 AND morador_id = $3
       RETURNING *`,
      [novoVoto, votacaoId, moradorId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Cancelar voto
 */
async function cancelVote(condoSchema, votacaoId, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar se já assinou
    const assinatura = await pool.query(
      'SELECT id FROM assinaturas_digitais WHERE votacao_id = $1 AND morador_id = $2',
      [votacaoId, moradorId]
    );

    if (assinatura.rows.length > 0) {
      throw new Error('Não é possível cancelar o voto após assinar');
    }

    // Deletar voto
    await pool.query(
      'DELETE FROM votos WHERE votacao_id = $1 AND morador_id = $2',
      [votacaoId, moradorId]
    );

    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Iniciar votação (muda status de 'sugestoes' para 'votando')
 */
async function startVoting(condoSchema, votacaoId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `UPDATE votacoes SET status = 'votando' WHERE id = $1
       RETURNING *`,
      [votacaoId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Finalizar votação (muda status para 'encerrada')
 */
async function finishVoting(condoSchema, votacaoId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `UPDATE votacoes SET status = 'encerrada' WHERE id = $1
       RETURNING *`,
      [votacaoId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  createVotacao,
  listVotacoes,
  getVotacaoWithResult,
  registerVote,
  updateVote,
  cancelVote,
  startVoting,
  finishVoting,
};
