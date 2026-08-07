-- ===== Deal Desk =====
--
-- Até aqui o Deal Desk era um aviso na tela: "esta condição precisa de
-- aprovação comercial", e a simulação era salva do mesmo jeito. Um alerta que
-- não impede nada não é controle.
--
-- Duas tabelas, com papéis distintos de propósito:
--
--   `..._requests` guarda o estado corrente do pedido — é o que a fila lê.
--   `..._events` guarda tudo o que aconteceu, em ordem, sem UPDATE nem DELETE.
--
-- Separá-las é o que torna o histórico confiável. Se a decisão morasse só na
-- linha do pedido, uma revisão sobrescreveria quem decidiu o quê, e a pergunta
-- "quem aprovou a versão 1?" ficaria sem resposta seis meses depois — que é
-- exatamente quando ela é feita.

CREATE TABLE IF NOT EXISTS todogreen_deal_desk_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  -- A simulação exata que está sendo aprovada. Sem isto, a aprovação vira
  -- carta branca para o cliente e não para a condição.
  scenario_id TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  alcada_id TEXT NOT NULL,
  deviation_points REAL NOT NULL DEFAULT 0,
  alcada_reason TEXT NOT NULL DEFAULT '',
  triggers_json TEXT NOT NULL DEFAULT '[]',
  justification TEXT NOT NULL DEFAULT '',
  requester_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
  -- Versão da condição. Revisar sobe a versão e reabre; a decisão sempre
  -- aponta para a versão que o aprovador realmente viu.
  version INTEGER NOT NULL DEFAULT 1,
  decided_by TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
  decided_at TEXT,
  due_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_deal_desk_fila
  ON todogreen_deal_desk_requests (workspace_owner_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_deal_desk_cenario
  ON todogreen_deal_desk_requests (workspace_owner_id, scenario_id, created_at DESC);

-- Só INSERT. Nenhum caminho do produto atualiza ou apaga linha daqui.
CREATE TABLE IF NOT EXISTS todogreen_deal_desk_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('abertura', 'revisao', 'comentario', 'decisao', 'cancelamento', 'vencimento')),
  version INTEGER NOT NULL DEFAULT 1,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES todogreen_deal_desk_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_deal_desk_eventos
  ON todogreen_deal_desk_events (request_id, created_at);
