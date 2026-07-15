CREATE TABLE IF NOT EXISTS public_sites (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS public_sites_owner_idx ON public_sites(owner_id);
CREATE INDEX IF NOT EXISTS public_sites_slug_idx ON public_sites(slug);

CREATE TABLE IF NOT EXISTS public_site_leads (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES public_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(site_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS public_site_leads_owner_idx ON public_site_leads(owner_id, created_at);
CREATE INDEX IF NOT EXISTS public_site_leads_site_idx ON public_site_leads(site_id, created_at);
