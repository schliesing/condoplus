# Deployment Quick Reference

Guia rápido com os comandos mais importantes para deployment de CondoPlus.

## 🚀 Deploy Automático (Recomendado)

```bash
# Tornar script executável
chmod +x scripts/initial-deploy.sh

# Executar deployment automático
./scripts/initial-deploy.sh

# Ou com opções
./scripts/initial-deploy.sh --skip-tests --verbose
```

## 🔄 Deploy Manual (Passo-a-Passo)

### 1. Preparar Local

```bash
# Instalar dependências
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Rodar testes
npm run test:backend
npm run test:frontend
npm run test:e2e

# Build frontend
cd frontend && npm run build && cd ..
```

### 2. SSH para VPS

```bash
ssh ubuntu@187.77.51.167
# Ou com chave
ssh -i ~/.ssh/github_actions ubuntu@187.77.51.167
```

### 3. Preparar VPS

```bash
# Ir para diretório de deploy
cd /var/www/condoplus

# Criar estrutura
mkdir -p backend frontend data logs backups
```

### 4. Deploy Backend

```bash
# De seu computador, copiar backend
scp -r backend/* ubuntu@187.77.51.167:/var/www/condoplus/backend/

# SSH para VPS
ssh ubuntu@187.77.51.167 << 'EOF'
cd /var/www/condoplus/backend

# Instalar dependências
npm install --production

# Criar/Atualizar .env
cat > .env << 'ENV'
NODE_ENV=production
DATABASE_URL=sqlite:/var/www/condoplus/data/condoplus.db
JWT_SECRET=seu-jwt-secret-aqui
API_PORT=5174
CORS_ORIGIN=https://condoplus.com
LOG_LEVEL=info
ENV

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
EOF
```

### 5. Deploy Frontend

```bash
# De seu computador, copiar frontend build
scp -r frontend/dist/* ubuntu@187.77.51.167:/var/www/condoplus/frontend/

# SSH para VPS
ssh ubuntu@187.77.51.167 << 'EOF'
# Recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx
EOF
```

### 6. Verificação

```bash
# Health check local
curl http://127.0.0.1:5174/health | jq .

# Health check production
curl https://api.condoplus.com/health | jq .

# Testes
curl https://condoplus.com
```

---

## 📊 Health Check

```bash
# Executar health check automático
chmod +x scripts/health-check.sh
./scripts/health-check.sh

# Ou manualmente via SSH
ssh ubuntu@187.77.51.167 << 'EOF'
echo "🔍 API Health:"
curl -s http://127.0.0.1:5174/health | jq .

echo ""
echo "🔍 PM2 Status:"
pm2 status

echo ""
echo "🔍 Nginx Status:"
sudo systemctl status nginx

echo ""
echo "🔍 Disk Space:"
df -h /var/www/condoplus

echo ""
echo "🔍 Memory:"
free -h

echo ""
echo "🔍 Process:"
ps aux | grep node
EOF
```

---

## 🔄 Reiniciar Serviços

```bash
# Via SSH
ssh ubuntu@187.77.51.167

# Reiniciar API
pm2 restart condoplus-api

# Ver logs
pm2 logs condoplus-api

# Recarregar Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🗄️ Database

```bash
# Via SSH
ssh ubuntu@187.77.51.167

# Acessar banco de dados
sqlite3 /var/www/condoplus/data/condoplus.db

# Ver tabelas
.tables

# Ver schema
.schema usuarios

# Contar registros
SELECT COUNT(*) FROM usuarios;

# Sair
.quit

# Fazer backup
/var/www/condoplus/backup.sh

# Ver backups
ls -la /var/www/condoplus/backups/
```

---

## 📊 Logs

```bash
# API logs (últimas 100 linhas)
pm2 logs condoplus-api --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo tail -f /var/log/syslog

# Grep por erro
grep -i error /var/log/condoplus/api.log
```

---

## 🔒 Firewall

```bash
# Ver status
sudo ufw status

# Abrir porta (http)
sudo ufw allow 80/tcp

# Abrir porta (https)
sudo ufw allow 443/tcp

# Abrir porta (ssh)
sudo ufw allow 22/tcp

# Recarregar
sudo ufw reload
```

---

## 📦 Backup & Restore

```bash
# Fazer backup manualmente
/var/www/condoplus/backup.sh

# Ver backups
ls -la /var/www/condoplus/backups/

# Parar API
pm2 stop condoplus-api

# Restaurar backup
cp /var/www/condoplus/backups/backup_YYYYMMDD_HHMMSS.db \
   /var/www/condoplus/data/condoplus.db

# Reiniciar API
pm2 start condoplus-api
```

---

## 🔧 Troubleshooting

### Port already in use

```bash
# Ver o que está usando a porta
sudo lsof -i :5174
sudo lsof -i :80
sudo lsof -i :443

# Matar processo
kill -9 PID
```

### Database locked

```bash
# Parar API
pm2 stop condoplus-api

# Aguardar
sleep 5

# Reiniciar
pm2 start condoplus-api
```

### CORS errors

```bash
# Verificar CORS_ORIGIN em .env
cat /var/www/condoplus/backend/.env | grep CORS

# Deve ser igual ao frontend URL
# CORS_ORIGIN=https://condoplus.com

# Reiniciar
pm2 restart condoplus-api
```

### Out of memory

```bash
# Ver memória
free -h

# Ver uso por processo
top -b -n 1 | head -20

# Reiniciar API
pm2 restart condoplus-api

# Aumentar memory limit em ecosystem.config.js:
# max_memory_restart: '1G'
```

---

## 📊 Performance Check

```bash
# Teste de carga simples (10 requisições, concorrência 2)
ab -n 10 -c 2 https://api.condoplus.com/health

# Teste mais completo (100 requisições, concorrência 5)
ab -n 100 -c 5 https://api.condoplus.com/health

# Resultado esperado:
# Requests per second: > 100
# Time per request: < 100ms
```

---

## 📋 Checklist Pós-Deploy

- [ ] SSH acesso funcionando
- [ ] API respondendo em http://127.0.0.1:5174
- [ ] API respondendo em https://api.condoplus.com
- [ ] Frontend carregando em https://condoplus.com
- [ ] HTTPS certificado válido
- [ ] PM2 rodando (pm2 status)
- [ ] Nginx rodando (sudo systemctl status nginx)
- [ ] Database acessível
- [ ] Logs gerando
- [ ] Backup agendado (crontab -e)
- [ ] Monitoramento configurado

---

## 🎯 GitHub Actions Deployment

```bash
# GitHub Actions fará deployment automático quando:
# 1. Fazer push para main
# 2. Testes passarem (test.yml)
# 3. Deploy ser acionado (deploy.yml)

# Checar status em:
# https://github.com/seu-user/condoplus/actions

# Aprovar deploy:
# GitHub Actions faz automaticamente após testes
```

---

## 🔗 URLs Importantes

- **API**: https://api.condoplus.com
- **Frontend**: https://condoplus.com
- **GitHub Actions**: https://github.com/seu-user/condoplus/actions
- **VPS SSH**: ssh ubuntu@187.77.51.167

---

## 📞 Suporte Rápido

| Problema | Comando |
|----------|---------|
| API não responde | `pm2 status` → `pm2 restart condoplus-api` |
| Frontend não carrega | `sudo systemctl reload nginx` |
| Port already in use | `sudo lsof -i :PORT` → `kill -9 PID` |
| Database locked | `pm2 stop condoplus-api` → wait 5s → `pm2 start` |
| CORS error | Verificar CORS_ORIGIN em .env |
| Memory issue | `free -h` → `pm2 restart condoplus-api` |
| Disk full | `df -h` → limpar backups antigos |
| SSL error | `sudo certbot renew` |

---

**Versão:** 1.0
**Última atualização:** 2026-03-27
**Status:** Pronto para uso
