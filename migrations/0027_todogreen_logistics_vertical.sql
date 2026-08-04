CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  theme_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  invited_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user
  ON tenant_users (user_id, tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_users_workspace
  ON tenant_users (workspace_owner_id, tenant_id, status);

CREATE TABLE IF NOT EXISTS module_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  version TEXT NOT NULL DEFAULT '1.0.0',
  dependencies_json TEXT NOT NULL DEFAULT '[]',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  settings_json TEXT NOT NULL DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'global',
  exclusive_tenant_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  settings_json TEXT NOT NULL DEFAULT '{}',
  enabled_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, module_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES module_catalog(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logistics_products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  modality TEXT NOT NULL,
  billing_unit TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  required_fields_json TEXT NOT NULL DEFAULT '[]',
  optional_fields_json TEXT NOT NULL DEFAULT '[]',
  pricing_rules_json TEXT NOT NULL DEFAULT '{}',
  approval_rules_json TEXT NOT NULL DEFAULT '{}',
  indicators_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, code),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pricing_scenarios (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  opportunity_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  approvals_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_tenant_owner
  ON pricing_scenarios (tenant_id, workspace_owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS environmental_calculations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL DEFAULT '',
  inputs_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  data_quality INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_environmental_calculations_tenant_owner
  ON environmental_calculations (tenant_id, workspace_owner_id, created_at DESC);

