CREATE TABLE IF NOT EXISTS product_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_events_workspace_date
  ON product_events (workspace_owner_id, created_at);

CREATE INDEX IF NOT EXISTS idx_product_events_name_date
  ON product_events (event_name, created_at);
