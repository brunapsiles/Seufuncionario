CREATE TABLE IF NOT EXISTS workspace_snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(owner_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_owner_created
  ON workspace_snapshots(owner_id, created_at DESC);
