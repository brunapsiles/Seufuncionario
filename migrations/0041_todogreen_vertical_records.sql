-- ===== Camada única de persistência da vertical =====
--
-- Metade da vertical já vivia no D1 (clientes, carteiras, solicitações,
-- portal, ESG, Tracker, painéis, régua). A outra metade — simulações de preço,
-- propostas, oportunidades, operações, receitas, custos e comissões — vivia no
-- estado genérico do espaço de trabalho, um único JSON por usuário.
--
-- O que isso custava, na prática:
--   • duas pessoas no mesmo espaço sobrescreviam o trabalho uma da outra,
--     porque a gravação é do documento inteiro;
--   • o portal do cliente não enxergava nada escrito por dentro;
--   • auditoria e versionamento existiam de um lado e não do outro;
--   • o painel somava fontes diferentes, com identificadores que não casavam.
--
-- As tabelas abaixo fecham essa metade. `pricing_scenarios` já existia desde a
-- 0027 e só ganha a procedência das premissas.
--
-- Convenções seguidas de propósito, iguais às do resto da vertical:
--   • tenant_id + workspace_owner_id em toda linha (o isolamento é da linha,
--     não da consulta que alguém lembrou de escrever);
--   • revision para escrita concorrente;
--   • archived_at em vez de DELETE, para o histórico sobreviver;
--   • *_json para o que é payload de domínio, com coluna própria só para o que
--     precisa ser filtrado ou somado.

-- Procedência das premissas da simulação: quem declarou que os números vieram
-- do cliente ou de medição, e quando. Sem isso, uma proposta antiga não tem
-- como provar que não nasceu de chute.
ALTER TABLE pricing_scenarios ADD COLUMN premises_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS todogreen_opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Mapeamento',
  monthly_value REAL NOT NULL DEFAULT 0,
  contract_value REAL NOT NULL DEFAULT 0,
  distance_km REAL NOT NULL DEFAULT 0,
  trips_per_month REAL NOT NULL DEFAULT 0,
  vehicle_type TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT,
  last_interaction_at TEXT,
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_opportunities_espaco
  ON todogreen_opportunities (workspace_owner_id, archived_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  opportunity_id TEXT NOT NULL DEFAULT '',
  -- A simulação de onde saiu o preço. É por este campo que a proposta prova a
  -- própria origem — e é ele que impede proposta sem cálculo por trás.
  scenario_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  commercial_terms TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '',
  proposal_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_proposals_espaco
  ON todogreen_proposals (workspace_owner_id, archived_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  reference_month TEXT NOT NULL DEFAULT '',
  deliveries REAL NOT NULL DEFAULT 0,
  packages REAL NOT NULL DEFAULT 0,
  trips REAL NOT NULL DEFAULT 0,
  distance_km REAL NOT NULL DEFAULT 0,
  occupancy_percent REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_operations_espaco
  ON todogreen_operations (workspace_owner_id, archived_at, updated_at DESC);

-- Receita, custo e comissão numa tabela só, separadas por `kind`. São o mesmo
-- lançamento com sinal e destino diferentes; em tabelas separadas, todo
-- relatório vira união de três consultas que precisam concordar entre si.
CREATE TABLE IF NOT EXISTS todogreen_financial_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('revenue', 'cost', 'commission')),
  client_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  scenario_id TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  reference_month TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_financial_espaco
  ON todogreen_financial_entries (workspace_owner_id, kind, archived_at, reference_month DESC);
