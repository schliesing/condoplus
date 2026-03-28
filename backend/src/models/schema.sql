-- ============================================================================
-- SCHEMA PÚBLICO - DADOS GLOBAIS (Root)
-- ============================================================================

-- Tabela de Condominios
CREATE TABLE IF NOT EXISTS condominios (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  endereco VARCHAR(500),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT true
);

-- Usuários Globais (apenas Root)
CREATE TABLE IF NOT EXISTS users_global (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'root',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fornecedores Globais (compartilhados entre condos)
CREATE TABLE IF NOT EXISTS fornecedores_global (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de Auditoria Globais
CREATE TABLE IF NOT EXISTS audit_logs_global (
  id SERIAL PRIMARY KEY,
  condo_id INTEGER REFERENCES condominios(id),
  user_id INTEGER,
  acao VARCHAR(255) NOT NULL,
  tabela VARCHAR(100),
  dados_antigos JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_global_condo ON audit_logs_global(condo_id);
CREATE INDEX idx_audit_logs_global_timestamp ON audit_logs_global(timestamp);

-- ============================================================================
-- SCHEMA POR CONDOMÍNIO (ex: condo_001, condo_002, ...)
-- ============================================================================

-- Quando criar um novo condomínio, executar:
-- CREATE SCHEMA IF NOT EXISTS condo_001;
-- SET search_path TO condo_001;

-- 🔐 AUTENTICAÇÃO E USUÁRIOS

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  apartamento VARCHAR(50),
  telefone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'morador', -- 'admin' ou 'morador'
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- 🗳️ VOTAÇÕES

CREATE TABLE IF NOT EXISTS votacoes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  status VARCHAR(50) DEFAULT 'sugestoes', -- 'sugestoes', 'pauta_definida', 'votando', 'encerrada'
  data_inicio_sugestoes TIMESTAMP,
  data_fim_sugestoes TIMESTAMP,
  data_inicio_votacao TIMESTAMP,
  data_fim_votacao TIMESTAMP,
  quorum_minimo DECIMAL(5,2) DEFAULT 50.00, -- % de moradores
  criado_por INTEGER REFERENCES users(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sugestoes_pautas (
  id SERIAL PRIMARY KEY,
  votacao_id INTEGER REFERENCES votacoes(id) ON DELETE CASCADE,
  morador_id INTEGER REFERENCES users(id),
  sugestao TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votos (
  id SERIAL PRIMARY KEY,
  votacao_id INTEGER REFERENCES votacoes(id) ON DELETE CASCADE,
  morador_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  voto VARCHAR(50), -- 'sim', 'nao', 'abstencao'
  assinado BOOLEAN DEFAULT false,
  timestamp_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(votacao_id, morador_id)
);

CREATE TABLE IF NOT EXISTS assinaturas_digitais (
  id SERIAL PRIMARY KEY,
  votacao_id INTEGER REFERENCES votacoes(id) ON DELETE CASCADE,
  morador_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pdf_url VARCHAR(500),
  pdf_hash VARCHAR(255),
  status_assinatura VARCHAR(50), -- 'pendente', 'assinado', 'rejeitado'
  assinado_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📅 AGENDAMENTOS

CREATE TABLE IF NOT EXISTS areas_agendamento (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  capacidade INTEGER,
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  area_id INTEGER REFERENCES areas_agendamento(id) ON DELETE CASCADE,
  morador_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmado', -- 'confirmado', 'cancelado'
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelado_em TIMESTAMP,
  motivo_cancelamento TEXT
);

CREATE INDEX idx_agendamentos_area_data ON agendamentos(area_id, data_inicio);
CREATE INDEX idx_agendamentos_morador ON agendamentos(morador_id);

CREATE TABLE IF NOT EXISTS bloqueios_area (
  id SERIAL PRIMARY KEY,
  area_id INTEGER REFERENCES areas_agendamento(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP NOT NULL,
  motivo VARCHAR(500),
  bloqueado_por INTEGER REFERENCES users(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🏢 FORNECEDORES

CREATE TABLE IF NOT EXISTS fornecedor_condos (
  id SERIAL PRIMARY KEY,
  fornecedor_global_id INTEGER,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  sugerido_por INTEGER REFERENCES users(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id SERIAL PRIMARY KEY,
  fornecedor_id INTEGER REFERENCES fornecedor_condos(id) ON DELETE CASCADE,
  numero_nf VARCHAR(100) NOT NULL,
  data_emissao DATE,
  arquivo_url VARCHAR(500),
  upload_por INTEGER REFERENCES users(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔔 NOTIFICAÇÕES

CREATE TABLE IF NOT EXISTS notification_prefs (
  id SERIAL PRIMARY KEY,
  morador_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  votacoes_ativas BOOLEAN DEFAULT true,
  periodo_sugestoes BOOLEAN DEFAULT true,
  pauta_definida BOOLEAN DEFAULT true,
  agendamento_confirmacao BOOLEAN DEFAULT true,
  agendamento_lembrete BOOLEAN DEFAULT true,
  comunicados BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  morador_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(100), -- 'votacao_nova', 'votacao_resultado', 'agendamento_confirmacao', etc
  mensagem TEXT,
  canal VARCHAR(50), -- 'whatsapp', 'email'
  status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'enviado', 'falhou'
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enviado_em TIMESTAMP
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);

-- 📊 AUDITORIA

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  acao VARCHAR(255) NOT NULL,
  tabela VARCHAR(100),
  registro_id INTEGER,
  dados_antigos JSONB,
  dados_novos JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 📋 CONFIGURAÇÕES DO CONDOMÍNIO

CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo VARCHAR(50), -- 'inteiro', 'decimal', 'texto', 'boolean'
  descricao TEXT,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserts padrão de configurações
INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES
  ('quorum_minimo', '50', 'decimal', 'Quórum mínimo para votação (%)'),
  ('prazo_cancelamento_agendamento', '24', 'inteiro', 'Prazo para cancelamento (horas)'),
  ('dias_retencao_auditlog', '365', 'inteiro', 'Dias para retenção de logs (12 meses = 365)'),
  ('ativo', 'true', 'boolean', 'Condomínio ativo na plataforma')
ON CONFLICT (chave) DO NOTHING;
