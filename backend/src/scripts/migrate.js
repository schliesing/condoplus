require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { adminPool } = require('../config/database');

const schemaSQL = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf8');

async function runMigrations() {
  const client = await adminPool.connect();

  try {
    console.log('🔄 Iniciando migrações...');

    // 1. Criar schema público e tabelas globais
    console.log('📊 Criando schema público...');
    const publicSchemaSQL = schemaSQL.split('-- ============================================================================')[0];
    await client.query(publicSchemaSQL);

    console.log('✅ Schema público criado com sucesso');

    // 2. Criar schema de exemplo (condo_001)
    console.log('📊 Criando schema condo_001...');
    await client.query('CREATE SCHEMA IF NOT EXISTS condo_001');

    // Executar SQL do schema no contexto do condo_001
    const condoSchemaSQL = schemaSQL.split('-- ============================================================================')[1];
    const statements = condoSchemaSQL.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(`SET search_path TO condo_001; ${statement}`);
      }
    }

    console.log('✅ Schema condo_001 criado com sucesso');

    // 3. Registrar condomínio na tabela de condominios
    console.log('📝 Registrando condomínio...');
    await client.query(
      `INSERT INTO condominios (schema_name, nome, endereco)
       VALUES ('condo_001', 'Condomínio Exemplo', 'Rua Exemplo, 123')
       ON CONFLICT DO NOTHING`
    );

    console.log('✅ Condomínio registrado');

    console.log('🎉 Migrações concluídas com sucesso!');
  } catch (error) {
    console.error('❌ Erro nas migrações:', error);
    process.exit(1);
  } finally {
    client.release();
    await adminPool.end();
  }
}

runMigrations();
