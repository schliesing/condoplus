# Step 1: Deployment Inicial - Guia Passo-a-Passo

Guia completo para fazer o deployment inicial da aplicação CondoPlus no VPS 187.77.51.167.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Fase 1: Preparação Local](#fase-1-preparação-local)
- [Fase 2: Preparação VPS](#fase-2-preparação-vps)
- [Fase 3: Deploy Backend](#fase-3-deploy-backend)
- [Fase 4: Deploy Frontend](#fase-4-deploy-frontend)
- [Fase 5: Verificação Pós-Deploy](#fase-5-verificação-pós-deploy)
- [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

Antes de começar, verifique:

### Localmente (seu computador)
- [ ] Git instalado e configurado
- [ ] Node 18+ instalado
- [ ] npm ou yarn funcionando
- [ ] Acesso SSH ao repositório GitHub

### VPS (187.77.51.167)
- [ ] SSH acesso configurado
- [ ] Node 18+ instalado
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado
- [ ] SSL/HTTPS certificado (Let's Encrypt)
- [ ] Firewall configurado (porta 22, 80, 443)
- [ ] Diretórios /var/www/condoplus criados
- [ ] Usuário deploy com permissões sudoers

### GitHub
- [ ] Secrets configurados (VPS_HOST, VPS_SSH_KEY, etc)
- [ ] Branch protection ativo em 'main'
- [ ] SSH key adicionada ao authorized_keys do VPS

---

## **Fase 1: Preparação Local**

### Passo 1.1: Clonar e Verificar Repositório

```bash
# Clonar repositório
git clone https://github.com/seu-user/condoplus.git
cd condoplus

# Verificar branches
git branch -a

# Verificar status
git status
```

### Passo 1.2: Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Passo 1.3: Executar Testes Localmente

```bash
# Backend tests
cd backend
npm run test:ci

# Frontend tests
cd ../frontend
npm run test

# E2E tests
npm run test:e2e
```

**Se algum teste falhar, não prosseguir com deployment!**

### Passo 1.4: Build Frontend

```bash
cd frontend
npm run build

# Verificar se dist/ foi criado
ls -la dist/
```

### Passo 1.5: Preparar Arquivo .env.production

```bash
# Na raiz do projeto, criar .env.production
cat > .env.production << 'EOF'
# Backend
NODE_ENV=production
DATABASE_URL=sqlite:/var/www/condoplus/data/condoplus.db
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_PORT=5174
API_URL=https://api.condoplus.com
CORS_ORIGIN=https://condoplus.com
LOG_LEVEL=info
LOG_DIR=/var/log/condoplus

# Frontend
VITE_API_URL=https://api.condoplus.com
VITE_APP_NAME=CondoPlus
VITE_APP_VERSION=1.0.0
EOF

# Não commitar este arquivo!
echo ".env.production" >> .gitignore
git add .gitignore
git commit -m "chore: add .env.production to gitignore"
```

---

## **Fase 2: Preparação VPS**

### Passo 2.1: SSH para o VPS

```bash
# SSH com sua chave
ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167

# Ou
ssh ubuntu@187.77.51.167
```

### Passo 2.2: Verificar Sistema

```bash
# Verificar Node
node --version   # v18.x.x
npm --version    # 9.x.x

# Verificar PM2
pm2 --version

# Verificar Nginx
sudo systemctl status nginx

# Verificar espaço em disco
df -h /var/www/condoplus
# Mínimo 5GB livre

# Verificar memória
free -h
# Mínimo 1GB livre
```

### Passo 2.3: Preparar Diretórios

```bash
# Navegar para diretório de deploy
cd /var/www/condoplus

# Criar estrutura de diretórios
sudo mkdir -p backend
sudo mkdir -p frontend
sudo mkdir -p data
sudo mkdir -p logs
sudo mkdir -p backups

# Definir permissões
sudo chown -R $USER:$USER /var/www/condoplus
chmod -R 755 /var/www/condoplus
```

### Passo 2.4: Inicializar Repositório Git

```bash
cd /var/www/condoplus

# Se for primeira vez
git init
git config user.email "deploy@condoplus.com"
git config user.name "Deploy Bot"

# Adicionar remote
git remote add origin https://github.com/seu-user/condoplus.git

# Buscar código
git fetch origin main
git checkout origin/main -- .
```

### Passo 2.5: Criar .env do Backend

```bash
cd /var/www/condoplus/backend

cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=sqlite:/var/www/condoplus/data/condoplus.db
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_PORT=5174
CORS_ORIGIN=https://condoplus.com
LOG_LEVEL=info
EOF

chmod 600 .env

# Verificar
cat .env
```

### Passo 2.6: Criar Banco de Dados

```bash
cd /var/www/condoplus/backend

# Instalar dependências
npm install --production

# Executar migrations (se houver)
npm run migrate || echo "Sem migrations"

# Verificar se DB foi criado
ls -la /var/www/condoplus/data/
```

---

## **Fase 3: Deploy Backend**

### Passo 3.1: Instalar Dependências Backend

```bash
cd /var/www/condoplus/backend

# Install com --production para reduzir tamanho
npm install --production

# Verificar instalação
ls -la node_modules/ | head -20
```

### Passo 3.2: Iniciar com PM2

```bash
cd /var/www/condoplus/backend

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'condoplus-api',
    script: './src/server.js',
    cwd: '/var/www/condoplus/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    out_file: '/var/log/condoplus/api.log',
    error_file: '/var/log/condoplus/api_error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status
pm2 logs condoplus-api
```

### Passo 3.3: Habilitar Startup Automático

```bash
# Setup PM2 para iniciar com o sistema
pm2 startup

# Salvar configuração
pm2 save
```

### Passo 3.4: Verificar Saúde da API

```bash
# Esperar 5 segundos para API iniciar
sleep 5

# Health check local
curl -s http://127.0.0.1:5174/health | jq .

# Verificar logs
pm2 logs condoplus-api --lines 50
```

---

## **Fase 4: Deploy Frontend**

### Passo 4.1: Copiar Build Frontend

```bash
# No seu computador local
cd condoplus/frontend

# Copiar dist/ para VPS
scp -r dist/* ubuntu@187.77.51.167:/var/www/condoplus/frontend/

# Ou via SCP toda a pasta
scp -r dist/ ubuntu@187.77.51.167:/var/www/condoplus/frontend-new
ssh ubuntu@187.77.51.167 "rm -rf /var/www/condoplus/frontend && mv /var/www/condoplus/frontend-new/dist /var/www/condoplus/frontend"
```

### Passo 4.2: Configurar Nginx

```bash
# Verificar config do Nginx (deve estar pronto do VPS_DEPLOYMENT_SETUP.md)
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

### Passo 4.3: Verificar Arquivo Index.html

```bash
# Verificar se index.html existe
ls -la /var/www/condoplus/frontend/index.html

# Verificar conteúdo
head -20 /var/www/condoplus/frontend/index.html
```

---

## **Fase 5: Verificação Pós-Deploy**

### Passo 5.1: Health Check da API

```bash
# Teste 1: Health endpoint local
curl -s http://127.0.0.1:5174/health | jq .

# Deve retornar:
# {
#   "status": "ok",
#   "timestamp": "2026-03-27T12:00:00Z",
#   "uptime": 123.45
# }
```

### Passo 5.2: Teste HTTPS

```bash
# Teste 2: Health endpoint HTTPS
curl -s https://api.condoplus.com/health | jq .

# Deve retornar 200 OK

# Teste 3: Frontend HTTPS
curl -s https://condoplus.com | head -20

# Deve retornar HTML do índice
```

### Passo 5.3: Testes de Conectividade

```bash
# Teste 4: Testar login endpoint
curl -X POST https://api.condoplus.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123",
    "condominios_id": 1
  }' 2>/dev/null | jq .

# Esperado: erro 401 (credenciais inválidas) ou 200 (se dados existirem)
```

### Passo 5.4: Verificar Logs

```bash
# Logs da API
pm2 logs condoplus-api --lines 100

# Logs do Nginx (access)
sudo tail -f /var/log/nginx/access.log | grep condoplus

# Logs do Nginx (error)
sudo tail -f /var/log/nginx/error.log
```

### Passo 5.5: Teste de Carga Simples

```bash
# Instalar Apache Bench (se não tiver)
sudo apt install -y apache2-utils

# Teste de 10 requisições com concorrência 2
ab -n 10 -c 2 https://api.condoplus.com/health

# Verificar tempo de resposta
# Esperado: < 100ms
```

### Passo 5.6: Verificar Banco de Dados

```bash
# Conectar ao SQLite
sqlite3 /var/www/condoplus/data/condoplus.db

# Ver tabelas
.tables

# Ver schema de uma tabela
.schema usuarios

# Contar registros
SELECT COUNT(*) as total FROM usuarios;

# Sair
.quit
```

---

## **Fase 6: Testes de Funcionalidade**

### Teste 1: Autenticação

1. Abrir https://condoplus.com
2. Fazer login com credenciais de teste
3. Verificar se dashboard carrega
4. Verificar se token JWT está em localStorage

### Teste 2: Operação Crítica

1. Navegar para votações
2. Verifica se lista carrega
3. Verificar se paginação funciona
4. Verificar se filtros funcionam

### Teste 3: Performance

1. Abrir DevTools (F12)
2. Ir para Network
3. Recarregar página
4. Verificar:
   - Load time < 3 segundos
   - Tamanho de bundle < 500KB
   - Nenhum erro 404/500

---

## **Fase 7: Backup Inicial**

```bash
# Fazer backup do banco de dados
/var/www/condoplus/backup.sh

# Verificar backup criado
ls -la /var/www/condoplus/backups/

# Agendar backup (se não feito no VPS_DEPLOYMENT_SETUP)
crontab -e
# Adicionar: 0 2 * * * /var/www/condoplus/backup.sh >> /var/log/condoplus/backup.log 2>&1
```

---

## **Checklist Final**

### ✅ Backend
- [ ] API respondendo em http://127.0.0.1:5174
- [ ] API respondendo em https://api.condoplus.com
- [ ] Health check retorna 200
- [ ] PM2 rodando com status 'online'
- [ ] Logs sendo gerados corretamente
- [ ] Banco de dados acessível

### ✅ Frontend
- [ ] Frontend carregando em https://condoplus.com
- [ ] Bundle otimizado (< 500KB)
- [ ] Sem erros de CORS
- [ ] Assets carregando (CSS, JS, imagens)
- [ ] Responsividade funcionando (mobile)

### ✅ Performance
- [ ] Load time < 3 segundos
- [ ] API response time < 100ms
- [ ] CPU < 50%
- [ ] Memória < 300MB

### ✅ Segurança
- [ ] HTTPS funcionando
- [ ] Certificado válido
- [ ] Sem certificado self-signed
- [ ] Headers de segurança presentes

### ✅ Operacional
- [ ] PM2 startup automático configurado
- [ ] Backup automático agendado
- [ ] Nginx reload automático
- [ ] Logs funcionando
- [ ] Monitoramento pronto para Step 2

---

## 🐛 Troubleshooting

### Erro: "Connection refused" na porta 5174

```bash
# Verificar se PM2 iniciou
pm2 status

# Se offline, verificar logs
pm2 logs condoplus-api

# Reiniciar
pm2 restart condoplus-api

# Checker porta
sudo netstat -tlnp | grep 5174
```

### Erro: "Port 80/443 already in use"

```bash
# Ver quem está usando a porta
sudo lsof -i :80
sudo lsof -i :443

# Se for outro Nginx, parar
sudo systemctl stop nginx

# Se for outra aplicação, parar e remover
```

### Erro: "Database locked"

```bash
# Verificar processos SQLite
ps aux | grep sqlite

# Parar API
pm2 stop condoplus-api

# Aguardar 5 segundos
sleep 5

# Reiniciar
pm2 start condoplus-api
```

### Erro: CORS bloqueando requisições

```bash
# Verificar CORS_ORIGIN em .env
cat /var/www/condoplus/backend/.env | grep CORS

# Deve estar igual ao frontend URL
# CORS_ORIGIN=https://condoplus.com

# Reiniciar API
pm2 restart condoplus-api
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `pm2 logs condoplus-api`
2. Verificar status: `pm2 status`
3. Verificar saúde: `curl https://api.condoplus.com/health`
4. Verificar rede: `sudo netstat -tlnp`
5. Verificar disco: `df -h`

---

## ✅ Sucesso!

Se chegou até aqui com todos os checkboxes ✅, o deployment foi bem-sucesso!

**Próximo passo:** Step 2 - Monitoramento em Tempo Real

---

**Versão:** 1.0
**Data:** 2026-03-27
**Status:** Pronto para deployment
