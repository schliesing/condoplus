# Plano de Execução - Deploy Automático

**Data:** 2026-03-27
**Operação:** Deploy Inicial Automático
**Duração Estimada:** 30-45 minutos
**Status:** ⏳ PRONTO PARA EXECUÇÃO

---

## 📋 PRÉ-REQUISITOS - CHECKLIST FINAL

Execute este checklist ANTES de rodar o script:

### ✅ Seu Computador Local
```bash
# 1. Node.js instalado?
node --version
# Esperado: v18.x ou maior

# 2. npm funcionando?
npm --version
# Esperado: 9.x ou maior

# 3. Git configurado?
git config --global user.name
git config --global user.email
# Esperado: seu nome e email

# 4. Repositório clonado?
cd /Users/rafas/condoplus
git status
# Esperado: On branch main ou develop

# 5. Dependências instaladas?
cd backend && npm list && cd ..
cd frontend && npm list && cd ..
# Esperado: sem erros de dependências

# 6. Testes passando?
cd backend && npm run test:ci && cd ..
cd frontend && npm run test -- --run && cd ..
# Esperado: ✅ Todos os testes passam

# 7. Frontend faz build?
cd frontend && npm run build && cd ..
# Esperado: dist/ criado com sucesso

# 8. SSH key configurada?
cat ~/.ssh/github_actions
# Esperado: SSH private key (-----BEGIN OPENSSH PRIVATE KEY-----)

# 9. SSH acesso ao VPS?
ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167 "echo 'SSH OK'"
# Esperado: SSH OK
```

### ✅ VPS (187.77.51.167)

```bash
# SSH para VPS
ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167

# No VPS, verificar:

# 1. Node.js instalado?
node --version && npm --version

# 2. PM2 instalado?
pm2 --version

# 3. Nginx instalado?
sudo systemctl status nginx

# 4. Espaço em disco?
df -h /var/www/condoplus
# Esperado: > 5GB livre

# 5. Memória disponível?
free -h
# Esperado: > 1GB livre

# 6. Firewall configurado?
sudo ufw status
# Esperado: 22/tcp allow, 80/tcp allow, 443/tcp allow

# 7. Diretórios existem?
ls -la /var/www/condoplus
# Esperado: backend, frontend, data, logs, backups (podem estar vazios)

# 8. Git inicializado?
cd /var/www/condoplus && git status
# Esperado: On branch main ou empty repo
```

### ✅ GitHub

```bash
# 1. Secrets configurados?
# Vá em: Settings > Secrets and variables > Actions
# Verifique:
#   ✓ VPS_HOST = 187.77.51.167
#   ✓ VPS_USER = ubuntu
#   ✓ VPS_SSH_KEY = [sua chave privada]
#   ✓ BACKEND_ENV_PROD = [configurações]

# 2. SSH key no VPS?
cat ~/.ssh/authorized_keys | grep github
# Esperado: sua chave pública listada
```

---

## 🚀 EXECUTAR O SCRIPT

### Passo 1: Preparar Script

```bash
# Ir para raiz do projeto
cd /Users/rafas/condoplus

# Tornar script executável
chmod +x scripts/initial-deploy.sh

# Verificar se script existe
ls -la scripts/initial-deploy.sh
# Esperado: -rwxr-xr-x (executável)
```

### Passo 2: Executar Deployment

#### Opção A: Execução Simples (Recomendado)
```bash
./scripts/initial-deploy.sh
# Vai executar todos os passos automaticamente
# Tempo: ~30-45 minutos
```

#### Opção B: Dry-Run (Simular sem Executar)
```bash
./scripts/initial-deploy.sh --dry-run
# Vai mostrar o que faria sem executar
# Tempo: < 1 minuto
# Use para verificar antes de executar
```

#### Opção C: Skip Tests (Mais Rápido)
```bash
./scripts/initial-deploy.sh --skip-tests
# Vai pular testes (use com cuidado!)
# Tempo: ~20-30 minutos
```

#### Opção D: Verbose Mode (Mais Detalhes)
```bash
./scripts/initial-deploy.sh --verbose
# Vai mostrar todo output dos comandos
# Use para debug se algo der errado
```

---

## 📊 O QUE O SCRIPT FAZ

### FASE 1: Verificações Pré-Deployment
```
✓ SSH acesso ao VPS
✓ Node.js versão
✓ PM2 instalado
✓ Espaço em disco
  [~2 minutos]
```

### FASE 2: Testes Locais
```
✓ Backend tests (Jest)
✓ Frontend tests (Vitest)
✓ E2E tests (Playwright)
  [~15-20 minutos]
```

### FASE 3: Build
```
✓ Build frontend (Vite)
  [~3-5 minutos]
```

### FASE 4: Deploy Backend
```
✓ SCP: copiar código
✓ npm install --production
✓ PM2: start ecosystem
  [~5-10 minutos]
```

### FASE 5: Deploy Frontend
```
✓ SCP: copiar build
✓ Nginx: reload
  [~2-3 minutos]
```

### FASE 6: Verificação Pós-Deploy
```
✓ Health check API
✓ Health check Frontend
✓ Relatório final
  [~2-3 minutos]
```

---

## 📺 OUTPUT ESPERADO

Conforme o script executa, você verá:

```
════════════════════════════════════════════════════════════════════════════════
🚀 DEPLOYMENT INICIAL - CondoPlus
════════════════════════════════════════════════════════════════════════════════

Configuração:
  VPS Host: 187.77.51.167
  VPS User: ubuntu
  Deploy Path: /var/www/condoplus
  Skip Tests: false
  Dry Run: false

════════════════════════════════════════════════════════════════════════════════
📋 FASE 1: Verificações Pré-Deployment
════════════════════════════════════════════════════════════════════════════════

▶️  Verificando conectividade SSH... OK ✅
▶️  Verificando Node.js no VPS... OK ✅
▶️  Verificando PM2 no VPS... OK ✅
▶️  Verificando espaço em disco... OK ✅

════════════════════════════════════════════════════════════════════════════════
🧪 FASE 2: Testes Locais
════════════════════════════════════════════════════════════════════════════════

▶️  Testes Backend... OK ✅
▶️  Testes Frontend... OK ✅
▶️  Testes E2E... OK ✅

[... continua ...]

════════════════════════════════════════════════════════════════════════════════
🎉 DEPLOYMENT COMPLETO!
════════════════════════════════════════════════════════════════════════════════

Status do Deployment:
  Servidor: ✅
  Backend: ✅
  Frontend: ✅

URLs:
  API: https://api.condoplus.com
  Frontend: https://condoplus.com

Próximos passos:
  1. Testar aplicação em https://condoplus.com
  2. Verificar logs: pm2 logs condoplus-api
  3. Configurar monitoramento
```

---

## ⚠️ SE ALGO DER ERRADO

### Erro: SSH connection refused
```bash
# Verificar SSH key
ls -la ~/.ssh/github_actions

# Testar manualmente
ssh -i ~/.ssh/github_actions -v ubuntu@187.77.51.167

# Ver error detalhado no script
./scripts/initial-deploy.sh --verbose
```

### Erro: Tests falhando
```bash
# Executar testes manualmente
cd backend && npm run test:ci
cd frontend && npm run test

# Consertar testes ANTES de tentar deploy novamente
# Use: ./scripts/initial-deploy.sh --skip-tests (COM CUIDADO!)
```

### Erro: Disk full
```bash
# SSH para VPS
ssh ubuntu@187.77.51.167

# Liberar espaço
rm -rf /var/www/condoplus/backups/backup_*.db
sudo apt-get clean

# Ou aumentar storage na cloud
```

### Erro: Port already in use
```bash
# SSH para VPS
ssh ubuntu@187.77.51.167

# Ver o que está usando porta
sudo lsof -i :5174
sudo lsof -i :80
sudo lsof -i :443

# Matar processo
kill -9 PID
```

---

## ✅ DEPOIS QUE TERMINAR

### 1. Verificação Imediata (5 minutos)
```bash
# Health check automático
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### 2. Testes Funcionais (10 minutos)
```bash
# Abrir no navegador
# https://condoplus.com
# Fazer login
# Testar fluxos críticos
```

### 3. Ver Logs
```bash
# SSH para VPS
ssh ubuntu@187.77.51.167

# Logs da API
pm2 logs condoplus-api --lines 50

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
```

### 4. Backup Inicial
```bash
# SSH para VPS
ssh ubuntu@187.77.51.167

# Fazer backup
/var/www/condoplus/backup.sh

# Verificar
ls -la /var/www/condoplus/backups/
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique checklist acima** (pré-requisitos)
2. **Execute com --verbose**: `./scripts/initial-deploy.sh --verbose`
3. **Veja logs**: `tail -f /var/log/...`
4. **Teste manualmente**: use comandos do DEPLOYMENT_QUICK_REFERENCE.md
5. **SSH para VPS**: `ssh ubuntu@187.77.51.167`

---

## 🎯 PRÓXIMO STEP (Após Deployment Bem-Sucesso)

**Step 2: Monitoramento em Tempo Real**
- Prometheus + Grafana
- Alertas automáticos
- Logs centralizados

---

**Pronto? Execute agora:**
```bash
cd /Users/rafas/condoplus
./scripts/initial-deploy.sh
```

**Boa sorte! 🚀**
