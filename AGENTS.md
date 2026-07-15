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
npm run build     # build (gera dist/, que NÃO é commitado)
npm test          # 5 testes vitest — precisam passar antes de commitar
npx wrangler deploy                                   # publica (exige CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
npx wrangler d1 migrations apply seu-funcionario-db --remote   # aplica migrações novas
```

## Segredos (JÁ configurados no cofre do Worker — nunca commitar valores)

`GEMINI_API_KEY`, `XAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_API_KEY`, `BREVO_API_KEY`, `MAIL_SENDER`, `MAIL_SENDER_NAME`

## Regras inegociáveis

1. **Gratuidade**: nada de serviços pagos, cartão ou dependência obrigatória de API paga. xAI (Grok) é o ÚLTIMO fallback da cadeia de IA por consumir créditos.
2. **Nunca** colocar chaves/tokens em código, commits, logs ou no frontend.
3. Produto 100% em **português do Brasil**; tom profissional e acolhedor.
4. Antes de commitar: `npm test` + `npm run build` verdes. Testar o fluxo real em produção quando possível.
5. Não recriar funções que já existem — corrigir/estender as atuais (ver mapa abaixo).
6. Alterou schema? Criar NOVA migração numerada em `migrations/` (nunca editar as antigas) e aplicar com wrangler.
7. Dados de usuários são isolados por conta; qualquer rota nova de dados exige sessão (ver `sessionUser`).
8. Ao subir mudança visual, incrementar a versão do cache em `public/sw.js` (`seu-funcionario-vN`).

## Mapa do que já existe (não duplicar)

- **Auth**: e-mail+senha (PBKDF2), verificação por código de 6 dígitos via Brevo (`pending_signups`, `/api/auth/verify|resend`), login Google (`/api/auth/google`; origem no Console pendente de ajuste pela titular), perfil (`/api/auth/profile`)
- **IA**: cadeia de 9 camadas em `worker.js` (`providerMap`): Gemini Lite/Flash → Gemma → GPT-OSS 120B → Llama 3.3 70B → GLM (instável, pula sozinho) → Llama 3.2 → Grok → contingência local. 46 funcionários especialistas + Diretor orquestrador + funcionários dinâmicos criados pelo usuário
- **Sync**: workspace JSON por usuário no D1 (`/api/workspace`), multi-dispositivo, espaços compartilhados com convites (`/api/collab/*`)
- **Ferramentas inteligentes** (ToolsHub): tradutor, roteirizador (link Google Maps), calculadora de preço, gerador de posts, minuta de contrato, roteiro de vendas, vaga/entrevista RH, POP operações, respostas de atendimento — padrão `aiTools` + `AIToolModal`, fácil de estender
- **Demais**: tarefas/kanban, CRM, financeiro, documentos, criador de sites, estúdio de mídia (FLUX grátis; vídeo via servidor próprio opcional em `video-ai/`), certificações, PWA, tema claro/escuro, página Meu Time e Configurações

## Pendências conhecidas (ver PENDENCIAS_DA_TITULAR.md)

- Login Google: falta a titular corrigir a origem autorizada no Google Console
- "Esqueci minha senha": ✅ implementado (/api/auth/forgot e /api/auth/reset, códigos via Brevo)
- Domínio próprio e servidor GPU de vídeo: opcionais, dependem da titular
