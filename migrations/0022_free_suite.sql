-- Suíte gratuita: aplicativos declarativos, marketplace seguro e chaves da
-- API pública. Segredos de API são persistidos somente como SHA-256.
CREATE TABLE IF NOT EXISTS generated_apps (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generated_apps_owner
  ON generated_apps (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_templates (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  publisher_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Negócios',
  license TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_notes TEXT NOT NULL DEFAULT '',
  installs INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_status
  ON marketplace_templates (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_owner
  ON marketplace_templates (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public_api_keys (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'read',
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_api_keys_owner
  ON public_api_keys (workspace_owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public_api_idempotency (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES public_api_keys(id) ON DELETE CASCADE,
  UNIQUE(api_key_id, request_key)
);

CREATE INDEX IF NOT EXISTS idx_public_api_idempotency_created
  ON public_api_idempotency (created_at);
