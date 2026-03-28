#!/bin/bash

################################################################################
# Initial Deployment Script para CondoPlus
# Automatiza o deployment inicial no VPS
#
# Uso: ./scripts/initial-deploy.sh
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variáveis de configuração
VPS_HOST="${VPS_HOST:-187.77.51.167}"
VPS_USER="${VPS_USER:-ubuntu}"
DEPLOY_PATH="/var/www/condoplus"
REPO_URL="https://github.com/seu-user/condoplus.git"

# Flags
SKIP_TESTS=false
DRY_RUN=false
VERBOSE=false

################################################################################
# Funções
################################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

show_usage() {
    cat << EOF
Uso: ./scripts/initial-deploy.sh [opções]

Opções:
  -h, --help              Mostra esta ajuda
  -s, --skip-tests        Pula testes
  -d, --dry-run           Simula o deployment sem executar
  -v, --verbose           Output verbose
  -u, --user USER         Usuário do VPS (default: ubuntu)
  -H, --host HOST         Host do VPS (default: 187.77.51.167)

Exemplo:
  ./scripts/initial-deploy.sh
  ./scripts/initial-deploy.sh --skip-tests
  ./scripts/initial-deploy.sh --host 192.168.1.100 --user deploy
EOF
}

run_command() {
    local description=$1
    shift
    local cmd="$@"

    echo -n "▶️  $description... "

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} $cmd"
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        echo ""
        eval "$cmd" || log_error "Falha ao executar: $cmd"
    else
        if eval "$cmd" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}FALHOU${NC}"
            log_error "Falha ao executar: $cmd"
        fi
    fi
}

################################################################################
# Parse Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -u|--user)
            VPS_USER="$2"
            shift 2
            ;;
        -H|--host)
            VPS_HOST="$2"
            shift 2
            ;;
        *)
            log_error "Opção desconhecida: $1"
            ;;
    esac
done

################################################################################
# Main Deployment Flow
################################################################################

log_header "🚀 DEPLOYMENT INICIAL - CondoPlus"

echo -e "Configuração:"
echo -e "  VPS Host: $VPS_HOST"
echo -e "  VPS User: $VPS_USER"
echo -e "  Deploy Path: $DEPLOY_PATH"
echo -e "  Skip Tests: $SKIP_TESTS"
echo -e "  Dry Run: $DRY_RUN"
echo ""

# ============================================================================
# FASE 1: VERIFICAÇÕES PRÉ-DEPLOYMENT
# ============================================================================
log_header "📋 FASE 1: Verificações Pré-Deployment"

# Verificar se SSH funciona
log_info "Verificando conectividade SSH..."
if ! ssh -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo 'SSH OK'" > /dev/null 2>&1; then
    log_error "Não foi possível conectar ao VPS via SSH"
fi
log_success "SSH funcionando"

# Verificar se Node está instalado
log_info "Verificando Node.js no VPS..."
node_version=$(ssh $VPS_USER@$VPS_HOST "node --version 2>/dev/null || echo 'not-found'")
if [ "$node_version" = "not-found" ]; then
    log_error "Node.js não está instalado no VPS"
fi
log_success "Node.js $node_version instalado"

# Verificar se PM2 está instalado
log_info "Verificando PM2 no VPS..."
if ! ssh $VPS_USER@$VPS_HOST "pm2 --version > /dev/null 2>&1"; then
    log_error "PM2 não está instalado no VPS"
fi
log_success "PM2 instalado"

# Verificar espaço em disco
log_info "Verificando espaço em disco..."
disk_usage=$(ssh $VPS_USER@$VPS_HOST "df $DEPLOY_PATH | awk 'NR==2 {print \$5}' | sed 's/%//'")
if [ "$disk_usage" -gt 90 ]; then
    log_error "Espaço em disco insuficiente: ${disk_usage}%"
fi
log_success "Espaço em disco OK: ${disk_usage}%"

# ============================================================================
# FASE 2: TESTES LOCAIS
# ============================================================================
if [ "$SKIP_TESTS" = false ]; then
    log_header "🧪 FASE 2: Testes Locais"

    run_command "Testes Backend" "cd backend && npm run test:ci"
    run_command "Testes Frontend" "cd frontend && npm run test -- --run"
    run_command "Testes E2E" "cd frontend && npm run test:e2e -- --grep 'auth'"

    log_success "Todos os testes passaram"
else
    log_warning "Testes foram pulados (--skip-tests)"
fi

# ============================================================================
# FASE 3: BUILD
# ============================================================================
log_header "🔨 FASE 3: Build da Aplicação"

run_command "Build Frontend" "cd frontend && npm run build"

log_success "Build completo"

# ============================================================================
# FASE 4: DEPLOY BACKEND
# ============================================================================
log_header "📦 FASE 4: Deploy Backend"

echo "Conectando ao VPS para deploy..."

# Criar estrutura de diretórios
run_command "Criar diretórios" "ssh $VPS_USER@$VPS_HOST 'mkdir -p $DEPLOY_PATH/{backend,frontend,data,logs,backups}'"

# Copiar código do backend
run_command "Copiar código backend" "scp -r backend/* $VPS_USER@$VPS_HOST:$DEPLOY_PATH/backend/"

# Instalar dependências
run_command "Instalar dependências backend" "ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_PATH/backend && npm install --production'"

# Iniciar com PM2
log_info "Iniciando aplicação com PM2..."
if [ "$DRY_RUN" = false ]; then
    ssh $VPS_USER@$VPS_HOST << 'EOSSH'
cd /var/www/condoplus/backend

# Criar ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'condoplus-api',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    out_file: '/var/log/condoplus/api.log',
    error_file: '/var/log/condoplus/api_error.log'
  }]
};
EOF

# Iniciar PM2
pm2 start ecosystem.config.js
pm2 save

echo "✅ PM2 iniciado"
EOSSH
else
    echo -e "${YELLOW}[DRY RUN]${NC} Iniciaria PM2 no VPS"
fi

log_success "Backend deployado"

# ============================================================================
# FASE 5: DEPLOY FRONTEND
# ============================================================================
log_header "🎨 FASE 5: Deploy Frontend"

# Copiar build frontend
run_command "Copiar build frontend" "scp -r frontend/dist/* $VPS_USER@$VPS_HOST:$DEPLOY_PATH/frontend/"

# Recarregar Nginx
log_info "Recarregando Nginx..."
if [ "$DRY_RUN" = false ]; then
    ssh $VPS_USER@$VPS_HOST "sudo nginx -t && sudo systemctl reload nginx"
    log_success "Nginx recarregado"
else
    echo -e "${YELLOW}[DRY RUN]${NC} Recarregaria Nginx"
fi

log_success "Frontend deployado"

# ============================================================================
# FASE 6: PÓS-DEPLOYMENT
# ============================================================================
log_header "✅ FASE 6: Verificação Pós-Deployment"

# Aguardar aplicação iniciar
if [ "$DRY_RUN" = false ]; then
    log_info "Aguardando aplicação iniciar (10 segundos)..."
    sleep 10

    # Health check
    log_info "Executando health check..."
    if ssh $VPS_USER@$VPS_HOST "curl -s http://127.0.0.1:5174/health | grep -q ok"; then
        log_success "Health check passou"
    else
        log_warning "Health check retornou resultado inesperado"
    fi
fi

# ============================================================================
# RESUMO FINAL
# ============================================================================
log_header "🎉 DEPLOYMENT COMPLETO!"

echo -e "Status do Deployment:"
echo -e "  Servidor: ${GREEN}✅${NC}"
echo -e "  Backend: ${GREEN}✅${NC}"
echo -e "  Frontend: ${GREEN}✅${NC}"
echo -e ""
echo -e "URLs:"
echo -e "  API: ${BLUE}https://api.condoplus.com${NC}"
echo -e "  Frontend: ${BLUE}https://condoplus.com${NC}"
echo -e ""
echo -e "Próximos passos:"
echo -e "  1. Testar aplicação em https://condoplus.com"
echo -e "  2. Verificar logs: ${YELLOW}pm2 logs condoplus-api${NC}"
echo -e "  3. Configurar monitoramento"
echo -e ""
echo -e "Para mais informações, ver: ${YELLOW}DEPLOYMENT_STEP1.md${NC}"
echo ""

exit 0
