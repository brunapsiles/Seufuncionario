CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, member_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS memberships_member_idx ON memberships(member_id);
CREATE INDEX IF NOT EXISTS memberships_owner_idx ON memberships(owner_id);
