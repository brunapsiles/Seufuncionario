-- Carteira comercial e painéis configuráveis da To Do Green.
-- A carteira é definida por e-mail para funcionar antes e depois do primeiro
-- acesso do vendedor. A API sempre cruza o e-mail da sessão com esta tabela.

CREATE TABLE IF NOT EXISTS todogreen_client_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  seller_email TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT NOT NULL DEFAULT '',
  assigned_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, client_id, seller_email),
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_assignments_seller
  ON todogreen_client_assignments (tenant_id, seller_email, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_assignments_client
  ON todogreen_client_assignments (tenant_id, client_id, status, seller_email);

CREATE TABLE IF NOT EXISTS todogreen_dashboards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'personal',
  filters_json TEXT NOT NULL DEFAULT '{}',
  widgets_json TEXT NOT NULL DEFAULT '[]',
  layout_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_todogreen_dashboards_owner
  ON todogreen_dashboards (tenant_id, workspace_owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_todogreen_dashboards_creator
  ON todogreen_dashboards (tenant_id, created_by, status, updated_at DESC);
