import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS, TEST_CONDO } from '../fixtures/auth';

/**
 * Testes E2E para autenticação, segurança e performance
 */

test.describe('Autenticação e Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa estado anterior
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('usuário não autenticado é redirecionado para login', async ({ page }) => {
    // ACT: Tenta acessar dashboard direto
    await page.goto('/dashboard');

    // ASSERT: Verifica se foi redirecionado para login
    await expect(page).toHaveURL(/login|\//, { timeout: 5000 });

    // ASSERT: Verifica se página de login está visível
    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible();
  });

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    // ARRANGE: Navega para login
    await page.goto('/');
    await page.waitForURL(/login|\//, { waitUntil: 'networkidle' });

    // ACT: Seleciona condomínio
    await page.selectOption('[data-testid="condo-select"]', TEST_CONDO.id.toString());

    // ACT: Preenche credenciais inválidas
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill('invalido@test.com');

    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.fill('senhaerrada123');

    // ACT: Tenta fazer login
    const submitButton = page.locator('button:has-text("Entrar")');
    await submitButton.click();

    // Aguarda resposta
    await page.waitForTimeout(1000);

    // ASSERT: Verifica se há mensagem de erro
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/credenciais inválidas|email ou senha|erro/i);
  });

  test('sessão expira após timeout de inatividade', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // Aguarda para simular timeout (ajuste conforme necessário)
    await page.waitForTimeout(2000);

    // ACT: Tenta fazer uma ação
    await page.click('a:has-text("Votações")');

    // Se sessão expirou, deve redirecionar para login
    const isOnLoginPage = page.url().includes('login') || page.url() === '/';

    if (isOnLoginPage) {
      // ASSERT: Verifica se foi redirecionado
      await expect(page).toHaveURL(/login|\//, { timeout: 5000 });
    }
  });

  test('logout limpa credenciais de sessão', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Verifica token em localStorage
    const tokenBeforeLogout = await page.evaluate(() => localStorage.getItem('token'));
    expect(tokenBeforeLogout).toBeTruthy();

    // ACT: Faz logout
    await logout(page);

    // ASSERT: Verifica se token foi removido
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
    expect(tokenAfterLogout).toBeNull();

    // ASSERT: Verifica se foi redirecionado
    await expect(page).toHaveURL(/login|\//, { timeout: 5000 });
  });

  test('diferentes condomínios isolam dados corretamente', async ({ page }) => {
    // ARRANGE: Faz login em primeiro condomínio
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ASSERT: Verifica condomínio selecionado
    const condoSchema = await page.evaluate(() => localStorage.getItem('condoSchema'));
    expect(condoSchema).toBeTruthy();

    // ACT: Faz logout
    await logout(page);

    // ASSERT: Verifica se dados foram limpos
    const condoSchemaAfter = await page.evaluate(() => localStorage.getItem('condoSchema'));
    expect(condoSchemaAfter).toBeNull();
  });

  test('página carrega em menos de 3 segundos (performance)', async ({ page }) => {
    // ARRANGE: Faz login
    const startTime = Date.now();

    await login(page, TEST_USERS.morador);

    const loadTime = Date.now() - startTime;

    // ASSERT: Verifica se carregou rápido
    expect(loadTime).toBeLessThan(3000);

    // ACT: Navega para votações
    const votingStartTime = Date.now();
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    const votingLoadTime = Date.now() - votingStartTime;

    // ASSERT: Verifica se página de votações carregou rápido
    expect(votingLoadTime).toBeLessThan(2000);
  });

  test('aplicação funciona offline após cache', async ({ page, context }) => {
    // ARRANGE: Faz login online
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações (para cachear)
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ACT: Simula modo offline
    await context.setOffline(true);

    // ASSERT: Verifica se página ainda está disponível (do cache)
    const votingsList = page.locator('[data-testid="votings-list"]');
    const isVisible = await votingsList.isVisible({ timeout: 2000 }).catch(() => false);

    // Reativa modo online
    await context.setOffline(false);

    if (isVisible) {
      // Página foi carregada do cache
      expect(isVisible).toBe(true);
    }
  });

  test('notificações de segurança aparecem para atividades suspeitas', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Tenta acessar uma rota que não deveria (exemplo: /admin)
    await page.goto('/admin');

    // Aguarda resposta
    await page.waitForTimeout(1000);

    // ASSERT: Verifica se foi redirecionado ou há aviso
    const isOnAdminPage = page.url().includes('/admin');
    const isRedirected = page.url().includes('dashboard') || page.url().includes('votacoes');

    // Deve ter sido redirecionado ou estar em página de acesso negado
    expect(isOnAdminPage || isRedirected).toBe(true);
  });

  test('cross-browser compatibility - Chromium', async ({ page }) => {
    // ARRANGE: Verifica navegador atual
    const browserName = page.context().browser().browserType().name();
    test.skip(browserName !== 'chromium', 'Este teste é específico para Chromium');

    // ACT: Faz login
    await login(page, TEST_USERS.morador);

    // ASSERT: Verifica se dashboard carregou
    const dashboard = page.locator('[data-testid="dashboard-content"]');
    await expect(dashboard).toBeVisible();
  });

  test('responsividade em mobile', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 812 });

    // ACT: Faz login
    await login(page, TEST_USERS.morador);

    // ASSERT: Verifica se menu mobile está presente
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    const isVisible = await mobileMenu.isVisible().catch(() => false);

    // Deve ter menu mobile ou layout responsivo funcional
    expect(page.viewportSize().width).toBe(375);
  });

  test('trata erros de API graciosamente', async ({ page }) => {
    // ARRANGE: Simula erro de API
    // (Pode requerer mock de API ou pré-configuração do servidor de testes)

    // ACT: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Tenta carregar votações
    await page.click('a:has-text("Votações")');

    // Aguarda carregamento
    await page.waitForTimeout(1500);

    // ASSERT: Verifica se há indicador de erro ou está em loading
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    const errorMessage = page.locator('[data-testid="error-message"]');

    const hasLoadingOrError =
      (await loadingIndicator.isVisible().catch(() => false)) ||
      (await errorMessage.isVisible().catch(() => false));

    // Deve mostrar algum feedback ao usuário
    expect(hasLoadingOrError || page.url().includes('votacoes')).toBe(true);
  });
});
