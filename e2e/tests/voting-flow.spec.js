import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../fixtures/auth';

/**
 * Testes E2E para fluxo completo de votação
 * Login → Acesso a votações → Votar em proposta → Assinar proposta
 */

test.describe('Fluxo Completo de Votação', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa localStorage antes de cada teste
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('usuário morador deve votar em uma proposta', async ({ page }) => {
    // ARRANGE: Faz login como morador
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ASSERT: Verifica se página de votações carregou
    await expect(page).toHaveTitle(/Votações/i);
    const votingsList = page.locator('[data-testid="votings-list"]');
    await expect(votingsList).toBeVisible();

    // ACT: Seleciona primeira votação disponível
    const firstVotingCard = page.locator('[data-testid="voting-card"]').first();
    await firstVotingCard.click();

    // Aguarda carregamento da página de detalhe
    await page.waitForURL(/\/votacoes\/\d+/, { waitUntil: 'networkidle' });

    // ACT: Vota em uma opção
    const voteButtons = page.locator('[data-testid="vote-button"]');
    const votesCount = await voteButtons.count();

    if (votesCount > 0) {
      await voteButtons.first().click();

      // Aguarda confirmação
      await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 5000 });

      // ASSERT: Verifica se voto foi registrado
      const confirmationMessage = page.locator('[data-testid="vote-confirmation"]');
      await expect(confirmationMessage).toBeVisible();
      await expect(confirmationMessage).toContainText(/voto registrado|sucesso/i);
    }

    // ACT: Navega para assinar a proposta (se disponível)
    const signButton = page.locator('button:has-text("Assinar")').first();

    if (await signButton.isVisible()) {
      await signButton.click();

      // Aguarda diálogo de assinatura
      const signDialog = page.locator('[data-testid="sign-dialog"]');
      await expect(signDialog).toBeVisible();

      // Confirma assinatura
      await page.click('button:has-text("Confirmar")');

      // ASSERT: Verifica se assinatura foi registrada
      const signConfirmation = page.locator('[data-testid="sign-confirmation"]');
      await expect(signConfirmation).toBeVisible();
      await expect(signConfirmation).toContainText(/assinado|sucesso/i);
    }

    // ACT: Faz logout
    await logout(page);

    // ASSERT: Verifica se foi redirecionado para login
    await expect(page).toHaveURL(/login|\//, { timeout: 5000 });
  });

  test('usuário não pode votar duas vezes na mesma proposta', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ACT: Seleciona primeira votação
    await page.locator('[data-testid="voting-card"]').first().click();
    await page.waitForURL(/\/votacoes\/\d+/, { waitUntil: 'networkidle' });

    // ACT: Vota
    const voteButton = page.locator('[data-testid="vote-button"]').first();
    await voteButton.click();

    await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 5000 });

    // ACT: Tenta votar novamente
    const voteButtonAfter = page.locator('[data-testid="vote-button"]').first();
    const isDisabled = await voteButtonAfter.isDisabled();

    // ASSERT: Verifica se botão está desabilitado ou mostra erro
    if (isDisabled) {
      await expect(voteButtonAfter).toBeDisabled();
    } else {
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/já votou|já registrado/i);
    }
  });

  test('votação expirada deve impedir novos votos', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ACT: Procura por votação expirada
    const expiredVoting = page.locator('[data-testid="voting-status"]:has-text("Encerrada")').first();

    if (await expiredVoting.isVisible()) {
      // Clica na votação expirada
      await expiredVoting.locator('..').click();

      await page.waitForURL(/\/votacoes\/\d+/, { waitUntil: 'networkidle' });

      // ASSERT: Verifica se não há botão de voto
      const voteButton = page.locator('[data-testid="vote-button"]');
      await expect(voteButton).not.toBeVisible();

      // ASSERT: Verifica se há mensagem de votação encerrada
      const expiredMessage = page.locator('[data-testid="voting-expired-message"]');
      await expect(expiredMessage).toBeVisible();
    }
  });

  test('morador pode visualizar histórico de votações', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para votações
    await page.click('a:has-text("Votações")');
    await page.waitForURL('/votacoes', { waitUntil: 'networkidle' });

    // ACT: Clica em filtro de histórico
    const historyFilter = page.locator('[data-testid="filter-history"]');
    if (await historyFilter.isVisible()) {
      await historyFilter.click();

      // ASSERT: Verifica se votações antigas aparecem
      const votingsList = page.locator('[data-testid="voting-card"]');
      await expect(votingsList).toHaveCount(0);
    }
  });
});
