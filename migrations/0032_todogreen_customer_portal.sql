-- Portal do Cliente da vertical To Do Green.
--
-- Duas decisões que valem explicação, porque tudo o que vem depois depende
-- delas:
--
-- 1) Cliente vira registro de verdade. Até aqui os clientes viviam dentro do
--    JSON do espaço de trabalho, o que significa teto de tamanho para a
--    empresa inteira e perda de dados quando duas pessoas salvam ao mesmo
--    tempo. Uma transportadora com vários vendedores não cabe nesse modelo.
--
-- 2) O vínculo pessoa→cliente mora no banco, não na tela. É ele que responde
--    "de qual cliente esta sessão pode ver dados". Nenhum endpoint do portal
--    aceita o id do cliente vindo da requisição: quem manda é a sessão. Filtro
--    de tela esconde; isto impede.

CREATE TABLE IF NOT EXISTS todogreen_clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL DEFAULT '',
  document TEXT NOT NULL DEFAULT '',
  segment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  portal_enabled INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_clients_tenant
  ON todogreen_clients (tenant_id, status, name);

CREATE INDEX IF NOT EXISTS idx_todogreen_clients_owner
  ON todogreen_clients (tenant_id, workspace_owner_id, updated_at DESC);

-- Quem, de fora da To Do Green, enxerga o ambiente de um cliente.
-- A pessoa entra com a conta dela (mesmo cadastro, mesma sessão, mesmo login
-- do resto do produto) e o vínculo abaixo decide o que ela vê.
CREATE TABLE IF NOT EXISTS todogreen_client_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  user_id TEXT,
  role TEXT NOT NULL DEFAULT 'cliente_leitor',
  status TEXT NOT NULL DEFAULT 'active',
  permissions_json TEXT NOT NULL DEFAULT '["portal:read"]',
  note TEXT NOT NULL DEFAULT '',
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_access_at TEXT,
  UNIQUE(tenant_id, email),
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_users_lookup
  ON todogreen_client_users (tenant_id, email, status);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_users_client
  ON todogreen_client_users (client_id, status, email);

-- Trilha de acesso do portal. Auditoria separada da interna porque responde a
-- outra pergunta: "o que este cliente viu, e quando".
CREATE TABLE IF NOT EXISTS todogreen_client_portal_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_portal_events_client
  ON todogreen_client_portal_events (client_id, created_at DESC);
