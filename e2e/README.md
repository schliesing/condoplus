# Testes E2E com Playwright - CondoPlus

Testes end-to-end automatizados para validar os fluxos críticos da aplicação CondoPlus.

## 📋 Índice

- [Instalação](#instalação)
- [Estrutura](#estrutura)
- [Executando Testes](#executando-testes)
- [Escrevendo Novos Testes](#escrevendo-novos-testes)
- [Troubleshooting](#troubleshooting)

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Aplicação rodando em `http://localhost:5173` (desenvolvimento)

### Setup

```bash
# Instalar dependências do Playwright
cd frontend
npm install

# Instalar navegadores Playwright
npx playwright install
```

## 📁 Estrutura

```
e2e/
├── fixtures/
│   └── auth.js              # Utilitários de autenticação e dados de teste
├── tests/
│   ├── voting-flow.spec.js      # Fluxo de votações
│   ├── scheduling-flow.spec.js  # Fluxo de agendamentos
│   ├── suppliers-flow.spec.js   # Fluxo de fornecedores
│   └── auth-performance.spec.js # Autenticação e performance
├── global-setup.js          # Setup que executa antes de todos os testes
├── playwright.config.js     # Configuração principal do Playwright
└── README.md               # Este arquivo
```

## 🧪 Executando Testes

### Ambiente de Desenvolvimento

```bash
# Iniciar aplicação (em um terminal)
npm run dev

# Em outro terminal, rodar testes
npm run test:e2e

# Com interface visual
npm run test:e2e:ui

# Em modo headed (ver o navegador)
npm run test:e2e:headed

# Debug com passo a passo
npm run test:e2e:debug
```

### Ambiente CI/CD (GitHub Actions)

```bash
# Rodar testes em modo headless com retries
npm run test:e2e
```

### Testes Específicos

```bash
# Apenas votações
npx playwright test e2e/tests/voting-flow.spec.js

# Apenas agendamentos
npx playwright test e2e/tests/scheduling-flow.spec.js

# Apenas fornecedores
npx playwright test e2e/tests/suppliers-flow.spec.js

# Apenas autenticação
npx playwright test e2e/tests/auth-performance.spec.js

# Com padrão específico
npx playwright test -g "morador"
```

### Rodando em Navegadores Específicos

```bash
# Apenas Chromium
npx playwright test --project=chromium

# Apenas Firefox
npx playwright test --project=firefox

# Apenas WebKit
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

## ✍️ Escrevendo Novos Testes

### Estrutura Básica

```javascript
import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../fixtures/auth';

test.describe('Nova Funcionalidade', () => {
  test.beforeEach(async ({ page }) => {
    // Setup antes de cada teste
    await page.context().clearCookies();
  });

  test('deve fazer algo', async ({ page }) => {
    // ARRANGE: Preparar estado inicial
    await login(page, TEST_USERS.morador);

    // ACT: Executar ação
    await page.click('button');

    // ASSERT: Verificar resultado
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Usando Fixtures

```javascript
import { login, logout, TEST_USERS, TEST_CONDO } from '../fixtures/auth';

// Login como morador
await login(page, TEST_USERS.morador);

// Login como admin
await login(page, TEST_USERS.admin);

// Logout
await logout(page);
```

### Localizadores Recomendados

Prefira usar `data-testid` em vez de seletores genéricos:

```javascript
// ❌ Ruim
await page.click('button:nth-child(2)');

// ✅ Bom
await page.click('[data-testid="submit-button"]');
```

### Padrão AAA (Arrange-Act-Assert)

```javascript
test('exemplo de padrão AAA', async ({ page }) => {
  // ARRANGE: Estado inicial
  await login(page, TEST_USERS.morador);

  // ACT: Executar ação
  await page.click('[data-testid="vote-button"]');

  // ASSERT: Verificar resultado
  const confirmation = page.locator('[data-testid="vote-confirmation"]');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(/sucesso/i);
});
```

## 🛠️ Troubleshooting

### Erro: "Timeout waiting for selector"

```javascript
// Aumentar timeout se necessário
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });

// Ou usar waitFor com condição
await expect(page.locator('[data-testid="element"]')).toBeVisible({ timeout: 10000 });
```

### Erro: "Browser is not installed"

```bash
# Instalar navegadores Playwright
npx playwright install
```

### Erro: "Cannot find module"

```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

### Erro: "Aplicação não está respondendo"

```bash
# Certifique-se de que o servidor dev está rodando
npm run dev

# Verificar porta (padrão: 5173)
# Ajustar TEST_BASE_URL se necessário:
TEST_BASE_URL=http://localhost:3000 npm run test:e2e
```

### Teste Falhando Intermitentemente

```javascript
// Adicionar waits explícitos
await page.waitForLoadState('networkidle');

// Ou waitFor
await page.waitForFunction(() => {
  // Seu código de verificação
});

// Aumentar timeout global se necessário
test.setTimeout(60 * 1000); // 60 segundos
```

## 📊 Relatórios

Após executar os testes, gerar relatório HTML:

```bash
# Abrir relatório
npx playwright show-report
```

Relatórios são salvos em:
- `playwright-report/` - Relatório HTML
- `test-results/` - Resultados JSON e JUnit

## 🔒 Dados de Teste

Credenciais disponíveis em `e2e/fixtures/auth.js`:

| Papel | Email | Senha |
|-------|-------|-------|
| Morador | `morador@test.com` | `Test123!` |
| Admin | `admin@test.com` | `Admin123!` |

⚠️ **IMPORTANTE**: Use apenas em ambiente de teste!

## 🌐 Variáveis de Ambiente

Configure em `.env.test` ou via linha de comando:

```env
TEST_BASE_URL=http://localhost:5173
CI=false
DEBUG=pw:api
```

## 📝 Boas Práticas

1. **Use data-testid** para seletores estáveis
2. **Organize em describe** para agrupar testes relacionados
3. **Evite hardcoding** de valores - use fixtures
4. **Limpe estado** entre testes com `beforeEach`
5. **Use waitFor** em vez de sleeps arbitrários
6. **Registre screenshots** em caso de falha (já configurado)
7. **Use o modo --headed** para debug visual
8. **Verifique fluxos reais**, não mocks

## 🚀 Próximos Passos

- [ ] Adicionar testes para fluxo de notificações
- [ ] Adicionar testes de validação de formulários
- [ ] Integrar com CI/CD (GitHub Actions)
- [ ] Adicionar testes de acessibilidade com `@axe-core/playwright`
- [ ] Configurar alertas de performance
- [ ] Adicionar testes de load/stress

## 📚 Recursos

- [Documentação Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [Test API Reference](https://playwright.dev/docs/api/class-test)

## 💬 Contribuindo

Para adicionar novos testes:

1. Crie arquivo em `e2e/tests/`
2. Siga padrão de nomenclatura `*-flow.spec.js`
3. Use fixtures de `e2e/fixtures/`
4. Inclua comentários AAA
5. Teste localmente antes de fazer commit

---

**Último update**: 2026-03-27
**Versão Playwright**: 1.40.0+
