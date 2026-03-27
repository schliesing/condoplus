# CondoPlus Backend

API REST para gerenciamento multi-tenant de condomínios.

## 🚀 Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=condoplus
JWT_SECRET=sua_chave_secreta_super_segura
```

### 3. Criar banco de dados PostgreSQL

```bash
createdb condoplus
```

### 4. Executar migrações

```bash
npm run migrate
```

### 5. Popular com dados de teste

```bash
npm run seed
```

## 🏃 Executar

### Desenvolvimento (com hot-reload)

```bash
npm run dev
```

### Produção

```bash
npm start
```

## 📚 Arquitetura

### Multi-tenant com Schema-per-tenant

- **Schema público**: Dados globais (Root, condominios, fornecedores globais)
- **Schemas por condomínio**: `condo_001`, `condo_002`, etc.
  - Cada schema tem suas tabelas isoladas: users, votacoes, agendamentos, etc.
  - Máxima segurança e isolamento de dados

### Estrutura de Pastas

```
src/
├── config/          # Configuração de banco de dados
├── middleware/      # Autenticação, autorização, audit
├── routes/          # Rotas da API
├── services/        # Lógica de negócio
├── models/          # Schema SQL
├── scripts/         # Migrações e seeds
└── server.js        # Servidor Express
```

## 🔐 Autenticação

- JWT token-based
- Roles: `root` (global), `admin` (por condomínio), `morador`
- Headers necessários:
  - `Authorization: Bearer <token>`
  - `X-Condo-Schema: condo_001`

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Condo-Schema: condo_001" \
  -d '{"email":"admin@condo.local","password":"admin123"}'
```

## 🗂️ Rotas Principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Dados do usuário |
| GET | `/health` | Health check |

## 📊 Banco de Dados

### Tabelas Globais (schema público)

- `condominios` - Lista de condominios
- `users_global` - Usuários root
- `fornecedores_global` - Fornecedores compartilhados
- `audit_logs_global` - Logs globais

### Tabelas por Condomínio

- `users` - Moradores e admins
- `votacoes` - Votações
- `votos` - Votos individuais
- `assinaturas_digitais` - PDFs assinados
- `agendamentos` - Reservas
- `areas_agendamento` - Áreas (piscina, salão, etc)
- `fornecedor_condos` - Fornecedores do condomínio
- `audit_logs` - Logs do condomínio
- `notification_prefs` - Preferências de notificação
- `notification_queue` - Fila de notificações

## 🧪 Testes

```bash
npm test
```

## 📋 TODO

- [ ] Rotas de votações completas
- [ ] Rotas de agendamentos
- [ ] Rotas de fornecedores
- [ ] Integração com Google Calendar
- [ ] Integração com Assinatura Digital
- [ ] Notificações WhatsApp/Email
- [ ] Audit logs completos
- [ ] Validações adicionais
- [ ] Rate limiting
- [ ] Logging estruturado

## 🚀 Deploy

Ver `../docs/DEPLOY.md` para instruções de deploy na VPS.
