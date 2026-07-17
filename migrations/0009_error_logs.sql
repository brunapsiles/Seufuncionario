CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at);
