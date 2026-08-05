CREATE TABLE IF NOT EXISTS todogreen_fleet_vehicles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  prefix TEXT NOT NULL,
  plate TEXT NOT NULL DEFAULT '',
  renavam TEXT NOT NULL DEFAULT '',
  chassis TEXT NOT NULL DEFAULT '',
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  model_year INTEGER,
  category TEXT NOT NULL DEFAULT '',
  energy_type TEXT NOT NULL DEFAULT 'electric',
  status TEXT NOT NULL DEFAULT 'available',
  operational_unit TEXT NOT NULL DEFAULT '',
  cost_center TEXT NOT NULL DEFAULT '',
  payload_kg REAL NOT NULL DEFAULT 0,
  volume_m3 REAL NOT NULL DEFAULT 0,
  pallet_capacity REAL NOT NULL DEFAULT 0,
  odometer_km REAL NOT NULL DEFAULT 0,
  acquisition_value REAL NOT NULL DEFAULT 0,
  monthly_fixed_cost REAL NOT NULL DEFAULT 0,
  revenue_accumulated REAL NOT NULL DEFAULT 0,
  cost_accumulated REAL NOT NULL DEFAULT 0,
  energy_consumption_kwh_per_km REAL NOT NULL DEFAULT 0,
  emission_factor_kgco2e_per_kwh REAL NOT NULL DEFAULT 0,
  battery_capacity_kwh REAL NOT NULL DEFAULT 0,
  battery_soh_percent REAL NOT NULL DEFAULT 100,
  nominal_range_km REAL NOT NULL DEFAULT 0,
  real_range_km REAL NOT NULL DEFAULT 0,
  next_maintenance_at TEXT,
  next_document_due_at TEXT,
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_fleet_plate
  ON todogreen_fleet_vehicles (workspace_owner_id, plate)
  WHERE plate <> '' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tdg_fleet_status
  ON todogreen_fleet_vehicles (workspace_owner_id, status, operational_unit, archived_at);
CREATE INDEX IF NOT EXISTS idx_tdg_fleet_maintenance
  ON todogreen_fleet_vehicles (workspace_owner_id, next_maintenance_at, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_fleet_maintenance_orders (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  downtime_hours REAL NOT NULL DEFAULT 0,
  parts_cost REAL NOT NULL DEFAULT 0,
  labor_cost REAL NOT NULL DEFAULT 0,
  other_cost REAL NOT NULL DEFAULT 0,
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES todogreen_fleet_vehicles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tdg_fleet_orders_vehicle
  ON todogreen_fleet_maintenance_orders (workspace_owner_id, vehicle_id, status, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_fleet_events (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tdg_fleet_events_vehicle
  ON todogreen_fleet_events (workspace_owner_id, vehicle_id, created_at DESC);
