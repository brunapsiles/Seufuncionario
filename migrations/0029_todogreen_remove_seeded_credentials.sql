-- Remove as contas semeadas com senha fixa pela migração 0028.
--
-- Por que: a 0028 gravou hash e salt de duas contas dentro do repositório, que
-- é público. Hash em repositório público é senha entregue — quem baixa ataca
-- offline, no tempo dele, sem tentativa nenhuma no servidor para ser barrada
-- pelo limite de login. As contas já estavam valendo em produção.
--
-- O que fica no lugar: quem administra libera o e-mail da pessoa no painel
-- Acessos, e a pessoa cria a própria conta pelo cadastro normal, com senha que
-- só ela sabe. Nenhuma senha volta a morar no código.
--
-- Apagar o usuário leva junto sessão, espaço de trabalho e vínculos, porque as
-- chaves estrangeiras da 0001 são ON DELETE CASCADE.

DELETE FROM users WHERE id IN ('todogreen-admin-user', 'todogreen-teste-user');

-- Cinto de segurança: se alguma dessas contas tiver sido recriada com outro id,
-- o e-mail é o mesmo e continua sendo removido.
DELETE FROM users
 WHERE email IN (
   'admin.todogreen@seufuncionario.app',
   'teste.todogreen@seufuncionario.app'
 );

-- O espaço de trabalho não tem chave estrangeira para users em bases antigas;
-- remover pelo id evita deixar dado órfão ocupando a base.
DELETE FROM workspaces
 WHERE user_id IN ('todogreen-admin-user', 'todogreen-teste-user');

DELETE FROM tenant_users
 WHERE user_id IN ('todogreen-admin-user', 'todogreen-teste-user');

-- Os e-mails liberados também saem. São de um domínio que não é da To Do Green
-- nem da titular; deixá-los ativos significaria que quem conseguisse receber
-- e-mail nesses endereços entraria como admin da vertical só se cadastrando.
DELETE FROM todogreen_access_emails
 WHERE email IN (
   'admin.todogreen@seufuncionario.app',
   'teste.todogreen@seufuncionario.app'
 );
