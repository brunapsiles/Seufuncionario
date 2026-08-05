-- Libera a conta principal da titular no Portal do Cliente, a pedido dela.
--
-- Fica registrado por que isto não veio de saída: a mesma conta passa a ser
-- dona da plataforma E cliente ao mesmo tempo. Para análise isso confunde —
-- não dá para distinguir o que se vê por ser cliente do que se vê por ser
-- dona. Ela avaliou e preferiu assim, para não precisar criar outra conta.
--
-- Nada muda no isolamento: o portal continua decidindo o cliente pela sessão,
-- e esta conta enxerga apenas o Cliente Demonstração. O acesso interno à
-- vertical é separado e não é afetado.

INSERT INTO todogreen_client_users
  (id, tenant_id, client_id, email, role, status, permissions_json, note,
   invited_by, created_at, updated_at)
VALUES
  (
    'portal-demo-conta-principal',
    'todogreen',
    'cliente-demonstracao',
    'brunapsiles@gmail.com',
    'cliente_admin',
    'active',
    '["portal:read","portal:document:download","portal:request:create","portal:report:export","portal:user:manage"]',
    'Conta principal liberada para avaliar o portal sem criar conta separada',
    'sistema',
    '2026-08-05T13:30:00.000Z',
    '2026-08-05T13:30:00.000Z'
  ),
  (
    'portal-demo-conta-icloud',
    'todogreen',
    'cliente-demonstracao',
    'brunapsiles@icloud.com',
    'cliente_admin',
    'active',
    '["portal:read","portal:document:download","portal:request:create","portal:report:export","portal:user:manage"]',
    'Segunda conta da titular, caso o acesso seja por ela',
    'sistema',
    '2026-08-05T13:30:00.000Z',
    '2026-08-05T13:30:00.000Z'
  )
ON CONFLICT(tenant_id, email) DO UPDATE SET
  client_id = excluded.client_id,
  role = excluded.role,
  status = 'active',
  permissions_json = excluded.permissions_json,
  note = excluded.note,
  updated_at = excluded.updated_at;
