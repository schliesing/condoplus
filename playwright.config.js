import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration para testes E2E do CondoPlus
 * Testa fluxos completos: autenticação, votações, agendamentos, fornecedores
 */

export default defineConfig({
  // Timeout para operações individuais (30 segundos)
  timeout: 30 * 1000,

  // Timeout para teste completo (5 minutos)
  expect: {
    timeout: 5 * 1000,
  },

  // Setup global que executa antes de todos os testes
  globalSetup: require.resolve('./e2e/global-setup.js'),

  // Configuração de relatórios
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Configuração global de testes
  use: {
    // URL base da aplicação
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',

    // Gravação de vídeo para testes falhados
    video: 'retain-on-failure',

    // Screenshots em caso de falha
    screenshot: 'only-on-failure',

    // Rastreamento de trace para debug
    trace: 'on-first-retry',

    // Timeout de ação (cliques, tipos, etc)
    actionTimeout: 10 * 1000,
  },

  // Webserver - inicia o frontend automaticamente
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Configuração de projetos (navegadores)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Testes em mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Saída de testes
  outputFolder: 'test-results',
});
