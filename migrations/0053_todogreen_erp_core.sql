-- ===== Cadastros de base do ERP =====
--
-- A vertical já sabia vender e operar: cliente, oportunidade, proposta, preço,
-- operação e lançamento financeiro. O que faltava era o chão embaixo disso —
-- os cadastros que um ERP consulta antes de qualquer movimento:
--
--   • O QUE se movimenta       → todogreen_items (material, com unidade e NCM)
--   • DE ONDE / PARA ONDE      → todogreen_warehouses (depósito)
--   • CONTRA QUEM             → todogreen_parties (a mesma empresa é cliente,
--                                fornecedor e transportadora; o papel é atributo,
--                                não uma tabela por papel)
--   • EM QUE CONTA             → todogreen_chart_of_accounts (plano de contas)
--   • CONTRA QUE ORÇAMENTO     → todogreen_cost_centers (centro de custo)
--   • COM QUE NÚMERO           → todogreen_document_series (numeração sequencial)
--
-- Por que `todogreen_parties` e não reaproveitar `todogreen_clients`:
-- `todogreen_clients` é o cadastro canônico da CONTA COMERCIAL — carteira,
-- score, portal, inteligência 360. Um fornecedor de pneu não é uma conta
-- comercial e não deve aparecer na carteira de ninguém. Mas a mesma empresa
-- pode ser as duas coisas, e é por isso que `party` aponta para `client_id`
-- quando existir vínculo, em vez de duplicar o cadastro. O AGENTS.md é
-- explícito: "Não criar uma segunda coleção de clientes nem ligar contas por
-- nome quando houver identificador."
--
-- Por que numeração em tabela e não `MAX(numero) + 1`:
-- duas requisições simultâneas leriam o mesmo MAX e gravariam o mesmo número.
-- A série guarda o próximo valor e é incrementada de forma atômica no UPDATE,
-- que é o único jeito de dois pedidos concorrentes receberem números distintos.
-- E é por isso que a numeração é reservada no servidor, nunca calculada na tela.
--
-- Convenções seguidas de propósito, iguais às do resto da vertical (ver 0041):
--   • tenant_id + workspace_owner_id em toda linha (o isolamento é da linha,
--     não da consulta que alguém lembrou de escrever);
--   • revision para escrita concorrente;
--   • archived_at em vez de DELETE, para o histórico sobreviver;
--   • *_json para o que é payload de domínio, com coluna própria só para o que
--     precisa ser filtrado ou somado.

-- O material. Distinto de `logistics_products`, que é catálogo de SERVIÇO
-- logístico (modalidade, unidade de cobrança, régua de preço) e não tem saldo.
-- Aqui é o que entra e sai de um depósito: pneu, bateria, peça, insumo.
CREATE TABLE IF NOT EXISTS todogreen_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'UN',
  category TEXT NOT NULL DEFAULT '',
  -- NCM e CEST ficam no item porque a nota fiscal os exige por linha, e
  -- descobri-los no momento da emissão seria tarde.
  ncm TEXT NOT NULL DEFAULT '',
  cest TEXT NOT NULL DEFAULT '',
  -- Custo de referência para orçar e para valorizar a primeira entrada. O custo
  -- REAL do estoque é sempre derivado dos movimentos (média móvel), nunca esta
  -- coluna — ela é premissa, não saldo.
  standard_cost REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_items_espaco
  ON todogreen_items (workspace_owner_id, archived_at, updated_at DESC);
-- O SKU é único por espaço, mas só entre os vivos: arquivar um item não pode
-- impedir de cadastrar outro com o mesmo código depois. Mesmo desenho do índice
-- de placa em todogreen_fleet_vehicles (0031).
CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_items_codigo
  ON todogreen_items (workspace_owner_id, code)
  WHERE code <> '' AND archived_at IS NULL;

-- O depósito. `kind` distingue o que é nosso do que está em poder de terceiro
-- ou dentro de um veículo — estoque em trânsito continua sendo estoque, e somar
-- tudo num número só esconde exatamente o que a operação precisa ver.
CREATE TABLE IF NOT EXISTS todogreen_warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'proprio'
    CHECK (kind IN ('proprio', 'terceiro', 'veiculo', 'transito')),
  -- Quando kind = 'veiculo', aponta para todogreen_fleet_vehicles. Sem FK
  -- porque o depósito sobrevive à baixa do veículo (o histórico de movimentos
  -- precisa continuar legível).
  vehicle_id TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_warehouses_espaco
  ON todogreen_warehouses (workspace_owner_id, archived_at, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_warehouses_codigo
  ON todogreen_warehouses (workspace_owner_id, code)
  WHERE code <> '' AND archived_at IS NULL;

-- Cliente, fornecedor e transportadora na mesma tabela, separados por papel.
-- Em tabelas separadas, a transportadora que também é cliente viraria dois
-- cadastros com dois CNPJs iguais e dois endereços que divergem na primeira
-- atualização.
CREATE TABLE IF NOT EXISTS todogreen_parties (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  -- O vínculo com a conta comercial, quando existir. É por aqui que o ERP
  -- alcança carteira, score e portal sem duplicar o cadastro.
  client_id TEXT NOT NULL DEFAULT '',
  -- Só dígitos, normalizado na entrada. Guardar com pontuação faria duas
  -- grafias do mesmo CNPJ virarem dois fornecedores.
  document TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL DEFAULT '',
  -- Um array: ["cliente","fornecedor"]. Coluna booleana por papel obrigaria
  -- uma migração a cada papel novo.
  roles_json TEXT NOT NULL DEFAULT '[]',
  state_registration TEXT NOT NULL DEFAULT '',
  city_registration TEXT NOT NULL DEFAULT '',
  -- Regime do DESTINATÁRIO, que decide a tributação da nota emitida para ele.
  tax_regime TEXT NOT NULL DEFAULT '',
  address_json TEXT NOT NULL DEFAULT '{}',
  -- Prazo padrão em dias para o vencimento do título gerado contra esta parte.
  payment_term_days INTEGER NOT NULL DEFAULT 0,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_parties_espaco
  ON todogreen_parties (workspace_owner_id, archived_at, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_parties_documento
  ON todogreen_parties (workspace_owner_id, document)
  WHERE document <> '' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todogreen_parties_conta
  ON todogreen_parties (workspace_owner_id, client_id)
  WHERE client_id <> '';

-- O plano de contas. Hoje `todogreen_financial_entries.category` é texto livre,
-- então "Combustível", "combustivel" e "Comb." são três linhas do relatório.
-- A conta dá o eixo estável; a categoria livre continua valendo como detalhe.
CREATE TABLE IF NOT EXISTS todogreen_chart_of_accounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'despesa'
    CHECK (kind IN ('receita', 'despesa', 'ativo', 'passivo', 'resultado')),
  parent_id TEXT NOT NULL DEFAULT '',
  -- Conta sintética agrupa e não recebe lançamento; analítica é folha. Sem essa
  -- distinção, um lançamento no pai e outro no filho contam duas vezes no total.
  analytical INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_accounts_espaco
  ON todogreen_chart_of_accounts (workspace_owner_id, archived_at, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_accounts_codigo
  ON todogreen_chart_of_accounts (workspace_owner_id, code)
  WHERE code <> '' AND archived_at IS NULL;

-- O centro de custo. A vertical já tem o conceito solto como campo de veículo
-- (todoGreenFleetDomain.js); aqui ele passa a ser cadastro, para que custo de
-- frota, de operação e de folha caiam no mesmo eixo de rateio.
CREATE TABLE IF NOT EXISTS todogreen_cost_centers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  parent_id TEXT NOT NULL DEFAULT '',
  -- Responsável pelo centro de custo, para o relatório ter a quem perguntar.
  owner_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_cost_centers_espaco
  ON todogreen_cost_centers (workspace_owner_id, archived_at, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_todogreen_cost_centers_codigo
  ON todogreen_cost_centers (workspace_owner_id, code)
  WHERE code <> '' AND archived_at IS NULL;

-- A numeração. Uma linha por tipo de documento e série; `next_number` é o
-- próximo a entregar. Sem revision de propósito: a trava aqui é o próprio
-- UPDATE atômico que incrementa, e um controle otimista por cima faria duas
-- reservas simultâneas falharem em vez de receberem números diferentes.
CREATE TABLE IF NOT EXISTS todogreen_document_series (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('requisicao', 'pedido_compra', 'recebimento',
                        'ordem_servico', 'nota_fiscal', 'titulo', 'inventario')),
  series TEXT NOT NULL DEFAULT '1',
  prefix TEXT NOT NULL DEFAULT '',
  next_number INTEGER NOT NULL DEFAULT 1,
  padding INTEGER NOT NULL DEFAULT 6,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, workspace_owner_id, doc_type, series),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_document_series_espaco
  ON todogreen_document_series (workspace_owner_id, doc_type, series);
