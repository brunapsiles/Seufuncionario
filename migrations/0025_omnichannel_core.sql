-- Núcleo omnichannel relacional. A tabela interactions continua como
-- compatibilidade da inbox atual; estas tabelas passam a ser a base canônica
-- para contatos, conversas, mensagens e entrega por provedor.
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  normalized_handle TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_owner_id, normalized_handle),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner_updated
  ON contacts (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS channel_accounts (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  channel TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  capabilities_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_owner_id, provider, account_identifier),
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_accounts_owner_channel
  ON channel_accounts (workspace_owner_id, channel, active);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  contact_id TEXT,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to TEXT,
  last_message_at TEXT NOT NULL,
  last_message_preview TEXT NOT NULL DEFAULT '',
  unread_count INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_last
  ON conversations (workspace_owner_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_status
  ON conversations (workspace_owner_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_contact
  ON conversations (workspace_owner_id, contact_id, channel);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  interaction_id TEXT UNIQUE,
  author_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_date
  ON conversation_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_owner_date
  ON conversation_messages (workspace_owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS message_deliveries (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT NOT NULL DEFAULT '',
  attempt_count INTEGER NOT NULL DEFAULT 1,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT,
  delivered_at TEXT,
  failed_at TEXT,
  FOREIGN KEY (message_id) REFERENCES conversation_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_message
  ON message_deliveries (message_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_owner_status
  ON message_deliveries (workspace_owner_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_notes (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_notes_conversation_date
  ON conversation_notes (conversation_id, created_at DESC);
