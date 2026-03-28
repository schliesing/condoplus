const { getCondoPool } = require('../config/database');
const crypto = require('crypto');

/**
 * Gerar PDF com resultado da votação (placeholder)
 * TODO: Integrar com serviço de assinatura digital (DocuSign, Twilio SignalWire, etc)
 */
async function generateVotingPDF(votacaoData, resultadoData) {
  // Placeholder - será implementado quando decidir qual serviço usar
  // Por enquanto, retorna um objeto simulado
  const pdfContent = `
    ATA DE VOTAÇÃO
    Condomínio: ${votacaoData.titulo}
    Data: ${new Date().toLocaleDateString('pt-BR')}

    RESULTADO DA VOTAÇÃO:
    Sim: ${resultadoData.sim.count} votos (${resultadoData.sim.percentual}%)
    Não: ${resultadoData.nao.count} votos (${resultadoData.nao.percentual}%)
    Abstenção: ${resultadoData.abstencao.count} votos (${resultadoData.abstencao.percentual}%)

    Total de Votos: ${resultadoData.totalVotos}
    Total de Moradores: ${resultadoData.totalMoradores}
    Participação: ${resultadoData.percentualParticipacao}%
    Quórum Atingido: ${resultadoData.quorumAtingido ? 'SIM' : 'NÃO'}
  `;

  // Gerar hash do conteúdo para auditoria
  const hash = crypto
    .createHash('sha256')
    .update(pdfContent)
    .digest('hex');

  return {
    content: pdfContent,
    hash,
    timestamp: new Date(),
  };
}

/**
 * Enviar para assinatura digital
 * TODO: Integrar com API de assinatura digital
 */
async function sendForSignature(condoSchema, votacaoId, moradorId, pdfUrl, pdfHash) {
  const pool = getCondoPool(condoSchema);

  try {
    // Registrar assinatura pendente
    const result = await pool.query(
      `INSERT INTO assinaturas_digitais
       (votacao_id, morador_id, pdf_url, pdf_hash, status_assinatura)
       VALUES ($1, $2, $3, $4, 'pendente')
       RETURNING *`,
      [votacaoId, moradorId, pdfUrl, pdfHash]
    );

    // TODO: Chamar API externa de assinatura digital
    // Ex: DocuSign, Twilio SignalWire, etc
    // const signatureResponse = await callSignatureAPI(pdfUrl);
    // if (signatureResponse.success) {
    //   await updateSignatureStatus(condoSchema, result.rows[0].id, 'assinado', signatureResponse.signedPdfUrl);
    // }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Atualizar status da assinatura
 */
async function updateSignatureStatus(condoSchema, signatureId, status, signedPdfUrl = null) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `UPDATE assinaturas_digitais
       SET status_assinatura = $1, assinado_em = NOW(), pdf_url = COALESCE($2, pdf_url)
       WHERE id = $3
       RETURNING *`,
      [status, signedPdfUrl, signatureId]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter assinatura digital
 */
async function getSignature(condoSchema, votacaoId, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT * FROM assinaturas_digitais
       WHERE votacao_id = $1 AND morador_id = $2`,
      [votacaoId, moradorId]
    );

    await pool.end();
    return result.rows[0] || null;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  generateVotingPDF,
  sendForSignature,
  updateSignatureStatus,
  getSignature,
};
