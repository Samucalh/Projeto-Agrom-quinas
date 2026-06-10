-- =============================================
-- AgroMáquinas – Schema do banco de dados
-- Supabase / PostgreSQL
-- =============================================
-- COMO EXECUTAR:
-- 1. Acesse https://supabase.com e entre no seu projeto
-- 2. Menu lateral → "SQL Editor"
-- 3. Clique em "New query"
-- 4. Cole TODO o conteúdo deste arquivo
-- 5. Clique em "Run" (ou pressione Ctrl+Enter)
-- 6. Verifique a mensagem de sucesso no final
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agendamentos (
    id                  BIGSERIAL PRIMARY KEY,
    nome_cliente        TEXT        NOT NULL,
    documento           TEXT        NOT NULL,
    telefone            TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    tipo_servico        TEXT        NOT NULL,
    tipo_maquina        TEXT        NOT NULL,
    marca_modelo        TEXT        NOT NULL,
    ano_maquina         INTEGER,
    descricao_problema  TEXT        NOT NULL,
    localizacao         TEXT        NOT NULL,
    data_agendamento    DATE        NOT NULL,
    horario             TEXT        NOT NULL,
    status              TEXT        NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','em-andamento','finalizado','cancelado')),
    relatorio_conclusao TEXT,
    finalizado_em       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (data_agendamento, horario)
);

CREATE INDEX IF NOT EXISTS idx_agend_data   ON agendamentos (data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agend_status ON agendamentos (status);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agend_updated ON agendamentos;
CREATE TRIGGER trg_agend_updated
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Clientes podem criar agendamentos
CREATE POLICY "insert_public" ON agendamentos FOR INSERT TO anon WITH CHECK (true);

-- Todos podem consultar slots (apenas para o calendário)
CREATE POLICY "select_public" ON agendamentos FOR SELECT TO anon USING (true);

-- Admins autenticados podem atualizar e excluir
CREATE POLICY "update_auth" ON agendamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_auth" ON agendamentos FOR DELETE TO authenticated USING (true);

SELECT 'Tabela agendamentos criada com sucesso!' AS resultado, COUNT(*) AS registros FROM agendamentos;
