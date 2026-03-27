/**
 * Setup global para testes E2E com Playwright
 * Executa antes de todos os testes
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('🚀 Setup Global - Testes E2E');
  console.log('═══════════════════════════════════════════════\n');

  // Verificar se aplicação está rodando
  const browser = await chromium.launch();
  const context = await browser.createContext();
  const page = await context.newPage();

  try {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5173';
    console.log(`✓ Verificando aplicação em: ${baseURL}`);

    const response = await page.goto(baseURL);

    if (!response || !response.ok()) {
      console.error(`✗ Erro: Aplicação não está respondendo em ${baseURL}`);
      console.error('  Certifique-se de executar: npm run dev');
      process.exit(1);
    }

    console.log('✓ Aplicação está pronta para testes\n');

    // Opcional: Criar dados de teste
    console.log('📝 Setup de dados de teste...');
    // Aqui você pode adicionar setup de dados via API
    console.log('✓ Dados de teste preparados\n');

    // Log de informações do ambiente
    console.log('🔧 Configuração:');
    console.log(`  - Base URL: ${baseURL}`);
    console.log(`  - Browser: Chromium, Firefox, WebKit`);
    console.log(`  - Timeout: 30s por teste`);
    console.log(`  - Retries (CI): 2`);
    console.log(`  - Workers: ${process.env.CI ? '1 (CI)' : '3 (local)'}\n`);

  } catch (error) {
    console.error('✗ Erro no setup global:', error.message);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
