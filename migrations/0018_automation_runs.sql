CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  output_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(owner_id, rule_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_owner_created
  ON automation_runs(owner_id, created_at DESC);
