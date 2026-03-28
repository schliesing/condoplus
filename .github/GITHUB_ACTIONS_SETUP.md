# GitHub Actions - Setup e Configuração

Guia completo para configurar GitHub Actions para CondoPlus com testes automáticos e deploy.

## 📋 Índice

- [Secrets Necessários](#secrets-necessários)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Branch Protection](#branch-protection)
- [Workflows](#workflows)
- [Monitoramento](#monitoramento)
- [Troubleshooting](#troubleshooting)

---

## 🔐 Secrets Necessários

Configure os seguintes secrets no GitHub (Settings > Secrets and variables > Actions):

### 1. **VPS_HOST**
```
187.77.51.167
```
- Host/IP do servidor VPS

### 2. **VPS_USER**
```
ubuntu  (ou seu usuário SSH)
```
- Usuário SSH para conectar ao VPS

### 3. **VPS_SSH_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
[sua chave SSH privada aqui]
-----END OPENSSH PRIVATE KEY-----
```
- Chave SSH privada para autenticação no VPS

**Como gerar SSH key (se não tiver):**
```bash
ssh-keygen -t ed25519 -C "github-actions"
# Copiar conteúdo de ~/.ssh/id_ed25519 (private key)
# Adicionar ~/.ssh/id_ed25519.pub ao servidor VPS em ~/.ssh/authorized_keys
```

### 4. **BACKEND_ENV_PROD**
```
NODE_ENV=production
DATABASE_URL=sqlite:/var/www/condoplus/data/condoplus.db
JWT_SECRET=[seu-jwt-secret-aqui]
API_PORT=5174
CORS_ORIGIN=https://condoplus.com
LOG_LEVEL=info
```
- Variáveis de ambiente para o backend em produção

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. **SLACK_WEBHOOK_URL** (Opcional)
```
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
- URL do webhook do Slack para notificações

**Como criar webhook Slack:**
1. Ir em Slack > Apps > App Directory
2. Procurar por "Incoming Webhooks"
3. Clicar em "Add to Slack"
4. Selecionar canal de notificações
5. Copiar URL fornecida

### 6. **DATABASE_BACKUP_RETENTION_DAYS**
```
30
```
- Dias para manter backups automáticos

---

## 🌍 Variáveis de Ambiente

Configure variáveis gerais no GitHub (Settings > Secrets and variables > Variables):

### 1. **API_URL_DEV**
```
http://localhost:5174
```

### 2. **API_URL_PROD**
```
https://api.condoplus.com
```

### 3. **FRONTEND_URL_DEV**
```
http://localhost:5173
```

### 4. **FRONTEND_URL_PROD**
```
https://condoplus.com
```

### 5. **NODE_VERSION**
```
18.x
```

---

## 🛡️ Branch Protection

### Habilitar Branch Protection na main

1. Ir em: **Settings > Branches > Add rule**

2. Configurar como:
   - **Branch name pattern**: `main`
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (1 aprovação)
   - ✅ **Require status checks to pass before merging**
     - Selecionar:
       - `Backend Tests (Jest)`
       - `Frontend Tests (Vitest)`
       - `E2E Tests (Playwright)`
       - `Code Quality`
       - `Build Verification`
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Restrict who can push to matching branches** (opcional)

### Resultado

Merge só será possível se:
- ✅ PR foi aprovado por reviewer
- ✅ Todos os testes passaram
- ✅ Build completou com sucesso
- ✅ Branch está atualizado com main

---

## 🔄 Workflows

### 1. **test.yml** - Testes Automáticos

**Gatilhos:**
- `push` em `main` ou `develop`
- `pull_request` em `main` ou `develop`
- Agendamento diário às 2:00 AM UTC

**Jobs:**
1. **backend-tests**
   - Node 18.x e 20.x
   - Jest + Supertest
   - Coverage report

2. **frontend-tests**
   - Node 18.x e 20.x
   - Vitest + React Testing Library
   - Coverage report

3. **e2e-tests**
   - Playwright (Chromium, Firefox, WebKit)
   - Screenshots/Videos em falha
   - Traces para debug

4. **code-quality**
   - ESLint backend
   - ESLint frontend

5. **build-verification**
   - Build backend (se aplicável)
   - Build frontend (produção)

6. **test-report**
   - Resumo final
   - Notificação Slack

---

### 2. **deploy.yml** - Deploy Automático

**Gatilhos:**
- `push` em `main` (após testes passarem)
- `workflow_run` (após test.yml completar com sucesso)

**Fluxo:**

```
✓ Verificar testes
    ↓
✓ Backup database
    ↓
┌─ Deploy Backend ─────────┐
│                          ├─→ Health Check
├─ Backup Database ────────┤
│                          ├─→ Post-Deploy Verification
├─ Deploy Frontend ────────┤
└──────────────────────────┘
    ↓
✓ Rollback (em caso de falha)
    ↓
✓ Notificação Slack
```

**Jobs:**

1. **check-tests**
   - Verifica se testes passaram
   - Aborta deploy se houver falhas

2. **deploy-backend**
   - SCP para VPS
   - npm install
   - PM2 restart
   - Health check

3. **deploy-frontend**
   - Build (Vite)
   - SCP para VPS
   - Nginx reload
   - Health check

4. **backup-database**
   - SQLite backup
   - Retenção de 7 dias

5. **post-deploy**
   - Verificação de logs
   - Health check
   - Notificação Slack

6. **rollback** (em falha)
   - Reverter commit anterior
   - Restart services

---

## 📊 Monitoramento

### Visualizar Status

1. **GitHub:** Settings > Actions > All workflows
2. **Badge de Status:** Adicionar ao README:

```markdown
![Tests](https://github.com/seu-user/condoplus/actions/workflows/test.yml/badge.svg)
![Deploy](https://github.com/seu-user/condoplus/actions/workflows/deploy.yml/badge.svg)
```

### Histórico de Execuções

- **Repository** > **Actions** > Selecionar workflow
- Ver logs por job/step
- Download de artefatos (reports, screenshots)

### Notificações

#### Email (Built-in GitHub)
- Settings > Notifications > Actions
- Ativar notificações

#### Slack
- Notificações automáticas em falha/sucesso
- Configurar em SLACK_WEBHOOK_URL

---

## 🔧 Arquivo: .github/workflows/test.yml

Este arquivo contém:
- ✅ Backend tests (Jest + Supertest)
- ✅ Frontend tests (Vitest + RTL)
- ✅ E2E tests (Playwright)
- ✅ Linting (ESLint)
- ✅ Build verification
- ✅ Coverage reports (Codecov)

---

## 🚀 Arquivo: .github/workflows/deploy.yml

Este arquivo contém:
- ✅ Deploy backend
- ✅ Deploy frontend
- ✅ Database backup
- ✅ Health checks
- ✅ Rollback automático
- ✅ Notificações Slack

---

## 📝 Checklist de Setup

### No GitHub

- [ ] Criar repo (se ainda não existe)
- [ ] Configurar secrets:
  - [ ] VPS_HOST
  - [ ] VPS_USER
  - [ ] VPS_SSH_KEY
  - [ ] BACKEND_ENV_PROD
  - [ ] SLACK_WEBHOOK_URL (opcional)
- [ ] Configurar variáveis públicas
- [ ] Habilitar branch protection em `main`
- [ ] Selecionar status checks obrigatórios

### No VPS

- [ ] Criar diretório: `/var/www/condoplus`
- [ ] Clonar repo ou preparar para deploy
- [ ] Instalar Node 18+
- [ ] Instalar PM2: `npm install -g pm2`
- [ ] Configurar Nginx (reverse proxy)
- [ ] Adicionar SSH key do GitHub em `~/.ssh/authorized_keys`
- [ ] Criar diretório de backups: `/var/www/condoplus/backups`

### Localmente

- [ ] Testar testes localmente:
  - [ ] `npm run test` (backend)
  - [ ] `npm run test` (frontend)
  - [ ] `npm run test:e2e` (E2E)
- [ ] Fazer commit e push para testar CI/CD
- [ ] Verificar logs no GitHub Actions

---

## 🐛 Troubleshooting

### Deploy não dispara após testes

**Problema:** Deploy workflow não executa após test.yml

**Solução:**
```yaml
# Em deploy.yml, adicionar:
on:
  workflow_run:
    workflows: ["Tests - Unit, Integration & E2E"]
    types: [completed]
```

### SSH connection refused

**Problema:** `Permission denied (publickey)`

**Solução:**
1. Verificar se SSH key está em authorized_keys no VPS:
   ```bash
   ssh user@vps 'cat ~/.ssh/authorized_keys | grep github'
   ```
2. Regenerar SSH key se necessário
3. Adicionar novo secret VPS_SSH_KEY

### Slack webhook inválido

**Problema:** `Invalid Slack webhook URL`

**Solução:**
1. Verificar URL do webhook
2. Usar apenas em `continue-on-error: true`
3. Remover se não usar

### Timeout em testes E2E

**Problema:** Playwright tests timeout

**Solução:**
1. Aumentar timeout em playwright.config.js
2. Reduzir número de workers em CI
3. Verificar se servidor dev inicia corretamente

### Falha de coverage

**Problema:** `Coverage below 70%`

**Solução:**
1. Escrever mais testes
2. Aumentar coverage de componentes críticos
3. Ajustar threshold em jest.config.js

---

## 🎓 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Slack API Webhooks](https://api.slack.com/messaging/webhooks)

---

**Versão:** 1.0
**Data:** 2026-03-27
**Status:** Pronto para uso
