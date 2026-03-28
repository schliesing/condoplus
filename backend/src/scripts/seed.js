require('dotenv').config();
const { getCondoPool } = require('../config/database');
const authService = require('../services/auth');

async function seedDatabase() {
  const condoSchema = 'condo_001';
  const pool = getCondoPool(condoSchema);

  try {
    console.log('🌱 Iniciando seed de dados...');

    // 1. Criar admin
    console.log('👤 Criando usuário admin...');
    const senhaAdmin = await authService.hashPassword('admin123');
    await pool.query(
      `INSERT INTO users (nome, email, senha_hash, apartamento, role)
       VALUES ('Admin Condomínio', 'admin@condo.local', $1, 'Admin', 'admin')
       ON CONFLICT DO NOTHING`,
      [senhaAdmin]
    );

    // 2. Criar moradores de teste
    console.log('👥 Criando moradores de teste...');
    for (let i = 1; i <= 5; i++) {
      const senha = await authService.hashPassword(`morador${i}123`);
      await pool.query(
        `INSERT INTO users (nome, email, senha_hash, apartamento, role)
         VALUES ($1, $2, $3, $4, 'morador')
         ON CONFLICT DO NOTHING`,
        [`Morador ${i}`, `morador${i}@email.com`, senha, `Apto ${101 + i}`]
      );
    }

    // 3. Criar áreas de agendamento
    console.log('🏊 Criando áreas de agendamento...');
    const areas = [
      { nome: 'Piscina', descricao: 'Piscina de lazer', capacidade: 20 },
      { nome: 'Salão de Festas', descricao: 'Salão para eventos', capacidade: 100 },
      { nome: 'Quadra Poliesportiva', descricao: 'Quadra de esportes', capacidade: 15 },
    ];

    for (const area of areas) {
      await pool.query(
        `INSERT INTO areas_agendamento (nome, descricao, capacidade)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [area.nome, area.descricao, area.capacidade]
      );
    }

    console.log('✅ Seed concluído com sucesso!');
    console.log('\n📋 Dados de teste:');
    console.log('   Admin: admin@condo.local / admin123');
    console.log('   Morador 1: morador1@email.com / morador1123');
    console.log('   Morador 2: morador2@email.com / morador2123');
    console.log('   ... e mais 3 moradores');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
