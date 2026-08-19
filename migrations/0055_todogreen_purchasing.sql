-- ===== Compras: da requisição ao recebimento =====
--
-- A vertical já tinha RFQ de fornecedor no app monolítico (`db.supplierRfqs`):
-- pedir cotação, registrar propostas, comparar e escolher. O que faltava era
-- tudo em volta:
--
--   • ANTES da cotação: alguém precisa PEDIR a compra. Hoje a RFQ nasce do nada,
--     sem requisitante, sem justificativa e sem aprovação.
--   • DEPOIS da escolha: o fornecedor escolhido não virava pedido, o pedido não
--     virava recebimento, e o recebimento não entrava no estoque nem gerava
--     conta a pagar. A jornada terminava em "fornecedor selecionado".
--
-- Estas quatro tabelas fecham a corrente. O elo com o estoque é o movimento com
-- `origin_type = 'recebimento'`, e o elo com o financeiro é o lançamento em
-- `todogreen_financial_entries` — nenhuma das duas pontas ganha cópia dos dados.
--
-- A decisão que organiza o desenho: QUANTIDADE RECEBIDA NÃO É COLUNA.
-- Guardar `received_quantity` na linha do pedido criaria o mesmo defeito do
-- estoque mutável — um número que precisa ser mantido em sincronia com os
-- recebimentos e que divergiria no primeiro recebimento concorrente. A
-- quantidade recebida é a soma dos recebimentos, e por isso o `status` do pedido
-- também não diz "recebido": o estado de recebimento é derivado
-- (`recepcaoDoPedido`, em purchaseDomain.js), enquanto o `status` guarda só o
-- que é decisão de gente (rascunho, aprovado, enviado, encerrado, cancelado).

-- ---------------------------------------------------------------------------
-- Requisição: quem pediu, por quê, para quando
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todogreen_purchase_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  document_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  justification TEXT NOT NULL DEFAULT '',
  -- Quem precisa. Distinto de `created_by`: um assistente pode registrar a
  -- requisição de outra pessoa, e o relatório de consumo tem de apontar para
  -- quem consome.
  requester_user_id TEXT NOT NULL DEFAULT '',
  cost_center_id TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  needed_by TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'pendente', 'aprovada', 'recusada', 'atendida', 'cancelada')),
  -- Itens: [{itemId, descricao, quantidade, unidade}]. Em JSON porque a linha da
  -- requisição só é lida com a requisição inteira — diferente da linha do
  -- PEDIDO, que precisa ser somada por material para conferir recebimento.
  items_json TEXT NOT NULL DEFAULT '[]',
  approved_by TEXT,
  approved_at TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_purchase_requests_espaco
  ON todogreen_purchase_requests (workspace_owner_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_purchase_requests_fila
  ON todogreen_purchase_requests (workspace_owner_id, status, needed_by);

-- ---------------------------------------------------------------------------
-- Pedido de compra
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todogreen_purchase_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  document_number TEXT NOT NULL DEFAULT '',
  -- O fornecedor é uma PARTE (todogreen_parties), não um nome de texto. O
  -- monólito liga proposta a contato por nome em minúsculas, e é assim que dois
  -- fornecedores com a mesma grafia viram um só.
  supplier_party_id TEXT NOT NULL,
  request_id TEXT NOT NULL DEFAULT '',
  -- Quando o pedido nasceu de uma RFQ do app, guardamos a origem para a
  -- auditoria poder chegar na cotação que justificou o preço.
  rfq_id TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT NOT NULL DEFAULT '',
  cost_center_id TEXT NOT NULL DEFAULT '',
  -- Só o que é decisão de gente. O estado de RECEBIMENTO é derivado dos
  -- recebimentos, nunca gravado aqui — senão o status diria "recebido" enquanto
  -- os recebimentos dizem outra coisa.
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'aprovado', 'enviado', 'encerrado', 'cancelado')),
  approval_status TEXT NOT NULL DEFAULT 'nao_requerida'
    CHECK (approval_status IN ('nao_requerida', 'pendente', 'aprovada', 'recusada')),
  approved_by TEXT,
  approved_at TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
  freight REAL NOT NULL DEFAULT 0,
  taxes REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  -- Total gravado como RETRATO do momento da aprovação, para a alçada poder ser
  -- auditada contra o valor que foi de fato aprovado. O total corrente continua
  -- sendo calculado das linhas (`totalDoPedido`); divergência entre os dois é
  -- justamente o sinal de que o pedido mudou depois de aprovado.
  approved_total REAL NOT NULL DEFAULT 0,
  payment_term_days INTEGER NOT NULL DEFAULT 0,
  expected_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
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
CREATE INDEX IF NOT EXISTS idx_todogreen_purchase_orders_espaco
  ON todogreen_purchase_orders (workspace_owner_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_purchase_orders_fornecedor
  ON todogreen_purchase_orders (workspace_owner_id, supplier_party_id, status);
CREATE INDEX IF NOT EXISTS idx_todogreen_purchase_orders_requisicao
  ON todogreen_purchase_orders (workspace_owner_id, request_id)
  WHERE request_id <> '';

-- A linha do pedido é tabela, não JSON: ela precisa ser somada por material
-- para conferir quanto já foi recebido, e um JSON obrigaria a carregar todos os
-- pedidos para responder "quanto deste item está a caminho?".
CREATE TABLE IF NOT EXISTS todogreen_purchase_order_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  item_id TEXT NOT NULL DEFAULT '',
  -- Descrição livre para serviço e material sem cadastro. Compra de serviço é
  -- rotina e não tem SKU; exigir `item_id` obrigaria a inventar material.
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'UN',
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL DEFAULT 1,
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES todogreen_purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_po_items_pedido
  ON todogreen_purchase_order_items (order_id, line_number);
CREATE INDEX IF NOT EXISTS idx_todogreen_po_items_material
  ON todogreen_purchase_order_items (workspace_owner_id, item_id)
  WHERE item_id <> '';

-- ---------------------------------------------------------------------------
-- Recebimento
-- ---------------------------------------------------------------------------
--
-- Um pedido pode ter vários recebimentos (entrega parcelada é a regra, não a
-- exceção). Cada recebimento é imutável depois de lançado: ele já gerou
-- movimento de estoque e, quando pedido, título a pagar. Corrigir um
-- recebimento errado é lançar outro, com quantidade negativa? Não — devolução é
-- um recebimento com `kind = 'devolucao'`, para o relatório poder separar o que
-- entrou do que voltou.
CREATE TABLE IF NOT EXISTS todogreen_goods_receipts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  document_number TEXT NOT NULL DEFAULT '',
  order_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'recebimento'
    CHECK (kind IN ('recebimento', 'devolucao')),
  -- Nota fiscal do fornecedor, quando houver. A chave de 44 dígitos é o que
  -- permite casar este recebimento com o XML importado depois, no módulo fiscal.
  invoice_number TEXT NOT NULL DEFAULT '',
  invoice_key TEXT NOT NULL DEFAULT '',
  -- Linhas recebidas: [{orderItemId, quantidade, custoUnitario}]. Em JSON porque
  -- o recebimento é sempre lido inteiro; o que precisa ser somado por material
  -- são os MOVIMENTOS que ele gera, e esses estão em
  -- todogreen_stock_movements com origin_id = este id.
  lines_json TEXT NOT NULL DEFAULT '[]',
  received_at TEXT NOT NULL,
  -- O que foi gerado a partir deste recebimento. Guardar os ids torna o
  -- lançamento idempotente e auditável: dá para provar que um recebimento não
  -- gerou estoque duas vezes.
  stock_posted_at TEXT,
  financial_entry_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (order_id) REFERENCES todogreen_purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_receipts_espaco
  ON todogreen_goods_receipts (workspace_owner_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_receipts_pedido
  ON todogreen_goods_receipts (order_id, received_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_receipts_nota
  ON todogreen_goods_receipts (workspace_owner_id, invoice_key)
  WHERE invoice_key <> '';
