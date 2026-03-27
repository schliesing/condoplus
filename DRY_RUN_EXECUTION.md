# Dry-Run: Simular Deployment sem Executar

**O que é:** Simula todo o processo de deployment mostrando os comandos que seriam executados, SEM fazer nada de verdade.

**Tempo:** < 1 minuto
**Risco:** Nenhum - é apenas simulação

---

## 🚀 Executar Dry-Run

### No Terminal/PowerShell

```bash
# Navegar para o projeto
cd C:\Users\rafas\condoplus

# Ou no WSL/Git Bash
cd /c/Users/rafas/condoplus
# ou
cd /Users/rafas/condoplus

# Executar dry-run
./scripts/initial-deploy.sh --dry-run
```

### Alternativa: Com Bash Explícito

```bash
# Se o script não executar diretamente
bash scripts/initial-deploy.sh --dry-run

# Ou em WSL
wsl bash scripts/initial-deploy.sh --dry-run
```

---

## 📊 O que Você Vai Ver

Quando executar o dry-run, você verá:

```
════════════════════════════════════════════════════════════════════════════════
🚀 DEPLOYMENT INICIAL - CondoPlus
════════════════════════════════════════════════════════════════════════════════

Configuração:
  VPS Host: 187.77.51.167
  VPS User: ubuntu
  Deploy Path: /var/www/condoplus
  Skip Tests: false
  Dry Run: true

════════════════════════════════════════════════════════════════════════════════
📋 FASE 1: Verificações Pré-Deployment
════════════════════════════════════════════════════════════════════════════════

▶️  Verificando conectividade SSH... [DRY RUN] ssh -o ConnectTimeout=5 ubuntu@187.77.51.167 "echo 'SSH OK'"

▶️  Verificando Node.js no VPS... [DRY RUN] ssh ubuntu@187.77.51.167 "node --version 2>/dev/null || echo 'not-found'"

▶️  Verificando PM2 no VPS... [DRY RUN] ssh ubuntu@187.77.51.167 "pm2 --version > /dev/null 2>&1"

▶️  Verificando espaço em disco... [DRY RUN] ssh ubuntu@187.77.51.167 "df /var/www/condoplus | awk 'NR==2 {print $5}' | sed 's/%//'"

════════════════════════════════════════════════════════════════════════════════
🧪 FASE 2: Testes Locais
════════════════════════════════════════════════════════════════════════════════

▶️  Testes Backend... [DRY RUN] cd backend && npm run test:ci

▶️  Testes Frontend... [DRY RUN] cd frontend && npm run test -- --run

▶️  Testes E2E... [DRY RUN] cd frontend && npm run test:e2e -- --grep 'auth'

════════════════════════════════════════════════════════════════════════════════
🔨 FASE 3: Build da Aplicação
════════════════════════════════════════════════════════════════════════════════

▶️  Build Frontend... [DRY RUN] cd frontend && npm run build

════════════════════════════════════════════════════════════════════════════════
📦 FASE 4: Deploy Backend
════════════════════════════════════════════════════════════════════════════════

▶️  Criar diretórios... [DRY RUN] ssh ubuntu@187.77.51.167 'mkdir -p /var/www/condoplus/{backend,frontend,data,logs,backups}'

▶️  Copiar código backend... [DRY RUN] scp -r backend/* ubuntu@187.77.51.167:/var/www/condoplus/backend/

▶️  Instalar dependências backend... [DRY RUN] ssh ubuntu@187.77.51.167 'cd /var/www/condoplus/backend && npm install --production'

▶️  Iniciar com PM2... [DRY RUN] Iniciaria PM2 no VPS

════════════════════════════════════════════════════════════════════════════════
🎨 FASE 5: Deploy Frontend
════════════════════════════════════════════════════════════════════════════════

▶️  Copiar build frontend... [DRY RUN] scp -r frontend/dist/* ubuntu@187.77.51.167:/var/www/condoplus/frontend/

▶️  Recarregar Nginx... [DRY RUN] Recarregaria Nginx

════════════════════════════════════════════════════════════════════════════════
✅ FASE 6: Verificação Pós-Deployment
════════════════════════════════════════════════════════════════════════════════

Health Check: [DRY RUN] Aguardaria aplicação iniciar

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

## 🔍 O que Significa [DRY RUN]

Quando você vê `[DRY RUN]` seguido de um comando, significa:

✅ **SERIA EXECUTADO:**
```bash
ssh ubuntu@187.77.51.167 "echo 'SSH OK'"
```

❌ **MAS NÃO FOI EXECUTADO**
- Nenhum SSH foi feito
- Nenhum arquivo foi copiado
- Nenhuma aplicação foi iniciada
- VPS não foi alterado

---

## 📋 Checklist: Verificar Dados do Output

Enquanto o dry-run executa, verifique:

### Configuração
```
[ ] VPS Host: 187.77.51.167 (correto?)
[ ] VPS User: ubuntu (correto?)
[ ] Deploy Path: /var/www/condoplus (correto?)
```

### Comandos SSH/SCP
```
[ ] ssh commands usam credenciais corretas?
[ ] scp paths estão corretos?
[ ] Portas estão acessíveis?
```

### Caminhos de Arquivo
```
[ ] backend/* → /var/www/condoplus/backend/ (correto?)
[ ] frontend/dist/* → /var/www/condoplus/frontend/ (correto?)
[ ] .env será criado em /var/www/condoplus/backend/ (correto?)
```

---

## ✅ Se Dry-Run Funcionar

Significado: ✅ **Tudo está configurado corretamente**

Próximos passos:

### Opção 1: Executar Deployment Real (Recomendado)
```bash
./scripts/initial-deploy.sh
# Sem a flag --dry-run
# Vai realmente fazer o deployment
```

### Opção 2: Executar com Verbose (Ver detalhes)
```bash
./scripts/initial-deploy.sh --verbose
# Mostra todo output detalhado
# Útil para debug
```

### Opção 3: Executar com Specific Steps
```bash
# Fazer manualmente passo-a-passo conforme DEPLOYMENT_STEP1.md
```

---

## ❌ Se Dry-Run Tiver Erro

### Erro: "Permission denied"
```
Significado: Script não é executável
Solução: chmod +x scripts/initial-deploy.sh
```

### Erro: "command not found: bash"
```
Significado: Bash não está disponível no seu sistema
Solução:
  • Windows: Use WSL ou Git Bash
  • Mac/Linux: Bash deveria estar disponível por padrão
```

### Erro: SSH não funciona
```
Significado: SSH key não está configurada corretamente
Solução:
  1. Verificar: ls -la ~/.ssh/github_actions
  2. Testar: ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167
  3. Ver: DEPLOYMENT_EXECUTION_PLAN.md → Troubleshooting
```

---

## 📊 Próximas Ações Baseado no Resultado

### Se Tudo Passou ✅

1. **Revisar output** do dry-run
2. **Verificar caminhos** estão corretos
3. **Executar deployment real**: `./scripts/initial-deploy.sh`
4. **Monitorar execução** (vai levar ~45 min)

### Se Teve Erro ❌

1. **Ler mensagem de erro** atentamente
2. **Consultar** DEPLOYMENT_EXECUTION_PLAN.md
3. **Tentar fix** (ex: SSH key)
4. **Executar dry-run novamente** para confirmar

---

## 🎯 Passo-a-Passo: Executar Dry-Run

### 1. Abrir Terminal/PowerShell

```bash
# Windows: PowerShell or Git Bash
# Mac: Terminal
# Linux: Terminal
```

### 2. Navegar para Projeto

```bash
cd /Users/rafas/condoplus
# ou em Windows
cd C:\Users\rafas\condoplus
```

### 3. Tornar Script Executável

```bash
chmod +x scripts/initial-deploy.sh
```

### 4. Executar Dry-Run

```bash
./scripts/initial-deploy.sh --dry-run
```

### 5. Analisar Output

Procure por:
- ✅ Sucesso em todas as verificações
- ✅ Caminhos corretos em comandos SSH/SCP
- ✅ [DRY RUN] antes de cada comando

### 6. Decidir Próximo Passo

- ✅ Se OK: `./scripts/initial-deploy.sh` (deployment real)
- ❌ Se erro: Ler e consertar conforme DEPLOYMENT_EXECUTION_PLAN.md

---

## 💡 Dicas

### Ver Output Completo
```bash
# Salvar output em arquivo para revisar depois
./scripts/initial-deploy.sh --dry-run | tee dry-run-output.txt
```

### Com Verbose Para Mais Detalhes
```bash
# Mostrar mais informações
./scripts/initial-deploy.sh --dry-run --verbose
```

### SSH Verbose (Se Houver Problemas)
```bash
# Ver detalhes da conexão SSH
./scripts/initial-deploy.sh --dry-run --verbose 2>&1 | grep -i ssh
```

---

## ✅ Checklist Dry-Run

Após executar dry-run e revisar output:

- [ ] VPS Host está correto (187.77.51.167)
- [ ] VPS User está correto (ubuntu)
- [ ] SSH commands têm caminho da chave correto
- [ ] Deploy Path está correto (/var/www/condoplus)
- [ ] SCP commands copiam arquivos certos
- [ ] Nenhum erro relacionado a configuração

Se tudo passou:
- [ ] Posso executar deployment real com confiança

---

## 🎉 Próximo Passo

Depois de verificar dry-run:

```bash
# Executar deployment REAL (se tudo OK)
./scripts/initial-deploy.sh
```

**Tempo:** ~45 minutos
**Resultado:** Backend + Frontend + Database pronto

---

**Comece o dry-run agora:**
```bash
./scripts/initial-deploy.sh --dry-run
```

Compartilhe o output se tiver dúvidas! 🚀
