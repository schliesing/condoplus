const { getCondoPool, queryAdmin } = require('../config/database');

/**
 * Listar fornecedores do condomínio
 */
async function listSuppliers(condoSchema) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, nome, categoria, email, telefone, criado_em
       FROM fornecedor_condos
       ORDER BY nome`
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter fornecedor por ID
 */
async function getSupplier(condoSchema, supplierId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      'SELECT * FROM fornecedor_condos WHERE id = $1',
      [supplierId]
    );

    if (result.rows.length === 0) {
      throw new Error('Fornecedor não encontrado');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Sugerir novo fornecedor (morador)
 */
async function suggestSupplier(condoSchema, supplierData, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Validar formulário
    if (!supplierData.nome || !supplierData.categoria) {
      throw new Error('Nome e categoria são obrigatórios');
    }

    // Criar fornecedor
    const result = await pool.query(
      `INSERT INTO fornecedor_condos
       (nome, categoria, email, telefone, sugerido_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        supplierData.nome,
        supplierData.categoria,
        supplierData.email,
        supplierData.telefone,
        moradorId,
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
 * Adicionar nota fiscal de fornecedor (admin apenas)
 */
async function uploadInvoice(condoSchema, supplierId, invoiceData, adminId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `INSERT INTO notas_fiscais
       (fornecedor_id, numero_nf, data_emissao, arquivo_url, upload_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        supplierId,
        invoiceData.numero_nf,
        invoiceData.data_emissao,
        invoiceData.arquivo_url, // URL do arquivo em S3/GCS
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
 * Obter notas fiscais de um fornecedor
 */
async function getSupplierInvoices(condoSchema, supplierId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT id, numero_nf, data_emissao, arquivo_url, criado_em
       FROM notas_fiscais
       WHERE fornecedor_id = $1
       ORDER BY data_emissao DESC`,
      [supplierId]
    );

    await pool.end();
    return result.rows;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Remover fornecedor (admin apenas)
 */
async function removeSupplier(condoSchema, supplierId) {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar se há notas fiscais associadas
    const invoicesResult = await pool.query(
      'SELECT COUNT(*) as count FROM notas_fiscais WHERE fornecedor_id = $1',
      [supplierId]
    );

    if (parseInt(invoicesResult.rows[0].count) > 0) {
      throw new Error('Não é possível remover fornecedor com notas fiscais associadas');
    }

    // Remover fornecedor
    await pool.query(
      'DELETE FROM fornecedor_condos WHERE id = $1',
      [supplierId]
    );

    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  listSuppliers,
  getSupplier,
  suggestSupplier,
  uploadInvoice,
  getSupplierInvoices,
  removeSupplier,
};
