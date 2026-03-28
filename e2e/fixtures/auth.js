/**
 * Fixtures de autenticação para testes E2E
 * Fornece credenciais e métodos de login/logout
 */

export const TEST_USERS = {
  morador: {
    email: 'morador@test.com',
    password: 'Test123!',
    role: 'morador',
    condominios_id: 1,
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'admin',
    condominios_id: 1,
  },
};

export const TEST_CONDO = {
  id: 1,
  name: 'Condomínio Teste',
  schema: 'condo_001',
};

/**
 * Realiza login na aplicação
 * @param {Page} page - Página do Playwright
 * @param {Object} user - Usuário a fazer login
 */
export async function login(page, user) {
  await page.goto('/');

  // Aguarda a página de login carregar
  await page.waitForURL(/login|\//, { waitUntil: 'networkidle' });

  // Seleciona condomínio
  await page.selectOption('[data-testid="condo-select"]', TEST_CONDO.id.toString());

  // Preenche email
  const emailInput = page.locator('[data-testid="email-input"]');
  await emailInput.fill(user.email);

  // Preenche senha
  const passwordInput = page.locator('[data-testid="password-input"]');
  await passwordInput.fill(user.password);

  // Clica em Entrar
  const submitButton = page.locator('button:has-text("Entrar")');
  await submitButton.click();

  // Aguarda redirecionamento para dashboard
  await page.waitForURL('/dashboard', { waitUntil: 'networkidle' });
}

/**
 * Realiza logout
 * @param {Page} page - Página do Playwright
 */
export async function logout(page) {
  // Clica no botão de logout
  const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout")');
  await logoutButton.click();

  // Aguarda redirecionamento para login
  await page.waitForURL(/login|\//, { waitUntil: 'networkidle' });
}

/**
 * Verifica se está autenticado
 * @param {Page} page - Página do Playwright
 */
export async function isAuthenticated(page) {
  const response = await page.request.get('/api/auth/me');
  return response.ok();
}

/**
 * Aguarda elemento e verifica se existe
 * @param {Page} page - Página do Playwright
 * @param {string} selector - Seletor do elemento
 */
export async function waitForElement(page, selector) {
  await page.waitForSelector(selector, { timeout: 5000 });
}
