-- Caixa de entrada unificada / linha do tempo por contato.
-- Primeira coleção de alto volume e múltiplos autores movida para uma tabela
-- relacional real (fora do blob JSON do workspace), com escopo por espaço.
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  contact_id TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_handle TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'out',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_space_date
  ON interactions (workspace_owner_id, created_at);

CREATE INDEX IF NOT EXISTS idx_interactions_space_contact
  ON interactions (workspace_owner_id, contact_id);
