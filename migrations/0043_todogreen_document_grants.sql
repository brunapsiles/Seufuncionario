-- ===== Download de documento com link temporário =====
--
-- A aba de documentos do portal listava título, tipo, data e impressão digital,
-- e não tinha botão nem endpoint. A permissão se chamava
-- `portal:document:download` e o que era entregue era metadado.
--
-- O link é temporário porque um link de documento é uma credencial: quem o tem,
-- abre. Um endereço permanente vaza em histórico de navegador, em print de
-- tela, em encaminhamento de e-mail — e continua valendo.
--
-- A concessão fica no banco em vez de virar assinatura criptográfica por dois
-- motivos práticos: dá para revogar antes de vencer, e cada abertura fica
-- registrada. Assinatura só some quando o relógio passa, e ninguém sabe se foi
-- usada.
--
-- Guardamos o HASH do token, nunca o token. O banco não precisa saber abrir a
-- porta — só reconhecer a chave certa.

CREATE TABLE IF NOT EXISTS todogreen_document_grants (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  evidence_id TEXT NOT NULL,
  -- O cliente e o espaço ficam gravados na concessão. Na hora do download a
  -- verificação é contra estes valores, e não contra o que a requisição
  -- afirmar: o link precisa continuar valendo para o mesmo escopo em que foi
  -- emitido, mesmo que a sessão que o abre seja outra.
  client_id TEXT NOT NULL,
  workspace_owner_id TEXT NOT NULL,
  issued_to TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (evidence_id) REFERENCES todogreen_evidences(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_todogreen_document_grants_validade
  ON todogreen_document_grants (expires_at);
CREATE INDEX IF NOT EXISTS idx_todogreen_document_grants_documento
  ON todogreen_document_grants (evidence_id, created_at DESC);
