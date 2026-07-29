-- Portal do cliente. O token público nunca é persistido em texto puro.
-- A configuração aponta para registros do workspace, e cada ação externa
-- recebe protocolo e trilha própria.
CREATE TABLE IF NOT EXISTS client_portals (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  config_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  last_accessed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_portals_owner
  ON client_portals (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_events (
  id TEXT PRIMARY KEY,
  portal_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  linked_record_id TEXT,
  protocol TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  error TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(portal_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_events_portal
  ON client_portal_events (portal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_events_owner
  ON client_portal_events (workspace_owner_id, created_at DESC);
