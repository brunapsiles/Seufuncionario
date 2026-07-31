-- Recursos gratuitos transversais: agendamento público, central de atendimento,
-- analytics próprio e campanhas com consentimento explícito.
CREATE TABLE IF NOT EXISTS booking_pages (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  weekdays_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  location TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_pages_owner
  ON booking_pages (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public_bookings (
  id TEXT PRIMARY KEY,
  booking_page_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado',
  protocol TEXT NOT NULL UNIQUE,
  cancel_token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (booking_page_id) REFERENCES booking_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_bookings_page_time
  ON public_bookings (booking_page_id, start_at, status);

CREATE INDEX IF NOT EXISTS idx_public_bookings_owner
  ON public_bookings (workspace_owner_id, start_at DESC);

-- Trava relacional do horário: o batch de criação impede duas reservas
-- concorrentes de confirmarem exatamente o mesmo início.
CREATE TABLE IF NOT EXISTS booking_slots (
  booking_page_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  booking_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (booking_page_id, start_at),
  FOREIGN KEY (booking_page_id) REFERENCES booking_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES public_bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_portals (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  welcome_text TEXT NOT NULL DEFAULT '',
  sla_hours INTEGER NOT NULL DEFAULT 24,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_support_portals_owner
  ON support_portals (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  support_portal_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  protocol TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Novo',
  assignee_id TEXT,
  sla_due_at TEXT NOT NULL,
  resolution TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (support_portal_id) REFERENCES support_portals(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_owner
  ON support_tickets (workspace_owner_id, status, sla_due_at);

CREATE TABLE IF NOT EXISTS analytics_sites (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  site_key TEXT NOT NULL UNIQUE,
  allowed_origin TEXT NOT NULL DEFAULT '*',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analytics_sites_owner
  ON analytics_sites (workspace_owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  analytics_site_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  referrer_host TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  visitor_id TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (analytics_site_id) REFERENCES analytics_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_site_time
  ON analytics_events (analytics_site_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  workspace_owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  audience_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_owner
  ON marketing_campaigns (workspace_owner_id, updated_at DESC);
