-- Parâmetros comerciais versionados: margem, OPEX, imposto, comissão.
--
-- Até aqui esses números viviam fixos no código — mudar a margem mínima exigia
-- alterar arquivo e publicar. Quem decide margem é o gestor comercial, e ela
-- muda por período. A tabela dá dono, versão e vigência à régua.
--
-- Mesmo desenho do Green Score: cadastrar versão nova ENCERRA a anterior, não
-- a apaga, e cada simulação guarda com qual régua nasceu. Sem isso, a decisão
-- de julho reescreveria em silêncio o preço aprovado em janeiro.

CREATE TABLE IF NOT EXISTS todogreen_pricing_parameters (
  version TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'todogreen',
  parameters_json TEXT NOT NULL,
  -- O que mudou em relação à régua anterior, em português, calculado no ato.
  change_summary TEXT NOT NULL DEFAULT '',
  justification TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todogreen_pricing_parameters_active
  ON todogreen_pricing_parameters (tenant_id, status, effective_from DESC);
