-- Solicitações do cliente.
--
-- A porta que o portal já prometia e não tinha: a IA mandava "abra uma
-- solicitação" e a aba respondia "em breve".
--
-- Duas colunas carregam a regra de negócio e não podem virar texto livre:
--
--   client_id  — vem SEMPRE da sessão, nunca do corpo da requisição. É o que
--                sustenta o isolamento por cliente no portal.
--   due_at     — nasce no momento da abertura, a partir do tipo e da urgência.
--                Guardar o prazo (e não recalcular na leitura) é o que impede
--                que mudar a régua reescreva a pontualidade do passado.

CREATE TABLE IF NOT EXISTS todogreen_client_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL DEFAULT '',
  -- nova_rota | aumento_volume | coleta_extra | ocorrencia | documento |
  -- relatorio_esg | outro
  type TEXT NOT NULL DEFAULT 'outro',
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- baixa | normal | alta
  urgency TEXT NOT NULL DEFAULT 'normal',
  -- aberta | em_analise | aguardando_cliente | respondida | concluida |
  -- recusada | cancelada
  status TEXT NOT NULL DEFAULT 'aberta',
  -- Campos exigidos pelo tipo (origem, destino, referência...). Ficam em JSON
  -- porque variam por tipo e uma coluna por campo viraria tabela larga e vazia.
  fields_json TEXT NOT NULL DEFAULT '{}',
  due_at TEXT,
  opened_by TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  closed_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- A fila da equipe lê por status e prazo; o portal lê por cliente e data.
CREATE INDEX IF NOT EXISTS idx_todogreen_client_requests_client
  ON todogreen_client_requests (tenant_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_client_requests_fila
  ON todogreen_client_requests (tenant_id, status, due_at);

-- A conversa do pedido. Separada da solicitação porque um pedido tem muitas
-- mensagens e sobrescrever um campo de texto apagaria o histórico — que é
-- justamente o que se consulta quando alguém pergunta "mas o que ficou
-- combinado?".
CREATE TABLE IF NOT EXISTS todogreen_client_request_messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  -- cliente | equipe
  author_side TEXT NOT NULL DEFAULT 'cliente',
  author_email TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  -- Nota interna da equipe não aparece no portal do cliente. Marcada na
  -- escrita, filtrada na leitura — nunca só escondida na tela.
  internal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_request_messages_thread
  ON todogreen_client_request_messages (tenant_id, client_id, request_id, created_at);
