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
- **Sync**: workspace JSON por usuário no D1 (`/api/workspace`), multi-dispositivo, espaços compartilhados com convites (`/api/collab/*`)
- **Ferramentas inteligentes** (ToolsHub): tradutor, roteirizador (link Google Maps), calculadora de preço, gerador de posts, minuta de contrato, roteiro de vendas, vaga/entrevista RH, POP operações, respostas de atendimento — padrão `aiTools` + `AIToolModal`, fácil de estender
- **Sites**: editor com publicação real em `/s/:slug`, HTML higienizado, formulário público e leads por proprietário (`/api/sites/*`, `/api/public-sites/*`; migração `0006_public_sites.sql`)
- **Demais**: tarefas/kanban, CRM, financeiro, documentos com histórico restaurável, estúdio de mídia (FLUX na cota gratuita; vídeo via servidor próprio opcional em `video-ai/`), certificações, PWA, tema claro/escuro, página Meu Time e Configurações

## Pendências conhecidas (ver PENDENCIAS_DA_TITULAR.md)

- "Esqueci minha senha": ✅ implementado (/api/auth/forgot e /api/auth/reset, códigos via Brevo)
- Google OAuth, Gmail API e Calendar API: ✅ origem, escopos, usuário de teste e fluxos reais validados em 17/07/2026
- Domínio próprio e servidor GPU de vídeo: opcionais, dependem da titular
