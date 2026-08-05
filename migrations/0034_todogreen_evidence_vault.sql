-- Cofre de Evidências.
--
-- O que sustenta o número: nota fiscal, telemetria, contrato de energia,
-- comprovante de abastecimento, laudo. Sem o documento, o cálculo é palavra;
-- com ele, é apuração.
--
-- Guarda a impressão digital do conteúdo (SHA-256) junto do registro. É ela que
-- permite, meses depois, provar que o documento anexado ao relatório é o mesmo
-- que está no cofre — sem precisar confiar na data de modificação do arquivo.

CREATE TABLE IF NOT EXISTS todogreen_evidences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  -- nota_fiscal | telemetria | contrato | comprovante | laudo | outro
  tipo TEXT NOT NULL DEFAULT 'outro',
  titulo TEXT NOT NULL,
  referencia TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  emitido_em TEXT,
  -- Onde o arquivo vive. Guardamos referência, não o binário: uma base D1 não
  -- é lugar para PDF de nota fiscal.
  arquivo_url TEXT NOT NULL DEFAULT '',
  arquivo_nome TEXT NOT NULL DEFAULT '',
  arquivo_bytes INTEGER NOT NULL DEFAULT 0,
  hash_conteudo TEXT NOT NULL DEFAULT '',
  -- A qual cálculo ambiental esta evidência dá suporte.
  calculo_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_evidences_scope
  ON todogreen_evidences (tenant_id, client_id, emitido_em DESC);

CREATE INDEX IF NOT EXISTS idx_todogreen_evidences_calculo
  ON todogreen_evidences (tenant_id, client_id, calculo_id);
