-- Canais externos que entregam mensagens para dentro da caixa unificada.
-- provider_account_id é o identificador que vem no webhook: Phone Number ID
-- no WhatsApp Cloud API, e-mail ou domínio no provedor de inbound mail.
CREATE TABLE IF NOT EXISTS inbound_channels (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_account_id),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inbound_channels_owner
  ON inbound_channels (workspace_owner_id, provider, active);
