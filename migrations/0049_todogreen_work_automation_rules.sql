CREATE TABLE IF NOT EXISTS todogreen_work_automation_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  board_id TEXT,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  condition_field TEXT NOT NULL DEFAULT '',
  condition_operator TEXT NOT NULL DEFAULT 'equals',
  condition_value TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  FOREIGN KEY (board_id) REFERENCES todogreen_work_boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tdg_work_automation_rules_owner
  ON todogreen_work_automation_rules
  (workspace_owner_id, enabled, board_id, updated_at DESC);
