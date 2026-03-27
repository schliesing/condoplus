/**
 * Utilitários comuns para testes E2E
 * Helpers para operações frequentes
 */

import { expect } from '@playwright/test';

/**
 * Aguarda elemento e verifica visibilidade
 * @param {Page} page
 * @param {string} selector
 * @param {number} timeout
 */
export async function waitForElement(page, selector, timeout = 5000) {
  const element = page.locator(selector);
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * Preenche um formulário com dados
 * @param {Page} page
 * @param {Object} data - { 'data-testid': 'value' }
 */
export async function fillForm(page, data) {
  for (const [testid, value] of Object.entries(data)) {
    const field = page.locator(`[data-testid="${testid}"]`);

    // Determina tipo de campo
    const tagName = await field.evaluate(el => el.tagName.toLowerCase());

    if (tagName === 'select') {
      await field.selectOption(value);
    } else if (tagName === 'textarea') {
      await field.fill(value);
    } else if (await field.getAttribute('type') === 'checkbox') {
      if (value) {
        await field.check();
      } else {
        await field.uncheck();
      }
    } else if (await field.getAttribute('type') === 'radio') {
      await field.check();
    } else {
      await field.fill(value);
    }
  }
}

/**
 * Verifica se há mensagem de erro visível
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
export async function hasError(page) {
  const errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]');
  return await errorMessage.isVisible().catch(() => false);
}

/**
 * Verifica se há mensagem de sucesso
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
export async function hasSuccess(page) {
  const successMessage = page.locator('[data-testid="success-message"], .success, [role="status"]');
  return await successMessage.isVisible().catch(() => false);
}

/**
 * Obtém o texto de erro
 * @param {Page} page
 * @returns {Promise<string|null>}
 */
export async function getErrorText(page) {
  const errorMessage = page.locator('[data-testid="error-message"]');
  return await errorMessage.textContent().catch(() => null);
}

/**
 * Aguarda até que elemento desapareça
 * @param {Page} page
 * @param {string} selector
 * @param {number} timeout
 */
export async function waitForElementToDisappear(page, selector, timeout = 5000) {
  const element = page.locator(selector);
  await expect(element).not.toBeVisible({ timeout });
}

/**
 * Clica em um botão e aguarda navegação
 * @param {Page} page
 * @param {string} buttonSelector
 * @param {string} expectedURL
 * @param {number} timeout
 */
export async function clickAndWaitForNavigation(page, buttonSelector, expectedURL, timeout = 10000) {
  const navigationPromise = page.waitForURL(expectedURL, { timeout });
  await page.click(buttonSelector);
  await navigationPromise;
}

/**
 * Aguarda loading desaparecer
 * @param {Page} page
 * @param {number} timeout
 */
export async function waitForLoadingComplete(page, timeout = 10000) {
  const spinner = page.locator('[data-testid="loading-spinner"], .spinner, .loading');
  await waitForElementToDisappear(page, '[data-testid="loading-spinner"]', timeout).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

/**
 * Obtém contagem de itens em lista
 * @param {Page} page
 * @param {string} listSelector
 * @returns {Promise<number>}
 */
export async function getListItemCount(page, listSelector) {
  const items = page.locator(`${listSelector} > *`);
  return await items.count();
}

/**
 * Verifica se elemento tem classe
 * @param {Page} page
 * @param {string} selector
 * @param {string} className
 * @returns {Promise<boolean>}
 */
export async function hasClass(page, selector, className) {
  const element = page.locator(selector);
  return await element.evaluate(
    (el, cls) => el.classList.contains(cls),
    className
  );
}

/**
 * Obtém atributo data-*
 * @param {Page} page
 * @param {string} selector
 * @param {string} attrName
 * @returns {Promise<string|null>}
 */
export async function getDataAttribute(page, selector, attrName) {
  return await page.locator(selector).getAttribute(`data-${attrName}`);
}

/**
 * Verifica se elemento é desabilitado
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function isDisabled(page, selector) {
  return await page.locator(selector).isDisabled();
}

/**
 * Aguarda até que um valor apareça em um campo
 * @param {Page} page
 * @param {string} selector
 * @param {string} value
 * @param {number} timeout
 */
export async function waitForInputValue(page, selector, value, timeout = 5000) {
  const field = page.locator(selector);
  await expect(field).toHaveValue(value, { timeout });
}

/**
 * Limpa um campo de input
 * @param {Page} page
 * @param {string} selector
 */
export async function clearInput(page, selector) {
  const field = page.locator(selector);
  await field.tripleClick(); // Seleciona tudo
  await field.press('Backspace');
}

/**
 * Verifica se página é responsiva (mobile)
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
export async function isMobileViewport(page) {
  return (await page.viewportSize()).width <= 768;
}

/**
 * Obtém todas as opções de um select
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<string[]>}
 */
export async function getSelectOptions(page, selector) {
  return await page.locator(`${selector} option`).allTextContents();
}

/**
 * Aguarda por notificação (toast)
 * @param {Page} page
 * @param {string} text
 * @param {number} timeout
 */
export async function waitForNotification(page, text, timeout = 5000) {
  const notification = page.locator(`[role="alert"]:has-text("${text}"), .toast:has-text("${text}")`);
  await expect(notification).toBeVisible({ timeout });
}

/**
 * Verifica se URL contém string
 * @param {Page} page
 * @param {string} str
 * @returns {Promise<boolean>}
 */
export async function urlContains(page, str) {
  return page.url().includes(str);
}

/**
 * Aguarda por mudança de URL
 * @param {Page} page
 * @param {string|RegExp} pattern
 * @param {number} timeout
 */
export async function waitForUrlChange(page, pattern, timeout = 10000) {
  await page.waitForURL(pattern, { timeout });
}

/**
 * Executa ação com retry
 * @param {Function} action
 * @param {number} retries
 * @param {number} delay
 */
export async function retry(action, retries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Captura screenshot para debugging
 * @param {Page} page
 * @param {string} name
 */
export async function captureScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Obtém todos os logs do console
 * @param {Page} page
 * @returns {Promise<string[]>}
 */
export async function getConsoleLogs(page) {
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  return logs;
}

/**
 * Verifica acessibilidade básica
 * @param {Page} page
 */
export async function checkAccessibility(page) {
  const headings = await page.locator('h1, h2, h3').count();
  expect(headings).toBeGreaterThan(0);

  const buttons = await page.locator('button').count();
  const buttonsWithText = await page.locator('button:has-text("*")').count();
  expect(buttonsWithText).toBeGreaterThan(0);
}
