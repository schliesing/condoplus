const { getCondoPool } = require('../config/database');

/**
 * Obter todas as configurações do condomínio
 */
async function getConfig(condoSchema) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT chave, valor, tipo, descricao, atualizado_em
       FROM configuracoes
       ORDER BY chave`
    );

    // Converter em objeto chave-valor
    const config = {};
    result.rows.forEach((row) => {
      let valor = row.valor;
      if (row.tipo === 'numero') {
        valor = parseInt(valor);
      } else if (row.tipo === 'booleano') {
        valor = valor === 'true' || valor === '1';
      } else if (row.tipo === 'json') {
        try {
          valor = JSON.parse(valor);
        } catch (e) {
          // Manter como string se não conseguir fazer parse
        }
      }
      config[row.chave] = {
        valor,
        tipo: row.tipo,
        descricao: row.descricao,
        atualizado_em: row.atualizado_em,
      };
    });

    await pool.end();
    return config;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Obter configuração específica
 */
async function getConfigValue(condoSchema, chave) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT valor, tipo FROM configuracoes WHERE chave = $1`,
      [chave]
    );

    if (result.rows.length === 0) {
      await pool.end();
      return null;
    }

    let valor = result.rows[0].valor;
    const tipo = result.rows[0].tipo;

    if (tipo === 'numero') {
      valor = parseInt(valor);
    } else if (tipo === 'booleano') {
      valor = valor === 'true' || valor === '1';
    } else if (tipo === 'json') {
      try {
        valor = JSON.parse(valor);
      } catch (e) {
        // Manter como string
      }
    }

    await pool.end();
    return valor;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Atualizar configuração
 */
async function updateConfig(condoSchema, chave, novoValor, descricao = null) {
  const pool = getCondoPool(condoSchema);

  try {
    // Obter configuração atual para validar tipo
    const currentResult = await pool.query(
      `SELECT tipo FROM configuracoes WHERE chave = $1`,
      [chave]
    );

    if (currentResult.rows.length === 0) {
      throw new Error(`Configuração "${chave}" não existe`);
    }

    const tipo = currentResult.rows[0].tipo;

    // Validar e converter valor conforme tipo
    let valorString = String(novoValor);

    if (tipo === 'numero') {
      const num = parseInt(novoValor);
      if (isNaN(num)) {
        throw new Error(`Valor inválido para configuração numérica: ${novoValor}`);
      }
      valorString = String(num);
    } else if (tipo === 'booleano') {
      if (typeof novoValor !== 'boolean') {
        throw new Error(`Valor deve ser booleano para: ${chave}`);
      }
      valorString = novoValor ? 'true' : 'false';
    } else if (tipo === 'json') {
      try {
        valorString = JSON.stringify(novoValor);
      } catch (e) {
        throw new Error(`JSON inválido para: ${chave}`);
      }
    }

    // Atualizar
    const updateParams = [valorString, chave];
    let updateQuery = `UPDATE configuracoes
                       SET valor = $1, atualizado_em = NOW()`;

    if (descricao !== null) {
      updateQuery += `, descricao = $${updateParams.length + 1}`;
      updateParams.push(descricao);
    }

    updateQuery += ` WHERE chave = $${updateParams.length}
                    RETURNING *`;
    updateParams.push(chave);

    const result = await pool.query(updateQuery, updateParams);

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Criar nova configuração (root apenas)
 */
async function createConfig(condoSchema, chave, valor, tipo, descricao) {
  const pool = getCondoPool(condoSchema);

  try {
    // Validar tipo
    const validTypes = ['texto', 'numero', 'booleano', 'json'];
    if (!validTypes.includes(tipo)) {
      throw new Error('Tipo de configuração inválido');
    }

    // Verificar se já existe
    const existsResult = await pool.query(
      `SELECT id FROM configuracoes WHERE chave = $1`,
      [chave]
    );

    if (existsResult.rows.length > 0) {
      throw new Error(`Configuração "${chave}" já existe`);
    }

    // Converter valor conforme tipo
    let valorString = String(valor);
    if (tipo === 'numero') {
      const num = parseInt(valor);
      if (isNaN(num)) throw new Error('Valor inválido para tipo numérico');
      valorString = String(num);
    } else if (tipo === 'booleano') {
      valorString = valor ? 'true' : 'false';
    } else if (tipo === 'json') {
      valorString = JSON.stringify(valor);
    }

    const result = await pool.query(
      `INSERT INTO configuracoes (chave, valor, tipo, descricao)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chave, valorString, tipo, descricao]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  getConfig,
  getConfigValue,
  updateConfig,
  createConfig,
};
