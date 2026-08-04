-- Envio automático para outro sistema (webhook de saída).
-- O segredo é gerado no servidor e mostrado uma única vez para quem cadastra:
-- ele é o que permite ao destino conferir que o aviso veio mesmo daqui.
-- A url é validada ANTES de gravar (worker/services/webhooks.js): só https,
-- porta padrão e nada que resolva para dentro da rede — o servidor é quem faz
-- a chamada, então um endereço interno o transformaria numa ponte.
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_status TEXT,
  last_at TEXT,
  -- Depois de 20 falhas seguidas o envio se desliga sozinho, para o servidor
  -- não ficar batendo para sempre num endereço que morreu.
  failures INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhooks_owner ON webhooks (owner_id, enabled);
