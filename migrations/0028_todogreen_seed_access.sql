-- Contas iniciais controladas para validação da vertical To Do Green.
-- Senhas iniciais de teste. Trocar após o primeiro acesso.

INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
VALUES
  (
    'todogreen-admin-user',
    'Admin To Do Green',
    'admin.todogreen@seufuncionario.app',
    '8c3eeeb2ad2844367e486299b99a15c8e199486cfabaff2f88f4952d131bfe2a',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    '2026-08-05T03:00:00.000Z'
  ),
  (
    'todogreen-teste-user',
    'Teste To Do Green',
    'teste.todogreen@seufuncionario.app',
    '1c608829fa6c1cd15fd93bf588af641186802ec8e6946de5afbbf4fa11b4accc',
    '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
    '2026-08-05T03:00:00.000Z'
  )
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT INTO workspaces (user_id, data, updated_at)
VALUES
  (
    'todogreen-admin-user',
    '{"user":{"id":"todogreen-admin-user","name":"Admin To Do Green","email":"admin.todogreen@seufuncionario.app"},"businesses":[{"id":"todogreen-business","name":"To Do Green","tenantSlug":"todogreen"}],"tenantAccess":{"todogreen":{"role":"admin","active":true,"permissions":["*"]}},"todoGreenDemoMode":false}',
    '2026-08-05T03:00:00.000Z'
  ),
  (
    'todogreen-teste-user',
    '{"user":{"id":"todogreen-teste-user","name":"Teste To Do Green","email":"teste.todogreen@seufuncionario.app"},"businesses":[{"id":"todogreen-business","name":"To Do Green","tenantSlug":"todogreen"}],"tenantAccess":{"todogreen":{"role":"vendedor","active":true,"permissions":["read","crm:view","opportunity:view","pricing:simulate","proposal:create","esg:view","access:view"]}},"todoGreenDemoMode":false}',
    '2026-08-05T03:00:00.000Z'
  )
ON CONFLICT(user_id) DO UPDATE SET
  data = excluded.data,
  updated_at = excluded.updated_at;

INSERT INTO tenants (id, slug, name, segment, status, theme_json, created_at, updated_at)
VALUES (
  'todogreen',
  'todogreen',
  'To Do Green',
  'logistica-sustentavel',
  'active',
  '{"primary":"#17624f","primary2":"#34b78f","surface":"#f5f8f4","ink":"#10241f","graphite":"#23342f"}',
  '2026-08-05T03:00:00.000Z',
  '2026-08-05T03:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  segment = excluded.segment,
  status = excluded.status,
  theme_json = excluded.theme_json,
  updated_at = excluded.updated_at;

INSERT INTO tenant_users
  (id, tenant_id, workspace_owner_id, user_id, role, status, permissions_json, invited_by, created_at, updated_at)
VALUES
  (
    'todogreen-admin-tenant-user',
    'todogreen',
    'todogreen-admin-user',
    'todogreen-admin-user',
    'admin',
    'active',
    '["*"]',
    'todogreen-admin-user',
    '2026-08-05T03:00:00.000Z',
    '2026-08-05T03:00:00.000Z'
  ),
  (
    'todogreen-teste-tenant-user',
    'todogreen',
    'todogreen-teste-user',
    'todogreen-teste-user',
    'vendedor',
    'active',
    '["read","crm:view","opportunity:view","pricing:simulate","proposal:create","esg:view","access:view"]',
    'todogreen-admin-user',
    '2026-08-05T03:00:00.000Z',
    '2026-08-05T03:00:00.000Z'
  )
ON CONFLICT(tenant_id, user_id) DO UPDATE SET
  workspace_owner_id = excluded.workspace_owner_id,
  role = excluded.role,
  status = excluded.status,
  permissions_json = excluded.permissions_json,
  updated_at = excluded.updated_at;

INSERT INTO todogreen_access_emails
  (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
VALUES
  (
    'todogreen-admin-access-email',
    'todogreen',
    'admin.todogreen@seufuncionario.app',
    'admin',
    'active',
    '["*"]',
    'Conta admin inicial de validação',
    'todogreen-admin-user',
    '2026-08-05T03:00:00.000Z',
    '2026-08-05T03:00:00.000Z'
  ),
  (
    'todogreen-teste-access-email',
    'todogreen',
    'teste.todogreen@seufuncionario.app',
    'vendedor',
    'active',
    '["read","crm:view","opportunity:view","pricing:simulate","proposal:create","esg:view","access:view"]',
    'Conta teste inicial de validação',
    'todogreen-admin-user',
    '2026-08-05T03:00:00.000Z',
    '2026-08-05T03:00:00.000Z'
  )
ON CONFLICT(tenant_id, email) DO UPDATE SET
  role = excluded.role,
  status = excluded.status,
  permissions_json = excluded.permissions_json,
  note = excluded.note,
  updated_at = excluded.updated_at;
