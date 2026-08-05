-- Registro do tenant To Do Green.
--
-- Esta migração já criou, numa versão anterior, duas contas com senha fixa
-- (hash e salt escritos aqui dentro). O repositório é público, então aquilo
-- equivalia a publicar as senhas: quem baixa o arquivo ataca offline, no tempo
-- dele, sem passar pelo limite de tentativas do servidor. As contas foram
-- removidas pela migração 0029 e o conteúdo saiu daqui para que nenhuma base
-- nova volte a nascer com elas.
--
-- Acesso à vertical se dá por: e-mail @todogreen.com.br, e-mail liberado no
-- painel Acessos, ou negócio "To Do Green" no espaço de trabalho. Em nenhum
-- desses caminhos existe senha guardada no código.

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
