# VPS Deployment Setup - CondoPlus

Guia completo para configurar o servidor VPS (187.77.51.167) para receber deployments automáticos do GitHub Actions.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Instalação do Sistema](#instalação-do-sistema)
- [Configuração de SSH](#configuração-de-ssh)
- [Instalação de Dependências](#instalação-de-dependências)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Configuração do Nginx](#configuração-do-nginx)
- [PM2 e Gerenciamento](#pm2-e-gerenciamento)
- [Backup e Restauração](#backup-e-restauração)
- [Monitoramento](#monitoramento)
- [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

- **OS:** Ubuntu 22.04 LTS (ou similar)
- **RAM:** 2GB mínimo, 4GB recomendado
- **Armazenamento:** 20GB mínimo, 50GB recomendado
- **CPU:** 2 cores mínimo
- **IP:** 187.77.51.167
- **Portas abertas:** 80 (HTTP), 443 (HTTPS), 22 (SSH)

---

## 🔧 Instalação do Sistema

### 1. Atualizar Sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. Instalar Node.js 18

```bash
# Usar NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version   # v18.x.x
npm --version    # 9.x.x
```

### 3. Instalar PM2 Globalmente

```bash
sudo npm install -g pm2
pm2 startup
pm2 save

# Verificar
pm2 list
```

### 4. Instalar Nginx

```bash
sudo apt install -y nginx

# Iniciar e habilitar
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar
sudo systemctl status nginx
```

### 5. Instalar SQLite3

```bash
sudo apt install -y sqlite3 libsqlite3-dev

# Verificar
sqlite3 --version
```

### 6. Instalar Certbot (SSL/HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot certonly --nginx -d condoplus.com -d api.condoplus.com
```

---

## 🔐 Configuração de SSH

### 1. Criar Usuário Dedidcado (Opcional)

```bash
# Criar usuário
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Mudar para usuário
su - deploy
```

### 2. Configurar Chave SSH do GitHub

```bash
# Criar diretório .ssh
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Adicionar chave pública do GitHub Actions
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFP... github-actions" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Verificar
cat ~/.ssh/authorized_keys
```

### 3. Configurar SSH Keys (Local)

```bash
# No seu computador local
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
# Pressionar Enter sem passphrase

# Copiar chave privada
cat ~/.ssh/github_actions
# → Colar em GitHub > Settings > Secrets > VPS_SSH_KEY

# Copiar chave pública para VPS
ssh-copy-id -f -i ~/.ssh/github_actions.pub ubuntu@187.77.51.167
# Ou manualmente:
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 4. Testar Conexão

```bash
# Do seu computador
ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167 "echo 'Conexão OK'"
```

---

## 📦 Instalação de Dependências

### 1. Criar Estrutura de Diretórios

```bash
# Criar diretórios
sudo mkdir -p /var/www/condoplus
sudo mkdir -p /var/www/condoplus/backend
sudo mkdir -p /var/www/condoplus/frontend
sudo mkdir -p /var/www/condoplus/data
sudo mkdir -p /var/www/condoplus/backups
sudo mkdir -p /var/log/condoplus

# Definir permissões
sudo chown -R $USER:$USER /var/www/condoplus
sudo chown -R $USER:$USER /var/log/condoplus
chmod -R 755 /var/www/condoplus
```

### 2. Clonar Repositório

```bash
cd /var/www/condoplus
git clone https://github.com/seu-user/condoplus.git .

# Ou configurar para deploy manual
cd /var/www/condoplus
git init
git config receive.denyCurrentBranch updateInstead
```

### 3. Instalar Dependências Backend

```bash
cd /var/www/condoplus/backend
npm install --production

# Criar arquivo .env
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=sqlite:/var/www/condoplus/data/condoplus.db
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_PORT=5174
CORS_ORIGIN=https://condoplus.com
LOG_LEVEL=info
EOF

chmod 600 .env
```

### 4. Criar Banco de Dados

```bash
cd /var/www/condoplus/backend
npm run migrate  # ou comando similar de seu projeto
```

---

## 📁 Estrutura de Diretórios

```
/var/www/condoplus/
├── backend/                    # Código do backend
│   ├── src/
│   ├── package.json
│   ├── .env                    # ⚠️ Arquivo crítico - não commitar
│   └── node_modules/
├── frontend/                   # Build do frontend
│   ├── dist/                   # Arquivos estáticos (HTML, CSS, JS)
│   └── index.html
├── data/                       # Dados
│   ├── condoplus.db           # Banco de dados SQLite
│   └── uploads/               # Uploads de usuários
├── backups/                    # Backups automáticos
│   ├── backup_20260327_120000.db
│   └── backup_20260326_120000.db
└── logs/                       # Logs
    ├── api.log
    └── nginx.log
```

---

## 🌐 Configuração do Nginx

### 1. Criar Virtual Host para API

```bash
sudo cat > /etc/nginx/sites-available/condoplus-api << 'EOF'
upstream api_backend {
    server 127.0.0.1:5174;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.condoplus.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.condoplus.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.condoplus.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.condoplus.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/condoplus/api_access.log;
    error_log /var/log/condoplus/api_error.log;

    # Proxy settings
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/condoplus-api /etc/nginx/sites-enabled/
```

### 2. Criar Virtual Host para Frontend

```bash
sudo cat > /etc/nginx/sites-available/condoplus-frontend << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name condoplus.com www.condoplus.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name condoplus.com www.condoplus.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/condoplus.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/condoplus.com/privkey.pem;

    # Root directory
    root /var/www/condoplus/frontend;
    index index.html;

    # Logging
    access_log /var/log/condoplus/frontend_access.log;
    error_log /var/log/condoplus/frontend_error.log;

    # Cache for static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass https://api.condoplus.com/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/condoplus-frontend /etc/nginx/sites-enabled/
```

### 3. Verificar e Recarregar Nginx

```bash
# Teste de sintaxe
sudo nginx -t

# Recarregar
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

---

## 🚀 PM2 e Gerenciamento de Processos

### 1. Criar Arquivo de Configuração PM2

```bash
cat > /var/www/condoplus/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
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
      watch: false,
      ignore_watch: ['node_modules', 'data', 'logs'],
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
```

### 2. Iniciar Aplicação

```bash
# Navegar até o diretório
cd /var/www/condoplus

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Habilitar startup
pm2 startup
pm2 save

# Listar processos
pm2 list
pm2 logs condoplus-api
```

### 3. Monitorar Aplicação

```bash
# Ver status em tempo real
pm2 monit

# Ver últimos logs
pm2 logs condoplus-api --lines 100

# Reiniciar aplicação
pm2 restart condoplus-api

# Parar aplicação
pm2 stop condoplus-api

# Deletar processo
pm2 delete condoplus-api
```

---

## 💾 Backup e Restauração

### 1. Script de Backup Automático

```bash
cat > /var/www/condoplus/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/www/condoplus/backups"
DB_FILE="/var/www/condoplus/data/condoplus.db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Criar backup
mkdir -p $BACKUP_DIR
sqlite3 $DB_FILE ".backup $BACKUP_DIR/backup_${TIMESTAMP}.db"

echo "✅ Backup criado: backup_${TIMESTAMP}.db"

# Deletar backups antigos
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete
echo "🧹 Backups antigos deletados"

# Comprimir backups (opcional)
# gzip $BACKUP_DIR/backup_${TIMESTAMP}.db
EOF

chmod +x /var/www/condoplus/backup.sh
```

### 2. Agendar Backup com Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário à meia-noite
0 0 * * * /var/www/condoplus/backup.sh >> /var/log/condoplus/backup.log 2>&1

# Ou a cada 6 horas
0 */6 * * * /var/www/condoplus/backup.sh >> /var/log/condoplus/backup.log 2>&1
```

### 3. Restaurar a partir de Backup

```bash
# Parar aplicação
pm2 stop condoplus-api

# Copiar backup
cp /var/www/condoplus/backups/backup_YYYYMMDD_HHMMSS.db \
   /var/www/condoplus/data/condoplus.db

# Reiniciar aplicação
pm2 start condoplus-api

# Verificar logs
pm2 logs condoplus-api
```

---

## 📊 Monitoramento

### 1. Verificar Status da Aplicação

```bash
# PM2 status
pm2 status

# Health check
curl https://api.condoplus.com/health

# Nginx status
sudo systemctl status nginx

# Espaço em disco
df -h /var/www/condoplus

# Memória
free -h

# CPU
top -b -n 1 | head -20
```

### 2. Ver Logs

```bash
# Últimas linhas
pm2 logs condoplus-api --lines 50

# Tempo real
pm2 logs condoplus-api

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 3. Monitoramento Contínuo

```bash
# Instalar monit
sudo apt install -y monit

# Configurar monit para reiniciar aplicação se cair
sudo systemctl start monit
sudo systemctl enable monit
```

---

## 🐛 Troubleshooting

### Porta 5174 não está acessível

```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar se porta está listening
sudo netstat -tlnp | grep 5174

# Verificar firewall
sudo ufw status
sudo ufw allow 5174/tcp
```

### Nginx retorna 502 Bad Gateway

```bash
# Verificar backend
curl http://127.0.0.1:5174

# Verificar logs
pm2 logs condoplus-api
sudo tail -f /var/log/nginx/error.log

# Verificar Nginx config
sudo nginx -t
```

### Banco de dados locked

```bash
# Ver processos
ps aux | grep sqlite

# Parar aplicação e reiniciar
pm2 stop condoplus-api
pm2 start condoplus-api
```

### Espaço em disco cheio

```bash
# Ver espaço
df -h

# Limpar backups antigos
rm -f /var/www/condoplus/backups/backup_*.db

# Limpar logs
truncate -s 0 /var/log/condoplus/*.log
```

---

## ✅ Checklist Final

- [ ] OS atualizado
- [ ] Node 18+ instalado
- [ ] PM2 instalado e configurado
- [ ] Nginx instalado
- [ ] SSL/HTTPS certificado
- [ ] SSH key configurada
- [ ] Diretórios criados
- [ ] Banco de dados criado
- [ ] Aplicação rodando em PM2
- [ ] Nginx configurado
- [ ] Backup script criado
- [ ] Firewall configurado
- [ ] Monitoramento configurado

---

## 📞 Referências

- [Node.js Installation](https://nodejs.org/en/download/package-manager/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)

---

**Versão:** 1.0
**Data:** 2026-03-27
**Host:** 187.77.51.167
