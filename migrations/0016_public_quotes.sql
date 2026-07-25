-- Link público de orçamento: o dono compartilha um link; o cliente vê o
-- orçamento e aprova/recusa online. Guarda um SNAPSHOT do orçamento (que
-- vive no blob JSON do dono) numa tabela relacional acessível ao worker
-- público, sem expor o workspace inteiro.
CREATE TABLE IF NOT EXISTS public_quotes (
  token TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TEXT NOT NULL,
  decided_at TEXT,
  UNIQUE (owner_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_public_quotes_owner
  ON public_quotes (owner_id);
