CREATE TABLE IF NOT EXISTS todogreen_contracts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  opportunity_id TEXT NOT NULL DEFAULT '',
  proposal_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  monthly_value REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  terms TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_contracts_workspace
  ON todogreen_contracts (tenant_id, workspace_owner_id, client_id, archived_at, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_contracts_proposal
  ON todogreen_contracts (tenant_id, workspace_owner_id, proposal_id)
  WHERE archived_at IS NULL;
