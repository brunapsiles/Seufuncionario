-- ===== Um e-mail pode pertencer a mais de um cliente =====
--
-- A restrição era `UNIQUE(tenant_id, email)`: cada e-mail cabia em um cliente
-- só, no tenant inteiro. Isso deixava de fora quem mais precisa do portal:
--
--   • grupo empresarial com várias razões sociais;
--   • consultoria que atende três embarcadores;
--   • auditor que compara dois contratos;
--   • gestor de subsidiárias.
--
-- Todos eles têm um e-mail e várias empresas. Com a regra antiga, ou se
-- cadastravam com endereços diferentes por empresa — que é gambiarra que
-- ninguém mantém — ou ficavam de fora.
--
-- A restrição certa é uma linha por (cliente, e-mail): a mesma pessoa não entra
-- duas vezes no mesmo cliente, e entra em quantos clientes for convidada.
--
-- SQLite não remove restrição declarada dentro da tabela — o índice implícito
-- não tem nome que se possa derrubar. Por isso a tabela é reconstruída. Nenhuma
-- outra tabela referencia esta por chave estrangeira, então a troca é local.

CREATE TABLE IF NOT EXISTS todogreen_client_users_novo (
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
  UNIQUE(tenant_id, client_id, email),
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

INSERT INTO todogreen_client_users_novo
  (id, tenant_id, client_id, email, user_id, role, status, permissions_json,
   note, invited_by, created_at, updated_at, last_access_at)
SELECT id, tenant_id, client_id, email, user_id, role, status, permissions_json,
       note, invited_by, created_at, updated_at, last_access_at
  FROM todogreen_client_users;

DROP TABLE todogreen_client_users;
ALTER TABLE todogreen_client_users_novo RENAME TO todogreen_client_users;

CREATE INDEX IF NOT EXISTS idx_todogreen_client_users_lookup
  ON todogreen_client_users (tenant_id, email, status);
CREATE INDEX IF NOT EXISTS idx_todogreen_client_users_client
  ON todogreen_client_users (client_id, status, email);
