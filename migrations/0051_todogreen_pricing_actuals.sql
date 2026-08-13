-- Resultado executado ligado ao snapshot de pricing. O snapshot continua
-- imutável; o realizado é mensal, revisável e auditado separadamente.
CREATE TABLE IF NOT EXISTS todogreen_pricing_actuals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  reference_month TEXT NOT NULL,
  actual_revenue REAL NOT NULL DEFAULT 0,
  actual_cost REAL NOT NULL DEFAULT 0,
  actual_trips REAL NOT NULL DEFAULT 0,
  actual_distance_km REAL NOT NULL DEFAULT 0,
  actual_co2_kg REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_owner_id, scenario_id, reference_month),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES pricing_scenarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_pricing_actuals_scope
  ON todogreen_pricing_actuals (workspace_owner_id, reference_month DESC, scenario_id);
