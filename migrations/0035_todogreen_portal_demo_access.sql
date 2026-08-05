-- Acesso de avaliação ao Portal do Cliente.
--
-- Cria um cliente para análise e libera dois e-mails a entrarem na sala dele.
-- Nenhuma senha aqui: quem for avaliar cria a própria conta pelo cadastro
-- normal e escolhe a senha. Senha em migração foi exatamente o problema que a
-- 0029 teve de limpar deste repositório, que é público.
--
-- O cliente nasce SEM operação e SEM cálculo. Isso é de propósito: o portal
-- deve mostrar o convite para cadastrar, não número inventado. Para ver os
-- indicadores preenchidos, calcule um período em /todogreen/central-esg
-- escolhendo este cliente — aí os números que aparecem no portal são reais,
-- com memória de cálculo por trás.

INSERT INTO todogreen_clients
  (id, tenant_id, workspace_owner_id, name, legal_name, document, segment,
   status, portal_enabled, notes, created_by, updated_by, created_at, updated_at)
VALUES (
  'cliente-demonstracao',
  'todogreen',
  'todogreen-owner',
  'Cliente Demonstração',
  'Cliente Demonstração Ltda',
  '',
  'logistica',
  'ativo',
  1,
  'Cliente criado para avaliação do Portal do Cliente.',
  'sistema',
  'sistema',
  '2026-08-05T13:00:00.000Z',
  '2026-08-05T13:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  status = 'ativo',
  portal_enabled = 1,
  updated_at = excluded.updated_at;

INSERT INTO todogreen_client_users
  (id, tenant_id, client_id, email, role, status, permissions_json, note,
   invited_by, created_at, updated_at)
VALUES
  (
    'portal-demo-titular',
    'todogreen',
    'cliente-demonstracao',
    'brunapsiles+cliente@gmail.com',
    'cliente_admin',
    'active',
    '["portal:read","portal:document:download","portal:request:create","portal:report:export","portal:user:manage"]',
    'Acesso de avaliação do portal',
    'sistema',
    '2026-08-05T13:00:00.000Z',
    '2026-08-05T13:00:00.000Z'
  ),
  (
    'portal-demo-leitor',
    'todogreen',
    'cliente-demonstracao',
    'brunapsiles+cliente.leitor@gmail.com',
    'cliente_leitor',
    'active',
    '["portal:read"]',
    'Acesso de avaliação com papel restrito, para comparar o que cada papel vê',
    'sistema',
    '2026-08-05T13:00:00.000Z',
    '2026-08-05T13:00:00.000Z'
  )
ON CONFLICT(tenant_id, email) DO UPDATE SET
  client_id = excluded.client_id,
  role = excluded.role,
  status = 'active',
  permissions_json = excluded.permissions_json,
  updated_at = excluded.updated_at;
