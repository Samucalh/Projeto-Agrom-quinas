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
--
-- Se já existe um schema antigo no banco, este script é seguro
-- para rodar várias vezes (usa IF NOT EXISTS / DROP IF EXISTS).
-- =============================================

-- ────────────────────────────────────────────────
-- 1) FUNÇÃO AUXILIAR – atualiza coluna updated_at
-- ────────────────────────────────────────────────
-- Sempre que uma linha é alterada (UPDATE), essa função roda
-- automaticamente e atualiza o campo updated_at. É como um
-- relógio que registra "modificado pela última vez em...".
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────
-- 2) TABELA clientes
-- ────────────────────────────────────────────────
-- Guarda UMA linha por cliente. O CPF/CNPJ (campo `documento`)
-- é único: identifica a pessoa/empresa. Quando o mesmo CPF
-- faz vários agendamentos, ele continua tendo apenas UMA
-- linha aqui — só os agendamentos se multiplicam.
CREATE TABLE IF NOT EXISTS clientes (
    id          BIGSERIAL    PRIMARY KEY,
    nome        TEXT         NOT NULL,
    documento   TEXT         NOT NULL UNIQUE,    -- CPF/CNPJ só com dígitos (sem . / -)
    telefone    TEXT         NOT NULL,
    email       TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes (documento);

DROP TRIGGER IF EXISTS trg_clientes_updated ON clientes;
CREATE TRIGGER trg_clientes_updated
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────
-- 3) TABELA agendamentos
-- ────────────────────────────────────────────────
-- Cada linha representa um serviço agendado. Aponta para o
-- cliente que pediu o serviço através de `cliente_id`
-- (chave estrangeira). ON DELETE RESTRICT impede que um
-- cliente seja apagado enquanto ainda houver agendamentos
-- ligados a ele (proteção contra "órfãos").
CREATE TABLE IF NOT EXISTS agendamentos (
    id                  BIGSERIAL    PRIMARY KEY,
    cliente_id          BIGINT       NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    tipo_servico        TEXT         NOT NULL,
    tipo_maquina        TEXT         NOT NULL,
    marca_modelo        TEXT         NOT NULL,
    ano_maquina         INTEGER,
    descricao_problema  TEXT         NOT NULL,
    localizacao         TEXT         NOT NULL,
    data_agendamento    DATE         NOT NULL,
    horario             TEXT         NOT NULL,
    status              TEXT         NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','em-andamento','finalizado','cancelado')),
    relatorio_conclusao TEXT,
    finalizado_em       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agend_cliente ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_agend_data    ON agendamentos (data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agend_status  ON agendamentos (status);

DROP TRIGGER IF EXISTS trg_agend_updated ON agendamentos;
CREATE TRIGGER trg_agend_updated
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────
-- 4) ÍNDICE ÚNICO PARCIAL – um slot por horário ATIVO
-- ────────────────────────────────────────────────
-- Garante que NÃO existam dois agendamentos diferentes para
-- a mesma data + horário, mas IGNORA os cancelados.
-- Assim, se um cliente cancela um agendamento, o slot pode
-- ser reutilizado por outro cliente.
DROP INDEX IF EXISTS uniq_slot_ativo;
CREATE UNIQUE INDEX uniq_slot_ativo
    ON agendamentos (data_agendamento, horario)
    WHERE status <> 'cancelado';


-- ────────────────────────────────────────────────
-- 5) VIEW PÚBLICA – slots ocupados (somente data + horário)
-- ────────────────────────────────────────────────
-- O calendário do frontend precisa saber quais horários já
-- estão ocupados, mas NÃO pode ver nome, CPF, telefone, etc.
-- Esta view expõe APENAS data e horário. É o "vidro fosco"
-- entre o público e os dados sensíveis.
CREATE OR REPLACE VIEW slots_ocupados AS
SELECT data_agendamento, horario
FROM agendamentos
WHERE status <> 'cancelado';

-- Permite que a chave anônima (anon, usada pelo navegador)
-- leia somente esta view.
GRANT SELECT ON slots_ocupados TO anon;


-- ────────────────────────────────────────────────
-- 6) ROW-LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────
-- RLS é o "porteiro" que decide quem pode ler/escrever cada
-- linha de uma tabela. Ativamos para AMBAS as tabelas e
-- NÃO criamos nenhuma política para anon, ou seja: o público
-- (chave anônima) fica totalmente BLOQUEADO de ler/escrever
-- nas tabelas reais. Só consegue ler através da view acima.
--
-- O backend Python usa a chave service_role, que IGNORA RLS
-- — então o app.py continua tendo acesso total. É por isso
-- que a service_role NUNCA pode vazar para o navegador.
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos  ENABLE ROW LEVEL SECURITY;

-- (Se no futuro houver login de admin via Supabase Auth,
-- crie aqui policies para "authenticated", ex.:
--   CREATE POLICY admin_read ON agendamentos FOR SELECT TO authenticated USING (true); )


-- ────────────────────────────────────────────────
-- 7) Mensagem de confirmação
-- ────────────────────────────────────────────────
SELECT
    'Schema criado com sucesso!' AS resultado,
    (SELECT COUNT(*) FROM clientes)     AS clientes_existentes,
    (SELECT COUNT(*) FROM agendamentos) AS agendamentos_existentes;
