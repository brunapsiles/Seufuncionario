-- ===== Acompanhamento logístico de verdade =====
--
-- A aba de operações do portal era uma tabela simples: referência, status,
-- data, origem e destino. Sem busca, sem filtro, sem detalhe, sem linha do
-- tempo, sem SLA previsto contra realizado, sem ocorrência, sem comprovante de
-- entrega, sem rastreamento, sem previsão de chegada e sem paginação visível.
--
-- O efeito é que o ESG ficou mais desenvolvido do que a própria experiência de
-- acompanhar a carga — que é o motivo pelo qual o cliente entra no portal.
--
-- Duas coisas que o schema passa a suportar:
--
--   SLA COMO DOIS INSTANTES. `promised_at` é o que foi combinado; `delivered_at`
--   é o que aconteceu. Guardar só um "status: atrasado" perde a conta e obriga
--   a confiar em quem escreveu o rótulo.
--
--   LINHA DO TEMPO EM TABELA PRÓPRIA, só com INSERT. Um evento que pode ser
--   editado não é histórico, é rascunho.

ALTER TABLE todogreen_client_operations ADD COLUMN promised_at TEXT;
ALTER TABLE todogreen_client_operations ADD COLUMN delivered_at TEXT;
-- Previsão corrente de chegada. Muda ao longo da viagem; o combinado não muda.
ALTER TABLE todogreen_client_operations ADD COLUMN eta_at TEXT;
ALTER TABLE todogreen_client_operations ADD COLUMN vehicle_plate TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_client_operations ADD COLUMN driver_name TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_client_operations ADD COLUMN distance_km REAL NOT NULL DEFAULT 0;
-- Comprovante de entrega: mesma ideia do cofre — o arquivo mora fora, aqui fica
-- o endereço e a impressão digital do conteúdo.
ALTER TABLE todogreen_client_operations ADD COLUMN proof_url TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_client_operations ADD COLUMN proof_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_client_operations ADD COLUMN last_position_at TEXT;
ALTER TABLE todogreen_client_operations ADD COLUMN last_position_lat REAL;
ALTER TABLE todogreen_client_operations ADD COLUMN last_position_lng REAL;

CREATE INDEX IF NOT EXISTS idx_todogreen_client_operations_prazo
  ON todogreen_client_operations (tenant_id, client_id, promised_at);

CREATE TABLE IF NOT EXISTS todogreen_client_operation_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  operation_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  -- coleta | transito | chegada | entrega | ocorrencia | reagendamento | documento
  kind TEXT NOT NULL DEFAULT 'transito',
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  -- Quando aconteceu, que é diferente de quando foi registrado. Um evento
  -- lançado com atraso não pode reescrever a ordem da viagem.
  ocorrido_em TEXT NOT NULL,
  registrado_por TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES todogreen_client_operations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_operation_events_linha
  ON todogreen_client_operation_events (operation_id, ocorrido_em);
CREATE INDEX IF NOT EXISTS idx_todogreen_operation_events_cliente
  ON todogreen_client_operation_events (tenant_id, client_id, kind, ocorrido_em DESC);

-- ===== Um caminho de download só =====
--
-- A concessão da 0043 exigia `evidence_id` e amarrava a chave estrangeira ao
-- cofre. O comprovante de entrega não é uma linha do cofre — é um arquivo da
-- própria operação —, e sem esta mudança ele precisaria de um segundo caminho
-- de download, com uma segunda regra de expiração para alguém esquecer de
-- manter.
--
-- Agora a concessão aponta para um documento do cofre OU para um endereço
-- direto. O resto — validade, hash do token, contagem de aberturas — continua
-- igual para os dois.
CREATE TABLE IF NOT EXISTS todogreen_document_grants_novo (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  evidence_id TEXT,
  arquivo_url TEXT NOT NULL DEFAULT '',
  arquivo_nome TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  issued_to TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (evidence_id) REFERENCES todogreen_evidences(id) ON DELETE CASCADE
);

INSERT INTO todogreen_document_grants_novo
  (id, token_hash, tenant_id, evidence_id, client_id, workspace_owner_id, issued_to,
   expires_at, revoked_at, downloads, last_used_at, created_at)
SELECT id, token_hash, tenant_id, evidence_id, client_id, workspace_owner_id, issued_to,
       expires_at, revoked_at, downloads, last_used_at, created_at
  FROM todogreen_document_grants;

DROP TABLE todogreen_document_grants;
ALTER TABLE todogreen_document_grants_novo RENAME TO todogreen_document_grants;

CREATE INDEX IF NOT EXISTS idx_todogreen_document_grants_validade
  ON todogreen_document_grants (expires_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_document_grants_documento
  ON todogreen_document_grants (evidence_id, created_at DESC);
