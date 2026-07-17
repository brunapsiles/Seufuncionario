ALTER TABLE invites ADD COLUMN token TEXT;
ALTER TABLE invites ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE invites ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE invites ADD COLUMN status TEXT NOT NULL DEFAULT 'enviado';
ALTER TABLE invites ADD COLUMN function_title TEXT NOT NULL DEFAULT '';
ALTER TABLE invites ADD COLUMN bond_type TEXT NOT NULL DEFAULT '';
ALTER TABLE invites ADD COLUMN direct_manager_id TEXT;
ALTER TABLE invites ADD COLUMN accepted_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_idx ON invites(token);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites(email);
CREATE INDEX IF NOT EXISTS invites_owner_status_idx ON invites(owner_id, status);

ALTER TABLE memberships ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo';
ALTER TABLE memberships ADD COLUMN function_title TEXT NOT NULL DEFAULT '';
ALTER TABLE memberships ADD COLUMN bond_type TEXT NOT NULL DEFAULT '';
ALTER TABLE memberships ADD COLUMN direct_manager_id TEXT;
