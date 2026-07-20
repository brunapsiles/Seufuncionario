# Resposta a incidentes e LGPD

## Classificação

- Crítico: exposição entre contas, tomada de conta, perda de dados ou segredo
  exposto.
- Alto: indisponibilidade ampla, ação financeira indevida ou falha persistente
  de autenticação.
- Médio: fluxo importante indisponível sem perda de dados.
- Baixo: defeito visual ou problema com alternativa funcional.

## Procedimento

1. Registrar horário, versão, superfície e pessoa responsável.
2. Conter o problema sem apagar evidências ou dados do usuário.
3. Invalidar chaves ou sessões somente quando necessário.
4. Determinar contas e categorias de dados afetadas.
5. Corrigir, testar em D1 local e publicar a menor alteração segura.
6. Validar em produção e acompanhar recorrência.
7. Comunicar pessoas e autoridades quando a avaliação jurídica indicar.
8. Registrar causa, impacto, correção e prevenção.

## Mapa resumido de dados

| Categoria | Finalidade | Armazenamento | Acesso |
| --- | --- | --- | --- |
| Conta e sessão | autenticação | D1 | titular e backend |
| Workspace | operar e sincronizar o produto | D1 e cópia local | dono e pessoas autorizadas por registro |
| Conversas de IA | continuidade do trabalho | workspace | dono da conversa e compartilhados explicitamente |
| Eventos de uso | adoção e melhoria | D1 | dono/admin em forma agregada |
| Erros técnicos | diagnóstico | D1 | próprio usuário |
| Sites e leads públicos | publicação e contato | D1 | dono e editores autorizados |

## Princípios aplicados

- Ferramentas são visíveis para colaboradores ativos; dados são filtrados
  no backend.
- Registros privados não aparecem em pesquisas, contadores, exportações ou
  contexto da IA de pessoas sem acesso.
- Visualizar e editar são permissões distintas.
- Eventos de produto usam lista fechada de campos e descartam conteúdo livre.
- Exclusão da conta remove workspace, eventos, erros, sites, assinaturas e
  demais dados vinculados ao dono.
- Convites têm token com hash, validade e uso único.

## Pendências organizacionais antes de parceria formal

- Identificar publicamente a pessoa jurídica ou responsável pelo tratamento.
- Definir canal oficial e encarregado de privacidade.
- Manter relação atualizada de operadores e termos dos provedores.
- Definir prazo de retenção de logs e eventos.
- Obter revisão jurídica dos termos antes de um piloto institucional amplo.
