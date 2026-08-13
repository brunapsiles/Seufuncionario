-- IDs gerenciais das contas e catálogo de indicadores configurável.

ALTER TABLE todogreen_clients ADD COLUMN account_code TEXT NOT NULL DEFAULT '';

UPDATE todogreen_clients
   SET account_code = printf('TDG-%08d', rowid)
 WHERE account_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_clients_account_code
  ON todogreen_clients (tenant_id, workspace_owner_id, account_code)
  WHERE account_code <> '';

CREATE TABLE IF NOT EXISTS todogreen_goal_metrics (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('commercial','financial','operational','esg','management')),
  unit TEXT NOT NULL DEFAULT 'number',
  direction TEXT NOT NULL DEFAULT 'increase' CHECK (direction IN ('increase','decrease','range')),
  measurement_mode TEXT NOT NULL DEFAULT 'manual' CHECK (measurement_mode IN ('manual','automatic')),
  source_key TEXT NOT NULL DEFAULT 'manual',
  source_label TEXT NOT NULL DEFAULT 'Atualização manual controlada',
  formula TEXT NOT NULL DEFAULT '',
  criteria_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (tenant_id, workspace_owner_id, metric_key),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_goal_metrics_catalog
  ON todogreen_goal_metrics (tenant_id, workspace_owner_id, archived_at, active, category, label);
