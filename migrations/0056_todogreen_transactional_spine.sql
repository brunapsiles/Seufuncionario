-- Espinha transacional da vertical To Do Green.
--
-- O identificador canônico da execução passa a ser a ordem de serviço. Viagem,
-- entrega, POD, faturamento, título, baixa e custo carregam service_order_id.
-- As tabelas antigas continuam válidas durante a migração; operation_id permite
-- ligar a OS à operação que o portal já expõe sem duplicar o histórico.

ALTER TABLE todogreen_contracts ADD COLUMN service_id TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_contracts ADD COLUMN price_table_id TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_contracts ADD COLUMN sla_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE todogreen_contracts ADD COLUMN commercial_terms_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE todogreen_contracts ADD COLUMN taxes_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE todogreen_contracts ADD COLUMN billing_rules_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE todogreen_contracts ADD COLUMN adjustment_index TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_contracts ADD COLUMN adjustment_base_date TEXT;
ALTER TABLE todogreen_contracts ADD COLUMN minimum_commitment REAL NOT NULL DEFAULT 0;
ALTER TABLE todogreen_contracts ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE todogreen_contracts ADD COLUMN approved_by TEXT;
ALTER TABLE todogreen_contracts ADD COLUMN approved_at TEXT;

CREATE TABLE IF NOT EXISTS todogreen_service_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  operation_id TEXT NOT NULL DEFAULT '',
  service_id TEXT NOT NULL DEFAULT '',
  price_table_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','released','in_progress','completed','cancelled')),
  requested_at TEXT,
  scheduled_start_at TEXT,
  scheduled_end_at TEXT,
  completed_at TEXT,
  origin_json TEXT NOT NULL DEFAULT '{}',
  destination_json TEXT NOT NULL DEFAULT '{}',
  quantity REAL NOT NULL DEFAULT 0,
  charge_unit TEXT NOT NULL DEFAULT '',
  unit_price REAL NOT NULL DEFAULT 0,
  gross_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  sla_json TEXT NOT NULL DEFAULT '{}',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (tenant_id, workspace_owner_id, number),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES todogreen_contracts(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_service_orders_scope
  ON todogreen_service_orders (workspace_owner_id, status, scheduled_start_at, archived_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_service_orders_contract
  ON todogreen_service_orders (workspace_owner_id, contract_id, status, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_trips (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL DEFAULT '',
  driver_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  started_at TEXT,
  finished_at TEXT,
  distance_km REAL NOT NULL DEFAULT 0,
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES todogreen_service_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_trips_order
  ON todogreen_trips (workspace_owner_id, service_order_id, started_at);

CREATE TABLE IF NOT EXISTS todogreen_deliveries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL,
  trip_id TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  promised_at TEXT,
  delivered_at TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  recipient_json TEXT NOT NULL DEFAULT '{}',
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES todogreen_service_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_deliveries_order
  ON todogreen_deliveries (workspace_owner_id, service_order_id, sequence);

CREATE TABLE IF NOT EXISTS todogreen_proofs_of_delivery (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL,
  delivery_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'delivery',
  occurred_at TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  document_url TEXT NOT NULL DEFAULT '',
  document_hash TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES todogreen_service_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_pod_order
  ON todogreen_proofs_of_delivery (workspace_owner_id, service_order_id, occurred_at DESC);

-- Uma OS concluída vira item elegível. Conferir não emite documento; fechar o
-- faturamento agrupa itens, cria fatura e título a receber de forma atômica.
CREATE TABLE IF NOT EXISTS todogreen_billing_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'eligible'
    CHECK (status IN ('eligible','checked','blocked','billed','cancelled')),
  amount REAL NOT NULL,
  competence_date TEXT NOT NULL,
  block_reason TEXT NOT NULL DEFAULT '',
  billing_run_id TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, workspace_owner_id, service_order_id),
  FOREIGN KEY (service_order_id) REFERENCES todogreen_service_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_billing_items_queue
  ON todogreen_billing_items (workspace_owner_id, status, competence_date);

CREATE TABLE IF NOT EXISTS todogreen_billing_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  contract_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'closed',
  competence_date TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  closed_by TEXT NOT NULL,
  closed_at TEXT NOT NULL,
  UNIQUE (tenant_id, workspace_owner_id, number)
);

CREATE TABLE IF NOT EXISTS todogreen_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  billing_run_id TEXT NOT NULL,
  number TEXT NOT NULL,
  series TEXT NOT NULL DEFAULT '1',
  document_type TEXT NOT NULL DEFAULT 'invoice',
  status TEXT NOT NULL DEFAULT 'issued',
  issued_at TEXT NOT NULL,
  amount REAL NOT NULL,
  external_key TEXT NOT NULL DEFAULT '',
  document_url TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (tenant_id, workspace_owner_id, number, series),
  FOREIGN KEY (billing_run_id) REFERENCES todogreen_billing_runs(id)
);

CREATE TABLE IF NOT EXISTS todogreen_financial_titles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  number TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('receivable','payable')),
  party_id TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL DEFAULT '',
  supplier_id TEXT NOT NULL DEFAULT '',
  contract_id TEXT NOT NULL DEFAULT '',
  service_order_id TEXT NOT NULL DEFAULT '',
  billing_run_id TEXT NOT NULL DEFAULT '',
  invoice_id TEXT NOT NULL DEFAULT '',
  purchase_order_id TEXT NOT NULL DEFAULT '',
  installment INTEGER NOT NULL DEFAULT 1,
  competence_date TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  original_amount REAL NOT NULL,
  open_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','partial','settled','overdue','cancelled')),
  chart_account_id TEXT NOT NULL DEFAULT '',
  cost_center_id TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (tenant_id, workspace_owner_id, number),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_titles_due
  ON todogreen_financial_titles (workspace_owner_id, kind, status, due_date, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_settlements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  amount REAL NOT NULL,
  settled_at TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT '',
  bank_account_id TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (title_id) REFERENCES todogreen_financial_titles(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_settlements_title
  ON todogreen_settlements (workspace_owner_id, title_id, settled_at DESC);

-- O custo é imutável no razão; o rateio é a ponte que dá múltiplas dimensões
-- sem copiar o mesmo valor para operação, veículo, contrato e centro de custo.
CREATE TABLE IF NOT EXISTS todogreen_cost_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  competence_date TEXT NOT NULL,
  supplier_id TEXT NOT NULL DEFAULT '',
  purchase_order_id TEXT NOT NULL DEFAULT '',
  financial_title_id TEXT NOT NULL DEFAULT '',
  document_number TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_todogreen_cost_entries_competence
  ON todogreen_cost_entries (workspace_owner_id, competence_date DESC);

CREATE TABLE IF NOT EXISTS todogreen_cost_allocations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  cost_entry_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL DEFAULT '',
  operation_id TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL DEFAULT '',
  contract_id TEXT NOT NULL DEFAULT '',
  vehicle_id TEXT NOT NULL DEFAULT '',
  supplier_id TEXT NOT NULL DEFAULT '',
  cost_center_id TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  percentage REAL NOT NULL DEFAULT 0,
  rule TEXT NOT NULL DEFAULT 'manual',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (cost_entry_id) REFERENCES todogreen_cost_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_todogreen_cost_allocations_order
  ON todogreen_cost_allocations (workspace_owner_id, service_order_id, created_at DESC);
