-- Consolidação enterprise da vertical To Do Green.
--
-- Aprofunda fontes já canônicas em vez de criar módulos paralelos:
-- financeiro ganha contas a receber/pagar e baixa; operação expõe a execução
-- que o portal já consumia; contratos ganham ciclo de vida; acessos passam a
-- expirar/revogar; toda mutação relevante pode entrar numa auditoria única.

ALTER TABLE todogreen_financial_entries ADD COLUMN due_date TEXT;
ALTER TABLE todogreen_financial_entries ADD COLUMN paid_at TEXT;
ALTER TABLE todogreen_financial_entries ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE todogreen_financial_entries ADD COLUMN counterparty TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN document_number TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN cost_center TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN budget_code TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN payment_method TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN competence_date TEXT;
ALTER TABLE todogreen_financial_entries ADD COLUMN contract_id TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_financial_entries ADD COLUMN invoice_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_todogreen_financial_due
  ON todogreen_financial_entries
    (tenant_id, workspace_owner_id, invoice_status, due_date, archived_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_financial_contract
  ON todogreen_financial_entries
    (tenant_id, workspace_owner_id, contract_id, reference_month DESC);

CREATE TABLE IF NOT EXISTS todogreen_financial_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES todogreen_financial_entries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_financial_payments_entry
  ON todogreen_financial_payments
    (tenant_id, workspace_owner_id, entry_id, paid_at DESC);

ALTER TABLE todogreen_contracts ADD COLUMN signature_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE todogreen_contracts ADD COLUMN signed_at TEXT;
ALTER TABLE todogreen_contracts ADD COLUMN renewal_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE todogreen_contracts ADD COLUMN renewal_notice_date TEXT;
ALTER TABLE todogreen_contracts ADD COLUMN billing_day INTEGER;
ALTER TABLE todogreen_contracts ADD COLUMN responsible_user_id TEXT;
ALTER TABLE todogreen_contracts ADD COLUMN notice_days INTEGER NOT NULL DEFAULT 60;
ALTER TABLE todogreen_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_todogreen_contracts_renewal
  ON todogreen_contracts
    (tenant_id, workspace_owner_id, status, renewal_notice_date, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_contract_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  actor_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (contract_id) REFERENCES todogreen_contracts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_contract_events_contract
  ON todogreen_contract_events
    (workspace_owner_id, contract_id, created_at DESC);

ALTER TABLE todogreen_access_emails ADD COLUMN expires_at TEXT;
ALTER TABLE todogreen_access_emails ADD COLUMN revoked_at TEXT;
ALTER TABLE todogreen_access_emails ADD COLUMN last_access_at TEXT;

CREATE INDEX IF NOT EXISTS idx_todogreen_access_expiry
  ON todogreen_access_emails (tenant_id, status, expires_at);

CREATE TABLE IF NOT EXISTS todogreen_audit_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL DEFAULT '',
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_todogreen_audit_scope
  ON todogreen_audit_events
    (tenant_id, workspace_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_audit_resource
  ON todogreen_audit_events
    (workspace_owner_id, resource_type, resource_id, created_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_intelligence_watches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  focus TEXT NOT NULL DEFAULT 'company',
  next_run_at TEXT NOT NULL,
  last_run_at TEXT,
  last_status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, workspace_owner_id, client_id),
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_intelligence_watches_due
  ON todogreen_intelligence_watches (enabled, next_run_at);

CREATE INDEX IF NOT EXISTS idx_todogreen_clients_workspace_name
  ON todogreen_clients (tenant_id, workspace_owner_id, archived_at, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_todogreen_assignments_workspace_lookup
  ON todogreen_client_assignments (tenant_id, status, seller_email, client_id);
