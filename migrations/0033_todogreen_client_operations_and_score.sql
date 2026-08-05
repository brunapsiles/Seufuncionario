-- Operações por cliente e Green Score versionado.
--
-- As operações são o que o cliente vê na sala dele: cada viagem, entrega ou
-- coleta que a To Do Green executou para aquele cliente. Ficam em tabela
-- própria, com client_id, porque é por esse campo que o isolamento acontece —
-- e porque uma operação logística não cabe no JSON do espaço de trabalho.
--
-- O Green Score é indicador proprietário, nunca certificação. Por isso guarda
-- a versão dos pesos, as entradas e a memória do cálculo: sem isso ele não é
-- auditável, e um número ambiental que não se reproduz não vale para relatório
-- de conselho nem para inventário de Escopo 3.

CREATE TABLE IF NOT EXISTS todogreen_client_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  contract_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planejada',
  service_date TEXT,
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  sla_status TEXT NOT NULL DEFAULT '',
  incident_count INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_operations_scope
  ON todogreen_client_operations (tenant_id, client_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_todogreen_client_operations_contract
  ON todogreen_client_operations (tenant_id, client_id, contract_id, status);

-- Conjunto de pesos do Green Score. Versionado: mudar peso não reescreve o
-- passado, cria uma versão nova, e todo score guarda com qual versão nasceu.
CREATE TABLE IF NOT EXISTS todogreen_score_weights (
  version TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  weights_json TEXT NOT NULL,
  methodology TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todogreen_score_weights_active
  ON todogreen_score_weights (tenant_id, status, effective_from DESC);

CREATE TABLE IF NOT EXISTS todogreen_green_scores (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  client_id TEXT NOT NULL,
  -- cliente | contrato | operacao | rota | produto
  scope_type TEXT NOT NULL DEFAULT 'cliente',
  scope_id TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL,
  components_json TEXT NOT NULL DEFAULT '{}',
  inputs_json TEXT NOT NULL DEFAULT '{}',
  weights_version TEXT NOT NULL,
  data_quality INTEGER NOT NULL DEFAULT 0,
  -- Explicação legível da variação em relação ao score anterior do mesmo
  -- escopo. É o que responde "por que caiu?" sem precisar de analista.
  variation_explanation TEXT NOT NULL DEFAULT '',
  previous_score REAL,
  calculated_by TEXT NOT NULL,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES todogreen_clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_todogreen_green_scores_scope
  ON todogreen_green_scores (tenant_id, client_id, scope_type, scope_id, calculated_at DESC);
