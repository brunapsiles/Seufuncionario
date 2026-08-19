-- ===== Estoque: o saldo é a soma dos movimentos, nunca uma coluna =====
--
-- O catálogo do app monolítico guarda estoque como número mutável e dá baixa
-- com `Math.max(0, stock - quantidade)` (src/features/catalog/CatalogScreen.jsx).
-- Isso tem dois defeitos que só aparecem quando já é tarde:
--
--   1. Vender acima do saldo não dá erro — o estoque vai a zero e a informação
--      de que faltou mercadoria simplesmente desaparece;
--   2. Não existe história. Ninguém consegue responder "por que o saldo é 3?",
--      porque as entradas e saídas que levaram até o 3 nunca foram guardadas.
--
-- Aqui o movimento é o registro, e o saldo é `SUM(quantidade × sinal)`. É o
-- mesmo desenho que `todogreen_financial_entries` e `todogreen_deal_desk_events`
-- já usam: lançamento imutável, número derivado.
--
-- Por que o sinal sai do `kind` e a quantidade é sempre positiva:
-- quantidade com sinal convida a `-(-5)` e a somas que dão o oposto do
-- esperado. Com `quantity > 0` garantido pelo CHECK e o sinal derivado do tipo,
-- não existe movimento ambíguo.
--
-- Por que transferência não é um tipo:
-- transferir é sair de um depósito e entrar em outro. Como UM registro, o saldo
-- por depósito precisaria de um caso especial em toda consulta. Como DOIS
-- registros ligados por `transfer_group`, `SUM` por depósito continua certo sem
-- exceção nenhuma.

CREATE TABLE IF NOT EXISTS todogreen_stock_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('entrada', 'saida', 'ajuste_entrada', 'ajuste_saida')),
  -- Sempre positiva. O sinal é função do `kind`, em SINAL_DO_MOVIMENTO
  -- (stockDomain.js), para não haver duas convenções de sinal no produto.
  quantity REAL NOT NULL CHECK (quantity > 0),
  -- Custo unitário da ENTRADA. Saída não declara custo: ela consome o custo
  -- médio móvel calculado a partir das entradas anteriores. Deixar a saída
  -- declarar custo permitiria baixar caro o que entrou barato.
  unit_cost REAL NOT NULL DEFAULT 0,
  -- De onde veio o movimento: recebimento de compra, consumo de ordem de
  -- serviço, nota fiscal, inventário. Sem FK porque as tabelas de origem
  -- chegam em migrações seguintes e o movimento não pode depender delas para
  -- existir — nem sumir quando a origem for arquivada.
  origin_type TEXT NOT NULL DEFAULT '',
  origin_id TEXT NOT NULL DEFAULT '',
  origin_number TEXT NOT NULL DEFAULT '',
  -- As duas pontas de uma transferência compartilham este valor.
  transfer_group TEXT NOT NULL DEFAULT '',
  -- Quando aconteceu, que é diferente de quando foi digitado. Lançamento
  -- retroativo é rotina em operação, e ordenar por `created_at` faria o custo
  -- médio ser calculado fora de ordem.
  occurred_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
-- Sem `archived_at` e sem `revision` de propósito: movimento de estoque não é
-- editado nem apagado. Errou? Lança o ajuste contrário, e as duas linhas ficam
-- visíveis. É o que permite auditar o saldo em vez de acreditar nele.

-- O índice que sustenta toda leitura de saldo.
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_saldo
  ON todogreen_stock_movements (workspace_owner_id, item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_ordem
  ON todogreen_stock_movements (workspace_owner_id, item_id, occurred_at, created_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_origem
  ON todogreen_stock_movements (workspace_owner_id, origin_type, origin_id)
  WHERE origin_id <> '';
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_transferencia
  ON todogreen_stock_movements (workspace_owner_id, transfer_group)
  WHERE transfer_group <> '';

-- ===== Inventário (contagem) =====
--
-- A contagem guarda o saldo do sistema NO MOMENTO da contagem, não só o
-- contado. Sem esse retrato, reabrir um inventário antigo compararia o contado
-- de ontem com o saldo de hoje e acusaria uma divergência que não existiu.
CREATE TABLE IF NOT EXISTS todogreen_stock_counts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  document_number TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  -- Linhas da contagem: [{itemId, contado, saldoSistema}]. Vive em JSON porque
  -- só é lida com o inventário inteiro; o que precisa ser somado e auditado
  -- individualmente são os movimentos de ajuste que o fechamento gera.
  lines_json TEXT NOT NULL DEFAULT '[]',
  counted_at TEXT NOT NULL,
  closed_at TEXT,
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
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_counts_espaco
  ON todogreen_stock_counts (workspace_owner_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todogreen_stock_counts_deposito
  ON todogreen_stock_counts (workspace_owner_id, warehouse_id, status);
