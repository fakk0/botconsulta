-- Schema do banco de dados - será implementado
-- Tabelas para consultas, usuários, sessões, etc.

CREATE TABLE IF NOT EXISTS consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(8) NOT NULL,
  success BOOLEAN NOT NULL,
  data JSONB,
  error TEXT,
  execution_time INTEGER,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultas_placa ON consultas(placa);
CREATE INDEX idx_consultas_created_at ON consultas(created_at);