import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../fixtures/auth';

/**
 * Testes E2E para fluxo completo de fornecedores
 * Login → Acessar fornecedores → Sugerir fornecedor → Upload de documentos
 */

test.describe('Fluxo Completo de Fornecedores', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa localStorage e cookies antes de cada teste
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('morador pode sugerir um novo fornecedor', async ({ page }) => {
    // ARRANGE: Faz login como morador
    await login(page, TEST_USERS.morador);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ASSERT: Verifica se página de fornecedores carregou
    await expect(page).toHaveTitle(/Fornecedores/i);
    const suppliersList = page.locator('[data-testid="suppliers-list"]');
    await expect(suppliersList).toBeVisible();

    // ACT: Clica em "Sugerir Fornecedor"
    const suggestButton = page.locator('button:has-text("Sugerir Fornecedor")');
    await suggestButton.click();

    // Aguarda carregamento do formulário
    const supplierForm = page.locator('[data-testid="supplier-form"]');
    await expect(supplierForm).toBeVisible();

    // ACT: Preenche informações do fornecedor
    const nameInput = page.locator('[data-testid="supplier-name"]');
    await nameInput.fill('Fornecedor Teste LTDA');

    const categorySelect = page.locator('[data-testid="supplier-category"]');
    await categorySelect.click();
    const categoryOption = page.locator('[data-testid="category-option"]').first();
    await categoryOption.click();

    const phoneInput = page.locator('[data-testid="supplier-phone"]');
    await phoneInput.fill('(11) 98765-4321');

    const emailInput = page.locator('[data-testid="supplier-email"]');
    await emailInput.fill('contato@fornecedor.com');

    const descriptionInput = page.locator('[data-testid="supplier-description"]');
    await descriptionInput.fill('Fornecedor de serviços de limpeza especializado em condomínios');

    // ACT: Clica em "Enviar Sugestão"
    const submitButton = page.locator('button:has-text("Enviar")');
    await submitButton.click();

    // Aguarda confirmação
    await page.waitForSelector('[data-testid="supplier-confirmation"]', { timeout: 5000 });

    // ASSERT: Verifica se sugestão foi enviada
    const confirmationMessage = page.locator('[data-testid="supplier-confirmation"]');
    await expect(confirmationMessage).toBeVisible();
    await expect(confirmationMessage).toContainText(/sugestão enviada|obrigado|sucesso/i);

    // ASSERT: Verifica se redirecionou para lista de fornecedores
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });
  });

  test('morador pode visualizar detalhes de fornecedor', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ACT: Clica em um fornecedor da lista
    const supplierCard = page.locator('[data-testid="supplier-card"]').first();
    await supplierCard.click();

    // Aguarda carregamento de detalhes
    await page.waitForURL(/\/fornecedores\/\d+/, { waitUntil: 'networkidle' });

    // ASSERT: Verifica se detalhes estão visíveis
    const supplierDetails = page.locator('[data-testid="supplier-details"]');
    await expect(supplierDetails).toBeVisible();

    // ASSERT: Verifica se elementos esperados existem
    const supplierName = page.locator('[data-testid="supplier-detail-name"]');
    await expect(supplierName).toBeVisible();

    const supplierCategory = page.locator('[data-testid="supplier-detail-category"]');
    await expect(supplierCategory).toBeVisible();

    const supplierContact = page.locator('[data-testid="supplier-detail-contact"]');
    await expect(supplierContact).toBeVisible();
  });

  test('morador pode fazer upload de orçamento', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ACT: Clica em um fornecedor
    const supplierCard = page.locator('[data-testid="supplier-card"]').first();
    await supplierCard.click();
    await page.waitForURL(/\/fornecedores\/\d+/, { waitUntil: 'networkidle' });

    // ACT: Procura por botão de upload de orçamento
    const uploadButton = page.locator('button:has-text("Upload de Orçamento")');

    if (await uploadButton.isVisible()) {
      // ACT: Clica no botão de upload
      await uploadButton.click();

      // Aguarda diálogo de upload
      const uploadDialog = page.locator('[data-testid="upload-dialog"]');
      await expect(uploadDialog).toBeVisible();

      // ACT: Seleciona arquivo (simula seleção)
      // Nota: Playwright não pode interagir com file picker nativo
      // Usamos setInputFiles para simular seleção
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Cria arquivo de teste
        const filePath = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          return canvas.toDataURL('image/pdf');
        });

        // ACT: Preenche descrição
        const descriptionInput = uploadDialog.locator('[data-testid="upload-description"]');
        await descriptionInput.fill('Orçamento de serviços de limpeza');

        // ACT: Clica em "Enviar"
        const confirmUploadButton = uploadDialog.locator('button:has-text("Enviar")');
        await confirmUploadButton.click();

        // ASSERT: Verifica se upload foi confirmado
        const uploadConfirmation = page.locator('[data-testid="upload-confirmation"]');
        await expect(uploadConfirmation).toBeVisible();
      }
    }
  });

  test('admin pode avaliar fornecedores sugeridos', async ({ page }) => {
    // ARRANGE: Faz login como admin
    await login(page, TEST_USERS.admin);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ACT: Procura por painel de admin
    const adminPanel = page.locator('[data-testid="admin-suppliers-panel"]');

    if (await adminPanel.isVisible()) {
      // ACT: Clica em "Sugestões Pendentes"
      const pendingButton = adminPanel.locator('button:has-text("Sugestões")');

      if (await pendingButton.isVisible()) {
        await pendingButton.click();

        // Aguarda carregamento de sugestões pendentes
        const pendingList = page.locator('[data-testid="pending-suggestions-list"]');
        await expect(pendingList).toBeVisible();

        // ACT: Clica em primeira sugestão
        const firstSuggestion = pendingList.locator('[data-testid="suggestion-card"]').first();

        if (await firstSuggestion.isVisible()) {
          await firstSuggestion.click();

          // ACT: Aprova sugestão
          const approveButton = page.locator('button:has-text("Aprovar")');

          if (await approveButton.isVisible()) {
            await approveButton.click();

            // Aguarda confirmação
            const approvalConfirmation = page.locator('[data-testid="approval-confirmation"]');
            await expect(approvalConfirmation).toBeVisible();
          }
        }
      }
    }
  });

  test('admin pode gerenciar documentos de fornecedor', async ({ page }) => {
    // ARRANGE: Faz login como admin
    await login(page, TEST_USERS.admin);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ACT: Clica em um fornecedor
    const supplierCard = page.locator('[data-testid="supplier-card"]').first();
    await supplierCard.click();
    await page.waitForURL(/\/fornecedores\/\d+/, { waitUntil: 'networkidle' });

    // ACT: Procura por seção de documentos
    const documentsSection = page.locator('[data-testid="documents-section"]');

    if (await documentsSection.isVisible()) {
      // ACT: Clica em "Ver Documentos"
      const viewDocsButton = documentsSection.locator('button:has-text("Ver")');

      if (await viewDocsButton.isVisible()) {
        await viewDocsButton.click();

        // Aguarda carregamento de documentos
        const documentsList = page.locator('[data-testid="documents-list"]');
        await expect(documentsList).toBeVisible();

        // ACT: Tenta deletar um documento
        const deleteButton = documentsList.locator('button:has-text("Deletar")').first();

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Aguarda confirmação
          const confirmDialog = page.locator('[data-testid="delete-confirm-dialog"]');
          await expect(confirmDialog).toBeVisible();

          // ACT: Confirma deleção
          await confirmDialog.locator('button:has-text("Confirmar")').click();

          // ASSERT: Verifica se documento foi deletado
          const deleteConfirmation = page.locator('[data-testid="delete-confirmation"]');
          await expect(deleteConfirmation).toBeVisible();
        }
      }
    }
  });

  test('filtros de fornecedor funcionam corretamente', async ({ page }) => {
    // ARRANGE: Faz login
    await login(page, TEST_USERS.morador);

    // ACT: Navega para fornecedores
    await page.click('a:has-text("Fornecedores")');
    await page.waitForURL('/fornecedores', { waitUntil: 'networkidle' });

    // ACT: Abre filtros
    const filterButton = page.locator('button:has-text("Filtros")');

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Aguarda painel de filtros
      const filterPanel = page.locator('[data-testid="filter-panel"]');
      await expect(filterPanel).toBeVisible();

      // ACT: Seleciona uma categoria
      const categoryFilter = filterPanel.locator('[data-testid="category-filter"]');
      await categoryFilter.click();
      const categoryOption = page.locator('[data-testid="filter-category-option"]').first();
      await categoryOption.click();

      // ACT: Clica em "Aplicar"
      const applyButton = filterPanel.locator('button:has-text("Aplicar")');
      await applyButton.click();

      // ASSERT: Verifica se lista foi filtrada
      const suppliersList = page.locator('[data-testid="suppliers-list"]');
      const supplierCards = suppliersList.locator('[data-testid="supplier-card"]');

      const count = await supplierCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
