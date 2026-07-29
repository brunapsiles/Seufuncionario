-- Formulários públicos avançados. A definição editável continua no workspace;
-- esta tabela guarda somente o snapshot publicado. As respostas ficam
-- relacionais para não aumentar o blob de sincronização.
CREATE TABLE IF NOT EXISTS public_forms (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  snapshot_json TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_forms_owner
  ON public_forms (workspace_owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_forms_slug
  ON public_forms (slug);

CREATE TABLE IF NOT EXISTS public_form_submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  protocol TEXT NOT NULL UNIQUE,
  respondent_name TEXT NOT NULL DEFAULT '',
  respondent_email TEXT NOT NULL DEFAULT '',
  respondent_phone TEXT NOT NULL DEFAULT '',
  values_json TEXT NOT NULL DEFAULT '{}',
  attachments_json TEXT NOT NULL DEFAULT '[]',
  signature_json TEXT NOT NULL DEFAULT '{}',
  payment_json TEXT NOT NULL DEFAULT '{}',
  destination TEXT NOT NULL DEFAULT 'response',
  linked_record_id TEXT,
  conversion_status TEXT NOT NULL DEFAULT 'not_required',
  conversion_error TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (form_id) REFERENCES public_forms(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(form_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_public_form_submissions_form
  ON public_form_submissions (form_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_form_submissions_owner
  ON public_form_submissions (workspace_owner_id, submitted_at DESC);
