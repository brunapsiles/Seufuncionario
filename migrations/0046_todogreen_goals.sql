-- ===== Metas da vertical To Do Green =====
--
-- Meta não é dashboard. O dashboard apresenta números; a meta guarda o alvo,
-- o período, o responsável, a fonte, a regra de medição, os check-ins e tudo
-- o que aconteceu depois que o compromisso foi assumido.
--
-- Regras estruturais:
--   • toda linha carrega tenant e workspace para o isolamento não depender da
--     memória de quem escrever a consulta;
--   • meta iniciada é versionada, nunca reescrita sem histórico;
--   • check-in, snapshot e evento são somente inserção;
--   • ação tem revision porque é trabalho em andamento e pode ser atualizada;
--   • exclusão é arquivamento para preservar a prestação de contas.

CREATE TABLE IF NOT EXISTS todogreen_goals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  parent_goal_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('commercial','financial','operational','esg','management')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('company','area','team','person','seller','client','contract','product','operation','route','fleet','project')),
  scope_id TEXT NOT NULL DEFAULT '',
  scope_label TEXT NOT NULL DEFAULT '',
  metric_key TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'number',
  direction TEXT NOT NULL DEFAULT 'increase' CHECK (direction IN ('increase','decrease','range')),
  measurement_mode TEXT NOT NULL DEFAULT 'manual' CHECK (measurement_mode IN ('manual','automatic')),
  source_key TEXT NOT NULL DEFAULT 'manual',
  source_label TEXT NOT NULL DEFAULT 'Atualização manual controlada',
  formula TEXT NOT NULL DEFAULT '',
  baseline_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL,
  current_value REAL NOT NULL DEFAULT 0,
  range_min REAL,
  range_max REAL,
  weight REAL NOT NULL DEFAULT 100,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly' CHECK (cadence IN ('weekly','biweekly','monthly','quarterly','annual','custom')),
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT '',
  owner_label TEXT NOT NULL DEFAULT '',
  evidence_required INTEGER NOT NULL DEFAULT 0,
  thresholds_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','blocked','achieved','closed','cancelled')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','not_required')),
  version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  closed_by TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_goal_id) REFERENCES todogreen_goals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_todogreen_goals_scope
  ON todogreen_goals (tenant_id, workspace_owner_id, archived_at, period_end, status);
CREATE INDEX IF NOT EXISTS idx_todogreen_goals_owner
  ON todogreen_goals (tenant_id, workspace_owner_id, owner_user_id, archived_at, period_end);
CREATE INDEX IF NOT EXISTS idx_todogreen_goals_client
  ON todogreen_goals (tenant_id, workspace_owner_id, scope_type, scope_id, archived_at);

CREATE TABLE IF NOT EXISTS todogreen_goal_assignees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  label TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner','participant','reviewer','validator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (goal_id, email, role),
  FOREIGN KEY (goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_goal_assignees_lookup
  ON todogreen_goal_assignees (tenant_id, workspace_owner_id, email, status);

CREATE TABLE IF NOT EXISTS todogreen_goal_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  measured_value REAL NOT NULL,
  attainment_percent REAL NOT NULL,
  health_status TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_details_json TEXT NOT NULL DEFAULT '{}',
  measured_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_goal_snapshots_goal
  ON todogreen_goal_snapshots (goal_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_goal_checkins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  measured_value REAL,
  narrative TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '',
  next_steps TEXT NOT NULL DEFAULT '',
  evidence_url TEXT NOT NULL DEFAULT '',
  evidence_note TEXT NOT NULL DEFAULT '',
  next_review_at TEXT,
  created_by TEXT NOT NULL,
  created_by_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_goal_checkins_goal
  ON todogreen_goal_checkins (goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS todogreen_goal_actions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  owner_label TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done','cancelled')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  archived_at TEXT,
  FOREIGN KEY (goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_goal_actions_goal
  ON todogreen_goal_actions (goal_id, archived_at, status, due_at);

CREATE TABLE IF NOT EXISTS todogreen_goal_links (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  parent_goal_id TEXT NOT NULL,
  child_goal_id TEXT NOT NULL,
  contribution_weight REAL NOT NULL DEFAULT 100,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (parent_goal_id, child_goal_id),
  FOREIGN KEY (parent_goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE,
  FOREIGN KEY (child_goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todogreen_goal_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  workspace_owner_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_label TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES todogreen_goals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_goal_events_goal
  ON todogreen_goal_events (goal_id, created_at DESC);
