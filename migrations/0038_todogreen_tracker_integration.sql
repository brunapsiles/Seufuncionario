CREATE TABLE IF NOT EXISTS todogreen_tracker_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sistemas_tracker',
  name TEXT NOT NULL DEFAULT 'Sistemas Tracker',
  base_url TEXT NOT NULL DEFAULT '',
  external_account_id TEXT NOT NULL DEFAULT '',
  auth_mode TEXT NOT NULL DEFAULT 'bearer',
  token_env_key TEXT NOT NULL DEFAULT 'TODOGREEN_TRACKER_API_TOKEN',
  webhook_secret_env_key TEXT NOT NULL DEFAULT 'TODOGREEN_TRACKER_WEBHOOK_SECRET',
  status TEXT NOT NULL DEFAULT 'draft',
  sync_mode TEXT NOT NULL DEFAULT 'manual',
  polling_interval_minutes INTEGER NOT NULL DEFAULT 60,
  read_only INTEGER NOT NULL DEFAULT 1,
  provider_config_json TEXT NOT NULL DEFAULT '{}',
  last_test_at TEXT,
  last_sync_at TEXT,
  last_success_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_tracker_integration_active
  ON todogreen_tracker_integrations (workspace_owner_id, provider)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_integration_schedule
  ON todogreen_tracker_integrations (status, sync_mode, last_sync_at, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_tracker_vehicle_links (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  vehicle_id TEXT,
  external_vehicle_id TEXT NOT NULL,
  imei TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (integration_id) REFERENCES todogreen_tracker_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES todogreen_fleet_vehicles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_tracker_vehicle_external
  ON todogreen_tracker_vehicle_links (integration_id, external_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_vehicle_plate
  ON todogreen_tracker_vehicle_links (workspace_owner_id, plate, active);
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_vehicle_local
  ON todogreen_tracker_vehicle_links (workspace_owner_id, vehicle_id, active);

CREATE TABLE IF NOT EXISTS todogreen_tracker_positions (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  vehicle_link_id TEXT NOT NULL,
  vehicle_id TEXT,
  external_vehicle_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed_kmh REAL NOT NULL DEFAULT 0,
  heading_degrees REAL NOT NULL DEFAULT 0,
  ignition INTEGER,
  odometer_km REAL,
  address TEXT NOT NULL DEFAULT '',
  recorded_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  raw_hash TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (integration_id) REFERENCES todogreen_tracker_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_link_id) REFERENCES todogreen_tracker_vehicle_links(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES todogreen_fleet_vehicles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_tracker_position_dedup
  ON todogreen_tracker_positions (integration_id, raw_hash);
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_position_vehicle_time
  ON todogreen_tracker_positions (workspace_owner_id, vehicle_link_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_position_time
  ON todogreen_tracker_positions (workspace_owner_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_tracker_events (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  vehicle_link_id TEXT,
  vehicle_id TEXT,
  external_vehicle_id TEXT NOT NULL DEFAULT '',
  provider_event_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (integration_id) REFERENCES todogreen_tracker_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_link_id) REFERENCES todogreen_tracker_vehicle_links(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES todogreen_fleet_vehicles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_tracker_event_provider
  ON todogreen_tracker_events (integration_id, provider_event_id)
  WHERE provider_event_id <> '';
CREATE INDEX IF NOT EXISTS idx_tdg_tracker_event_vehicle_time
  ON todogreen_tracker_events (workspace_owner_id, external_vehicle_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_tracker_sync_runs (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  ignored_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  cursor_value TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY (integration_id) REFERENCES todogreen_tracker_integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tdg_tracker_sync_history
  ON todogreen_tracker_sync_runs (workspace_owner_id, integration_id, started_at DESC);
