-- Plano de cada conta e consumo por período.
-- Duas tabelas separadas de propósito: o plano muda raramente e o consumo muda
-- toda hora. Guardar junto faria cada chamada de IA reescrever a linha do plano.

CREATE TABLE IF NOT EXISTS workspace_plans (
  owner_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT 'gratuito',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- period_key é o mês ('2026-07'). A cota renova sozinha porque o mês novo
-- simplesmente não tem linha ainda — nada precisa ser apagado nem zerado.
CREATE TABLE IF NOT EXISTS workspace_usage (
  owner_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  metric TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, period_key, metric),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_owner
  ON workspace_usage (owner_id, period_key);
