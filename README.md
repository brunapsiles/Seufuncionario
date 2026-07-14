# Seu Funcionário

Aplicativo web que funciona como uma equipe completa para pequenos negócios: 13 especialistas de IA (Estrategista, Redator, Precificador, Marketing, Vendas, Financeiro e outros), painel de tarefas, leads, controle financeiro, criador de sites, estúdio de logos/imagens/vídeos e trilhas de certificação — tudo em português do Brasil.

**Custo de operação: R$ 0.** O app roda no plano gratuito do Cloudflare Workers e usa provedores de IA em cascata, priorizando sempre os gratuitos (Google Gemini → Cloudflare Workers AI → xAI opcional). Se todos falharem, entrega um plano de contingência local sem inventar informações.

## Estrutura

| Caminho | O que é |
|---|---|
| `src/` | Interface do aplicativo (React + Vite) |
| `worker.js` | Backend (Cloudflare Worker): login, chat de IA, geração de mídia |
| `migrations/` | Banco de dados de contas (Cloudflare D1) |
| `public/` | Arquivos estáticos (favicon) |
| `video-ai/` | Servidor próprio e opcional de geração de vídeo (GPU, Docker) |

## Rodar no seu computador

```bash
npm install
npm run dev    # abre a interface em modo desenvolvimento
npm test       # roda os testes
```

## Lançar na internet (gratuito, via Cloudflare)

1. Crie uma conta gratuita em [dash.cloudflare.com](https://dash.cloudflare.com)
2. No terminal, dentro da pasta do projeto:
   ```bash
   npx wrangler login                                   # conecta sua conta
   npx wrangler d1 create seu-funcionario-db            # cria o banco de contas
   ```
   Copie o `database_id` que aparecer e cole no campo `database_id` do arquivo `wrangler.jsonc`.
3. Crie as tabelas e cadastre a chave de IA (gratuita em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)):
   ```bash
   npm run db:migrate
   npx wrangler secret put GEMINI_API_KEY
   ```
4. Publique:
   ```bash
   npm run deploy
   ```
   Ao final o terminal mostra o endereço público do seu app (`https://seufuncionario-expo.<sua-conta>.workers.dev`).

### Chaves opcionais

| Segredo | Para quê | Como criar |
|---|---|---|
| `GEMINI_API_KEY` | Chat de IA (obrigatória) | `npx wrangler secret put GEMINI_API_KEY` |
| `XAI_API_KEY` | Fallback pago (Grok) para chat e imagens | `npx wrangler secret put XAI_API_KEY` |
| `VIDEO_AI_URL` + `VIDEO_AI_TOKEN` | Servidor próprio de vídeo (`video-ai/`) | `npx wrangler secret put ...` |

Sem as opcionais o app continua funcionando: imagens e logos usam o FLUX gratuito do Cloudflare, e o gerador de vídeo indica a alternativa gratuita no Hugging Face.

## Segurança

- Senhas protegidas com PBKDF2 (100.000 iterações) e sal individual; sessões expiram em 30 dias.
- As rotas de IA exigem login, evitando que estranhos consumam sua cota gratuita.
- Limite de 8 requisições por minuto por IP contra abuso.
