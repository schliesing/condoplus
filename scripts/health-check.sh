#!/bin/bash

################################################################################
# Health Check Script para CondoPlus
# Verifica saúde da aplicação após deployment
#
# Uso: ./scripts/health-check.sh
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
API_URL="${API_URL:-https://api.condoplus.com}"
FRONTEND_URL="${FRONTEND_URL:-https://condoplus.com}"
HEALTH_ENDPOINT="${API_URL}/health"
LOCAL_API="http://127.0.0.1:5174"

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

################################################################################
# Funções
################################################################################

log_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_url() {
    local url=$1
    local description=$2
    local expected_code=${3:-200}

    echo -n "Verificando $description... "

    response=$(curl -s -w "\n%{http_code}" -m 5 "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "$expected_code" ]; then
        log_success "$description (HTTP $http_code)"
        return 0
    else
        log_error "$description (HTTP $http_code, esperado $expected_code)"
        return 1
    fi
}

check_command() {
    local command=$1
    local description=$2

    echo -n "Verificando $description... "

    if eval "$command" > /dev/null 2>&1; then
        log_success "$description"
        return 0
    else
        log_error "$description"
        return 1
    fi
}

check_response_time() {
    local url=$1
    local description=$2
    local max_time=${3:-1000}  # ms

    echo -n "Verificando tempo de resposta de $description... "

    response=$(curl -s -w "\n%{time_total}" -m 5 "$url" 2>/dev/null || echo "0")
    time_seconds=$(echo "$response" | tail -n1)
    time_ms=$(echo "$time_seconds * 1000" | bc)

    if (( $(echo "$time_ms < $max_time" | bc -l) )); then
        log_success "$description: ${time_ms}ms (< ${max_time}ms)"
        return 0
    else
        log_warning "$description: ${time_ms}ms (> ${max_time}ms)"
        return 1
    fi
}

################################################################################
# Main Health Checks
################################################################################

log_header "🏥 HEALTH CHECK - CondoPlus"

echo -e "${YELLOW}API URL: $API_URL${NC}"
echo -e "${YELLOW}Frontend URL: $FRONTEND_URL${NC}\n"

# ============================================================================
# 1. LOCAL BACKEND CHECKS
# ============================================================================
log_header "1️⃣ BACKEND LOCAL (127.0.0.1:5174)"

check_url "$LOCAL_API/health" "Backend local (health)"
check_response_time "$LOCAL_API/health" "Backend local" 500

# ============================================================================
# 2. PRODUCTION BACKEND CHECKS
# ============================================================================
log_header "2️⃣ BACKEND PRODUCTION (HTTPS)"

check_url "$HEALTH_ENDPOINT" "Backend production (health)"
check_response_time "$HEALTH_ENDPOINT" "Backend production" 1000

# ============================================================================
# 3. FRONTEND CHECKS
# ============================================================================
log_header "3️⃣ FRONTEND"

check_url "$FRONTEND_URL" "Frontend (index.html)"
check_response_time "$FRONTEND_URL" "Frontend" 2000

# ============================================================================
# 4. SSL/HTTPS CHECKS
# ============================================================================
log_header "4️⃣ SSL/HTTPS"

echo -n "Verificando certificado SSL (API)... "
if echo | openssl s_client -servername api.condoplus.com -connect api.condoplus.com:443 2>/dev/null | grep -q "Verify return code: 0"; then
    log_success "Certificado SSL válido (API)"
else
    log_warning "Certificado SSL inválido ou auto-assinado (API)"
fi

echo -n "Verificando certificado SSL (Frontend)... "
if echo | openssl s_client -servername condoplus.com -connect condoplus.com:443 2>/dev/null | grep -q "Verify return code: 0"; then
    log_success "Certificado SSL válido (Frontend)"
else
    log_warning "Certificado SSL inválido ou auto-assinado (Frontend)"
fi

# ============================================================================
# 5. PROCESS CHECKS
# ============================================================================
log_header "5️⃣ PROCESSOS"

echo -n "Verificando PM2 (condoplus-api)... "
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "condoplus-api.*online"; then
        log_success "PM2 rodando (condoplus-api online)"
    else
        log_error "PM2 status: $(pm2 list | grep condoplus-api || echo 'não encontrado')"
    fi
else
    log_error "PM2 não instalado"
fi

echo -n "Verificando Nginx... "
if sudo systemctl is-active --quiet nginx; then
    log_success "Nginx rodando"
else
    log_error "Nginx não está rodando"
fi

# ============================================================================
# 6. SYSTEM RESOURCES
# ============================================================================
log_header "6️⃣ RECURSOS DO SISTEMA"

echo -n "Verificando espaço em disco... "
disk_usage=$(df /var/www/condoplus | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    log_success "Espaço em disco: ${disk_usage}% (< 80%)"
else
    log_warning "Espaço em disco: ${disk_usage}% (> 80%)"
fi

echo -n "Verificando memória... "
memory_usage=$(free | grep Mem | awk '{printf "%.0f", ($3/$2)*100}')
if [ "$memory_usage" -lt 70 ]; then
    log_success "Memória: ${memory_usage}% (< 70%)"
else
    log_warning "Memória: ${memory_usage}% (> 70%)"
fi

echo -n "Verificando load average... "
load=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)
log_success "Load average: $load"

# ============================================================================
# 7. DATABASE CHECKS
# ============================================================================
log_header "7️⃣ DATABASE"

DB_FILE="/var/www/condoplus/data/condoplus.db"

echo -n "Verificando arquivo de banco de dados... "
if [ -f "$DB_FILE" ]; then
    db_size=$(ls -lh "$DB_FILE" | awk '{print $5}')
    log_success "Database existe ($db_size)"
else
    log_error "Database não encontrado ($DB_FILE)"
fi

echo -n "Verificando integridade do banco de dados... "
if command -v sqlite3 &> /dev/null; then
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_success "Integridade do database: OK"
    else
        log_error "Integridade do database: FALHOU"
    fi
else
    log_warning "SQLite3 não instalado (não foi possível verificar integridade)"
fi

# ============================================================================
# 8. LOGS CHECKS
# ============================================================================
log_header "8️⃣ LOGS"

echo -n "Verificando logs da API... "
if [ -f "/var/log/condoplus/api.log" ]; then
    errors=$(grep -c "ERROR\|error" /var/log/condoplus/api.log | head -1 || echo "0")
    if [ "$errors" -eq 0 ]; then
        log_success "Logs da API: sem erros"
    else
        log_warning "Logs da API: $errors erro(s) detectado(s)"
    fi
else
    log_warning "Arquivo de log não encontrado"
fi

echo -n "Verificando logs do Nginx... "
if [ -f "/var/log/nginx/error.log" ]; then
    errors=$(grep -c "error" /var/log/nginx/error.log | head -1 || echo "0")
    if [ "$errors" -eq 0 ]; then
        log_success "Logs do Nginx: sem erros"
    else
        log_warning "Logs do Nginx: $errors erro(s) detectado(s)"
    fi
else
    log_warning "Arquivo de log não encontrado"
fi

# ============================================================================
# 9. BACKUP CHECKS
# ============================================================================
log_header "9️⃣ BACKUP"

echo -n "Verificando pasta de backup... "
if [ -d "/var/www/condoplus/backups" ]; then
    backup_count=$(ls /var/www/condoplus/backups/*.db 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 0 ]; then
        log_success "Backups encontrados: $backup_count"
    else
        log_warning "Nenhum backup encontrado"
    fi
else
    log_error "Pasta de backup não existe"
fi

# ============================================================================
# SUMMARY
# ============================================================================

log_header "📊 RESUMO DO HEALTH CHECK"

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "${GREEN}✅ Passou:${NC}  $PASSED"
echo -e "${YELLOW}⚠️  Avisos:${NC}  $WARNINGS"
echo -e "${RED}❌ Falhou:${NC}  $FAILED"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "📈 Total:   $TOTAL"

# Exit code baseado em resultados
if [ "$FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}✅ HEALTH CHECK PASSED!${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ HEALTH CHECK FAILED!${NC}\n"
    exit 1
fi
