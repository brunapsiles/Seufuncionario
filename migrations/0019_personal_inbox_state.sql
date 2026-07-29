-- Estado pessoal da caixa de entrada de trabalho.
-- Os eventos continuam derivados dos módulos de origem; apenas leitura e
-- adiamento são persistidos por pessoa, sem alterar o estado de outros membros.
CREATE TABLE IF NOT EXISTS personal_inbox_state (
  workspace_owner_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  read_at TEXT,
  snoozed_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_owner_id, user_id, item_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personal_inbox_state_user
  ON personal_inbox_state (workspace_owner_id, user_id, updated_at DESC);
