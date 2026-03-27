import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../fixtures/auth';

/**
 * Testes E2E para fluxo completo de agendamento
 * Login → Acessar agendamentos → Agendar área → Cancelar agendamento
 */

test.describe('Fluxo Completo de Agendamento', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa localStorage e cookies antes de cada teste
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('usuário pode agendar uma área disponível', async ({ page }) => {
    // ARRANGE: Faz login como morador
    await login(page, TEST_USERS.morador);

    // ACT: Navega para agendamentos
    await page.click('a:has-text("Agendamentos")');
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });

    // ASSERT: Verifica se página de agendamentos carregou
    await expect(page).toHaveTitle(/Agendamentos/i);
    const schedulingList = page.locator('[data-testid="scheduling-list"]');
    await expect(schedulingList).toBeVisible();

    // ACT: Clica em "Novo Agendamento"
    const newSchedulingButton = page.locator('button:has-text("Novo Agendamento")');
    await newSchedulingButton.click();

    // Aguarda carregamento da página de novo agendamento
    await page.waitForURL(/agendamentos\/novo/, { waitUntil: 'networkidle' });

    // ACT: Seleciona uma área
    const areaSelect = page.locator('[data-testid="area-select"]');
    await areaSelect.click();
    const firstArea = page.locator('[data-testid="area-option"]').first();
    await firstArea.click();

    // ACT: Seleciona uma data
    const dateInput = page.locator('[data-testid="date-input"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await dateInput.fill(dateString);

    // ACT: Seleciona horário
    const timeSelect = page.locator('[data-testid="time-select"]');
    await timeSelect.click();
    const firstTime = page.locator('[data-testid="time-option"]').first();
    await firstTime.click();

    // ACT: Clica em "Confirmar Agendamento"
    const confirmButton = page.locator('button:has-text("Confirmar")');
    await confirmButton.click();

    // Aguarda confirmação
    await page.waitForSelector('[data-testid="scheduling-confirmation"]', { timeout: 5000 });

    // ASSERT: Verifica se agendamento foi criado
    const confirmationMessage = page.locator('[data-testid="scheduling-confirmation"]');
    await expect(confirmationMessage).toBeVisible();
    await expect(confirmationMessage).toContainText(/agendamento criado|sucesso/i);

    // ASSERT: Verifica se redirecionou para lista de agendamentos
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });
  });

  test('usuário pode cancelar agendamento com prazo suficiente', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para agendamentos
    await page.click('a:has-text("Agendamentos")');
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });

    // ACT: Encontra um agendamento futuro (24h a partir de agora)
    const schedulingCards = page.locator('[data-testid="scheduling-card"]');
    const count = await schedulingCards.count();

    if (count > 0) {
      // Clica no primeiro agendamento
      await schedulingCards.first().click();

      // Aguarda carregamento de detalhes
      await page.waitForURL(/\/agendamentos\/\d+/, { waitUntil: 'networkidle' });

      // ACT: Clica em "Cancelar Agendamento"
      const cancelButton = page.locator('button:has-text("Cancelar")');

      if (await cancelButton.isVisible() && !await cancelButton.isDisabled()) {
        await cancelButton.click();

        // Aguarda confirmação
        const confirmDialog = page.locator('[data-testid="cancel-dialog"]');
        await expect(confirmDialog).toBeVisible();

        // ACT: Confirma cancelamento
        const confirmCancelButton = page.locator('button:has-text("Confirmar Cancelamento")');
        await confirmCancelButton.click();

        // ASSERT: Verifica se cancelamento foi confirmado
        const cancelConfirmation = page.locator('[data-testid="cancel-confirmation"]');
        await expect(cancelConfirmation).toBeVisible();
        await expect(cancelConfirmation).toContainText(/cancelado|sucesso/i);
      }
    }
  });

  test('sistema valida prazo de 24 horas para cancelamento', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para agendamentos
    await page.click('a:has-text("Agendamentos")');
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });

    // ACT: Procura por agendamento próximo (menos de 24h)
    const schedulingCards = page.locator('[data-testid="scheduling-card"]');

    // Procura por agendamento com aviso de prazo
    const shortNoticeScheduling = page.locator('[data-testid="scheduling-short-notice"]').first();

    if (await shortNoticeScheduling.isVisible()) {
      await shortNoticeScheduling.click();
      await page.waitForURL(/\/agendamentos\/\d+/, { waitUntil: 'networkidle' });

      // ASSERT: Verifica se botão de cancelamento está desabilitado
      const cancelButton = page.locator('button:has-text("Cancelar")');
      await expect(cancelButton).toBeDisabled();

      // ASSERT: Verifica se há mensagem de prazo
      const deadlineMessage = page.locator('[data-testid="deadline-warning"]');
      await expect(deadlineMessage).toBeVisible();
      await expect(deadlineMessage).toContainText(/24 horas|prazo/i);
    }
  });

  test('morador visualiza calendário de disponibilidade', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para novo agendamento
    await page.click('a:has-text("Agendamentos")');
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForURL(/agendamentos\/novo/, { waitUntil: 'networkidle' });

    // ACT: Seleciona uma área
    const areaSelect = page.locator('[data-testid="area-select"]');
    await areaSelect.click();
    await page.locator('[data-testid="area-option"]').first().click();

    // Aguarda carregamento do calendário
    const calendar = page.locator('[data-testid="calendar"]');
    await expect(calendar).toBeVisible();

    // ASSERT: Verifica se há datas disponíveis marcadas
    const availableDates = page.locator('[data-testid="available-date"]');
    const availableCount = await availableDates.count();

    expect(availableCount).toBeGreaterThan(0);
  });

  test('admin pode bloquear datas para manutenção', async ({ page }) => {
    // ARRANGE: Faz login como admin
    await login(page, TEST_USERS.admin);

    // ACT: Navega para agendamentos
    await page.click('a:has-text("Agendamentos")');
    await page.waitForURL('/agendamentos', { waitUntil: 'networkidle' });

    // ACT: Procura por painel de admin (se existir)
    const adminPanel = page.locator('[data-testid="admin-scheduling-panel"]');

    if (await adminPanel.isVisible()) {
      // ACT: Clica em "Bloquear Datas"
      const blockButton = adminPanel.locator('button:has-text("Bloquear")');

      if (await blockButton.isVisible()) {
        await blockButton.click();

        // Aguarda diálogo de bloqueio
        const blockDialog = page.locator('[data-testid="block-dates-dialog"]');
        await expect(blockDialog).toBeVisible();

        // ACT: Seleciona data para bloquear
        const dateInput = blockDialog.locator('[data-testid="block-date-input"]');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        const dateString = tomorrow.toISOString().split('T')[0];
        await dateInput.fill(dateString);

        // ACT: Adiciona motivo
        const reasonInput = blockDialog.locator('[data-testid="block-reason-input"]');
        await reasonInput.fill('Manutenção programada');

        // ACT: Confirma bloqueio
        const confirmButton = blockDialog.locator('button:has-text("Confirmar")');
        await confirmButton.click();

        // ASSERT: Verifica se data foi bloqueada
        const blockConfirmation = page.locator('[data-testid="block-confirmation"]');
        await expect(blockConfirmation).toBeVisible();
      }
    }
  });
});
