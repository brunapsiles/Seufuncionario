CREATE TABLE IF NOT EXISTS todogreen_work_boards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  specialist TEXT NOT NULL DEFAULT 'projects',
  object_types_json TEXT NOT NULL DEFAULT '[]',
  permissions_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 100,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tdg_work_boards_owner
  ON todogreen_work_boards (workspace_owner_id, status, display_order);

CREATE TABLE IF NOT EXISTS todogreen_work_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tarefa',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'novo',
  priority TEXT NOT NULL DEFAULT 'media',
  responsible_user_id TEXT,
  responsible_label TEXT NOT NULL DEFAULT '',
  client_label TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  fields_json TEXT NOT NULL DEFAULT '{}',
  relations_json TEXT NOT NULL DEFAULT '[]',
  dependencies_json TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (board_id) REFERENCES todogreen_work_boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tdg_work_items_board
  ON todogreen_work_items (workspace_owner_id, board_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tdg_work_items_responsible
  ON todogreen_work_items (workspace_owner_id, responsible_user_id, archived_at, due_date);
CREATE INDEX IF NOT EXISTS idx_tdg_work_items_status
  ON todogreen_work_items (workspace_owner_id, status, priority, due_date);

CREATE TABLE IF NOT EXISTS todogreen_work_item_events (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tdg_work_events_item
  ON todogreen_work_item_events (workspace_owner_id, item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_work_comments (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  mentions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tdg_work_comments_item
  ON todogreen_work_comments (workspace_owner_id, item_id, archived_at, created_at);
