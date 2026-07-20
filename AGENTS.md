# Guia para agentes (Codex, Claude e outros)

Este arquivo orienta qualquer assistente de IA que trabalhe neste projeto. A titular (Bruna) alterna entre assistentes — **leia tudo antes de mexer**.

## O que é o projeto

**Seu Funcionário** — plataforma de equipe digital para empreendedores brasileiros, em produção:
**https://seufuncionario-expo.brunapsiles.workers.dev**

- Frontend: React 19 + Vite (`src/App.jsx` concentra o app; `src/styles.css` os estilos)
- Backend: Cloudflare Worker (`worker.js`) — login, chat de IA multi-provedor, mídia, sincronização, colaboração
- Banco: Cloudflare D1 (`seu-funcionario-db`), migrações em `migrations/`
- PWA instalável; código no GitHub `brunapsiles/Seufuncionario` (branch `main`)

## Comandos

```bash
npm ci            # instalar
npm run build     # executa os testes e, se passarem, gera dist/ (não commitado)
npm test          # executa a suíte Vitest isoladamente
npm run deploy:cloudflare                             # aplica migrações e publica
npx wrangler d1 migrations apply seu-funcionario-db --remote   # aplica migrações novas
```

## Deploy automático

O Cloudflare Workers Builds está conectado ao repositório `brunapsiles/Seufuncionario`.
Todo push na branch `main` executa `npm ci && npm run build` e, em seguida,
`npm run deploy:cloudflare`. O diretório raiz configurado é `/`; builds de branches que
não sejam a `main` também estão habilitados como versões de prévia.

## Segredos (JÁ configurados no cofre do Worker — nunca commitar valores)

`GEMINI_API_KEY`, `XAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_API_KEY`, `BREVO_API_KEY`, `MAIL_SENDER`, `MAIL_SENDER_NAME`. Os provedores gratuitos adicionais são ativados quando seus segredos `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_MODELS_TOKEN` e `HF_TOKEN` forem cadastrados.

**Pendente de cadastro pela titular** (a sessão que implementou não tem acesso ao `wrangler login`/cofre de produção): `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` — sem eles, `pushEnabled(env)` fica `false` e o app funciona normalmente, só sem notificações do navegador. Gerar um par novo com `crypto.subtle.generateKey({name:"ECDSA", namedCurve:"P-256"}, true, ["sign","verify"])`, exportar a chave pública como `raw` (base64url) e a privada como `jwk.d` (veja `handleAuth`/`vapidHeaders` em `worker.js` para o formato exato esperado). Opcional: `VAPID_SUBJECT` (um `mailto:` ou URL identificando o operador) — se ausente, usa a URL de produção como padrão.

## Regras inegociáveis

1. **Gratuidade**: nada de serviços pagos, cartão ou dependência obrigatória de API paga. xAI (Grok) não entra na cascata automática; exige `confirmPaid: true` por consumir créditos.
2. **Nunca** colocar chaves/tokens em código, commits, logs ou no frontend.
3. Produto 100% em **português do Brasil**; tom profissional e acolhedor.
4. Antes de commitar: `npm run build` verde (o build já executa todos os testes). Testar o fluxo real em produção quando possível.
5. Não recriar funções que já existem — corrigir/estender as atuais (ver mapa abaixo).
6. Alterou schema? Criar NOVA migração numerada em `migrations/` (nunca editar as antigas) e aplicar com wrangler.
7. Dados de usuários são isolados por conta; qualquer rota nova de dados exige sessão (ver `sessionUser`).
8. Ao subir mudança visual, incrementar a versão do cache em `public/sw.js` (`seu-funcionario-vN`).

## Mapa do que já existe (não duplicar)

- **Auth**: e-mail+senha (PBKDF2), verificação por código de 6 dígitos via Brevo (`pending_signups`, `/api/auth/verify|resend`), login Google (`/api/auth/google`; origem autorizada e fluxo real validados), perfil (`/api/auth/profile`)
- **IA**: cascata dinâmica em `worker.js` (`providerMap`): Google Gemini/Gemma, Cloudflare Workers AI, Groq, Cerebras, Mistral, OpenRouter, GitHub Models e Hugging Face. Só entram provedores configurados; xAI exige confirmação paga; ao final há contingência local. 46 funcionários especialistas + Diretor orquestrador + funcionários dinâmicos criados pelo usuário
- **Sync**: workspace JSON por usuário no D1 (`/api/workspace`), multi-dispositivo, espaços compartilhados com convites (`/api/collab/*`), controle otimista por `revision`
- **Ferramentas inteligentes** (ToolsHub): tradutor, roteirizador (link Google Maps), calculadora de preço, gerador de posts, minuta de contrato, roteiro de vendas, vaga/entrevista RH, POP operações, respostas de atendimento — padrão `aiTools` + `AIToolModal`, fácil de estender
- **Sites**: editor com publicação real em `/s/:slug`, HTML higienizado, formulário público e leads por proprietário (`/api/sites/*`, `/api/public-sites/*`; migração `0006_public_sites.sql`)
- **Demais**: tarefas/kanban, CRM, financeiro, documentos com histórico restaurável, estúdio de mídia (FLUX na cota gratuita; vídeo via servidor próprio opcional em `video-ai/`), certificações, PWA, tema claro/escuro, página Meu Time e Configurações
- **Colaboração em equipe** (ver `worker.js` e `src/App.jsx`, componente `Collaborators`/`Team`): convite real por e-mail com ativação (`/api/collab/invite*`, `/api/collab/join`, migração `0010_team_invites.sql`); três papéis (`admin`/`gestor`/`colaborador`, `VALID_ROLES`) — todos os papéis acessam TODAS as ferramentas, o controle é sobre os DADOS, nunca sobre o acesso à tela
  - **Visibilidade de dados**: `canSeeTask(record, userId, ctx)` em `worker.js` é o predicado único usado para tudo — checa `ownerId`, `assigneeId`, `assignees[]`, `sharedWith[]`, `visibility === "espaco_todo"`, `interested[]`, `sharedTeams[]` (equipe) e `visibility === "projeto"` + `project` (ctx.projects, calculado a partir das tarefas do usuário). `RESTRICTED_FIELDS` lista os campos do workspace que passam por esse filtro no GET/PUT de `/api/workspace` — hoje: `tasks, leads, documents, sites, developmentPlans, notifications, transactions, appointments, products, orders, vehicles, trips, conversations, emailDrafts`. Registro sem `ownerId` é tratado como dado legado e fica visível a todos (compatibilidade). **Não restringir um campo novo sem antes checar se ele é realmente "pessoal"**: `transactions` (Financeiro) é restrito por padrão (`visibility: "privado"`) porque o espírito é "cada um só vê o que é seu"; já `appointments`/`products`/`orders`/`vehicles`/`trips` são dados operacionais/compartilhados por natureza, então o formulário de cada um define `visibility: "espaco_todo"` como padrão no objeto em branco — isso preserva "visível pra todo mundo" para quem nunca mexe no seletor, e só fica restrito se a pessoa escolher isso explicitamente. `contacts` continua fora da lista de propósito (é o diretório unificado, alimentado por várias origens via `upsertContact`, não tem dono único natural). `conversations` (histórico de chat com a IA) recebe `ownerId: db.user.id` nos 3 pontos onde é criada — conversas antigas sem `ownerId` continuam legadas/visíveis a todos.
  - **Escrita de colaboradores é sanitizada por campo, não só por visibilidade**: `mergeRecordsFromMember` (`worker.js`) decide, registro a registro do PUT em `/api/workspace`, se quem está sincronizando é o dono do registro (`ownerId == null` ou `ownerId === memberId`) ou só enxerga ele (compartilhado/atribuído/`espaco_todo`). Quem não é dono tem os campos em `OWNER_LOCKED_FIELDS` (`ownerId`, `businessId`, `visibility`, `sharedWith`, `sharedTeams`, `points`, `reward`, `slots`, `approvalMode`, `distribution`, `rewardStatus`) silenciosamente revertidos para o valor atual via `sanitizeMemberEdit`, e não pode setar `missionStatus: "aprovada"` — evita que um colaborador com mero acesso de visualização reescreva o registro inteiro, se autoaprove numa missão ou apague por omissão algo que não é dele. Transições legítimas de status (ex.: enviar entrega para revisão) continuam permitidas.
  - **Sites/leads públicos são autorizados por registro, não só por pertencer ao espaço**: `public_sites`/`public_site_leads` vivem fora do `RESTRICTED_FIELDS` (tabelas D1 próprias); `canManageSite(env, actorId, ownerId, siteId)` em `worker.js` é o gate usado por `handleSites` (publish/unpublish/delete/leads) — dono do espaço ou papel `admin` sempre pode, qualquer outro membro só se `canSeeTask` aceitar o registro do site (na prática, só quem criou aquele site específico, já que sites não têm campo de compartilhamento próprio na UI ainda).
  - **`/api/collab` aceita `?owner=` para quem é `admin` convidado administrar o espaço ativo**: fora de "leave", toda ação POST calcula `scopeOwnerId` (`?owner=` ou o próprio `user.id`) e, se for de outro dono, exige `membershipRole(...) === "admin"`; senão 403. O GET base (`Collaborators`) devolve `canManage` no payload — o frontend usa isso para mostrar convites reais e habilitar os botões de administração só quando a pessoa realmente pode agir naquele espaço (ver `collabQuery` em `Collaborators`).
  - **Token de convite fica hasheado (sha256), nunca em texto puro**: `invites.token` guarda `sha256(token)` — o token bruto só existe no link do e-mail. Toda consulta (`invite-info`, `invite/accept`) hasheia o token recebido antes de comparar. Cancelar um convite faz `UPDATE ... SET status = 'cancelado'` (mantém o registro para auditoria), nunca `DELETE`.
  - **Equipes e projetos**: `db.teams` (grupos de colaboradores, gerenciados só pelo dono, protegidos contra alteração por papel restrito no PUT) e `db.projects` (nomes de projeto criados com antecedência); componente `SharingFields` é o seletor de visibilidade reutilizável — usado em Tarefas, CRM, Documentos, Sites, Agendamentos, Catálogo (Produtos e Pedidos) e Frota (Veículos e Fretes) — sempre usar esse componente em vez de recriar o seletor
  - **Missões e gamificação**: tarefa com `isMission: true` ganha vagas/pontos/recompensa/subtarefas/entrega-e-revisão; `computeUserPoints`/`levelForPoints`/`computeAchievements`/`levelProgress` (funções puras em `src/App.jsx`) calculam pontos, nível, progresso até o próximo nível e conquistas a partir de `db.tasks` — nada fica persistido, é sempre recalculado
  - **Dependência entre tarefas**: campo `dependsOn` (array de ids); `isBlocked`/`blockingTasks` no componente `Tasks` bloqueiam concluir, entregar ou assumir enquanto a dependência não estiver "Concluído" — essa checagem também vale ao arrastar um cartão no quadro Kanban (drag-and-drop chama a mesma `changeTaskStatus`, não existe um caminho alternativo que ignore o bloqueio)
  - **Tarefas recorrentes**: campo `task.recurrence.frequency` (`none`/`weekly`/`monthly`); `nextRecurrenceDue(ymd, frequency)` (função pura) calcula o próximo prazo; `changeTaskStatus` cria a próxima ocorrência automaticamente ao concluir uma tarefa recorrente (nova tarefa com `status: "A fazer"`, sem herdar `deliveries`/`attachments` da anterior)
  - **Anexos em tarefas e entregas**: `task.attachments` e `delivery.attachments` (array, até 5 itens via `MAX_ATTACHMENTS_PER_ITEM`); `buildAttachment(file)` decide entre imagem (`compressImageForAttachment` — redimensiona e comprime para JPEG no navegador via canvas, até `MAX_ATTACHMENT_IMAGE_BYTES`) ou documento (reaproveita `extractDocumentText` e guarda só o texto extraído, até `MAX_ATTACHMENT_TEXT_CHARS`). **Nunca guardar o arquivo bruto no workspace** — o blob sincronizado tem limite de tamanho (ver aviso em Configurações); por isso tudo aqui passa por compressão ou extração de texto antes de entrar em `db`
  - **Visão de calendário de tarefas**: view `"calendario"` em Tarefas (ao lado de Quadro/Lista/Disponíveis); `buildTaskCalendar(yearMonth, tasks)` (função pura) monta o grid mensal agrupando por `task.due`; `shiftYearMonth`/`todayYearMonth` cuidam da navegação de mês
  - **Ações em lote**: na view Lista, cada tarefa tem uma checkbox (`selectedIds`); barra de ações aparece com >=1 selecionada para arquivar, desarquivar ou reatribuir todas de uma vez — implementado só na Lista de propósito (no Kanban o gesto de arrastar já ocupa o clique no cartão)
  - **Auditoria**: tabela `audit_log` (migração `0011_audit_log.sql`), `logAudit()` grava ações administrativas (convite, papel, suspensão...), consultável só pelo dono via `/api/collab/audit`
  - **Notificações in-app**: `pushNotification()` empurra para `db.notifications` (também é um `RESTRICTED_FIELD`, usa `assigneeId` como destinatário); sino no topo do app
  - **Busca global**: campo de busca (Ctrl/Cmd+K) indexa dados reais (tarefas, leads, documentos, contatos, produtos, sites...), não só nomes de seção
  - **Erros técnicos**: cliente reporta falhas para `POST /api/errors` (sem exigir login) desde o `ErrorBoundary`/handlers globais em `src/main.jsx`; `GET /api/errors` (exige sessão) devolve só os erros do próprio usuário logado, consultável em Configurações → "Erros técnicos"
  - **Modal com armadilha de foco**: componente `Modal` (`src/App.jsx`) prende o Tab dentro do diálogo, foca o primeiro elemento focável ao abrir (respeitando um `autoFocus` de algum campo filho) e devolve o foco a quem abriu ao fechar — todos os modais do app usam esse componente, então a correção vale para todos de uma vez
  - **Login tem limite de tentativas por conta, além do limite por IP**: `allowed(`auth-account:${email}`, 8)` em `handleAuth`/`/api/auth/login` — fecha a lacuna de força bruta distribuída entre vários IPs contra uma conta específica. O limite por IP (`allowed(`auth:${ip}`)`) continua valendo para todas as rotas de `/api/auth/*`.
  - **Notificações Web Push**: usa `@block65/webcrypto-web-push` (só Web Crypto API, compatível com Workers — não usar `web-push` do npm, que depende de `node:crypto`). `push_subscriptions` (migração `0012_push_subscriptions.sql`) guarda `endpoint`/`p256dh`/`auth` por usuário; `/api/push/subscribe` e `/api/push/unsubscribe` (exigem sessão) gerenciam a assinatura; `/api/config` expõe `vapidPublicKey` quando `pushEnabled(env)` é verdadeiro. `handleWorkspace` compara `notifications` antes/depois de cada PUT (`notifyNewNotifications`) e envia push só para notificações genuinamente novas (por `id`), para o `assigneeId` — uma assinatura que responde 404/410 é apagada automaticamente. Frontend: toggle em Configurações → "Notificações do navegador" (`AccountSettings`), usa `urlBase64ToUint8Array` para converter a chave VAPID; `sw.js` tem os handlers `push`/`notificationclick`, que reenviam o clique para a aba aberta via `postMessage` → evento `sf-push-navigate` (ouvido no topo de `App`, fora de qualquer `return` condicional — **hooks do componente `App` só podem ficar antes dos primeiros `if (...) return`**, ver `if (!db.user) return <Login />` etc.)
  - **Verificação visual real**: testes automatizados (`npm test`) rodam em jsdom, que não tem motor de CSS/layout real nem `canvas`/`Image` funcionais — para qualquer mudança visual (CSS, drag-and-drop, canvas de compressão de imagem) vale a pena rodar um script Playwright manual (Chromium em `/opt/pw-browsers/chromium`, pacote em `/opt/node22/lib/node_modules/playwright`) além dos testes, porque jsdom já deixou passar bugs visuais reais nesta sessão
  - **Falha de sincronização é visível, nunca silenciosa**: `useDatabase` (`src/App.jsx`) expõe `syncError`/`retrySync`/`logoutFromExpiredSession` além de `syncing`. `performSync` (a função que faz o PUT em `/api/workspace`) trata cada desfecho: 409 vira `workspaceConflict` (já existia); 401 vira banner "Sua sessão expirou" com botão para relogar sem apagar os dados locais (`logoutFromExpiredSession` só limpa o token, não o `db`); qualquer outro erro (500, 429, offline — inclusive exceção lançada pelo `fetch`) vira banner "Suas alterações não foram salvas" com botão "Tentar agora" (`retrySync`), que só limpa quando uma sincronização seguinte realmente for bem-sucedida. Antes disso, qualquer falha fora do 409 era engolida em silêncio (`if (!response.ok) return;`) — sessões de 30 dias (`createSession`) tornam isso um risco real de perda de dados percebida, não hipotético. Ao mexer nesse hook, manter essa cobertura: todo caminho de falha do PUT precisa acabar em algum estado visível.

## Pendências conhecidas (ver PENDENCIAS_DA_TITULAR.md)

- "Esqueci minha senha": ✅ implementado (/api/auth/forgot e /api/auth/reset, códigos via Brevo)
- Google OAuth, Gmail API e Calendar API: ✅ origem, escopos, usuário de teste e fluxos reais validados em 17/07/2026
- Domínio próprio e servidor GPU de vídeo: opcionais, dependem da titular
