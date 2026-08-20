CREATE TABLE IF NOT EXISTS todogreen_ciot_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  number TEXT NOT NULL,
  service_order_id TEXT,
  operation_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  integration_mode TEXT NOT NULL DEFAULT 'direct_api',
  integration_environment TEXT NOT NULL DEFAULT 'homologation',
  ciot_code TEXT,
  protocol TEXT,
  operation_type TEXT NOT NULL DEFAULT 'carga_lotacao',
  responsible_type TEXT NOT NULL DEFAULT 'etc',
  contractor_document TEXT,
  carrier_document TEXT,
  driver_document TEXT,
  vehicle_plate TEXT,
  origin_city TEXT,
  origin_state TEXT,
  destination_city TEXT,
  destination_state TEXT,
  cargo_description TEXT,
  freight_amount REAL NOT NULL DEFAULT 0,
  floor_amount REAL NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  contingency_reason TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  response_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  issued_at TEXT,
  closed_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (service_order_id) REFERENCES todogreen_service_orders(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_ciot_number
  ON todogreen_ciot_records (tenant_id, workspace_owner_id, number);

CREATE INDEX IF NOT EXISTS idx_todogreen_ciot_queue
  ON todogreen_ciot_records (workspace_owner_id, status, starts_at, archived_at);

CREATE INDEX IF NOT EXISTS idx_todogreen_ciot_service_order
  ON todogreen_ciot_records (workspace_owner_id, service_order_id, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_ciot_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'direct_api',
  environment TEXT NOT NULL DEFAULT 'homologation',
  certificate_type TEXT NOT NULL DEFAULT 'A1',
  certificate_env_key TEXT NOT NULL DEFAULT 'TODOGREEN_ANTT_CIOT_CERTIFICATE_PFX',
  certificate_password_env_key TEXT NOT NULL DEFAULT 'TODOGREEN_ANTT_CIOT_CERTIFICATE_PASSWORD',
  a3_connector_env_key TEXT NOT NULL DEFAULT 'TODOGREEN_ANTT_CIOT_A3_CONNECTOR_URL',
  base_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  last_test_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (tenant_id, workspace_owner_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_todogreen_ciot_integrations_scope
  ON todogreen_ciot_integrations (workspace_owner_id, mode, archived_at);
