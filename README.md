# Seu Funcionário

**Tenha o funcionário que sua empresa precisa, quando precisar.**

Plataforma de inteligência empresarial em português do Brasil, publicada em https://seufuncionario-expo.brunapsiles.workers.dev — uma equipe digital para quem está começando sozinho até empresas em expansão:

- **Mais de 40 funcionários especialistas** com instruções próprias: Estratégia, Jurídico, Marketing, TI, Vendas, Financeiro, RH, Operações, Produto, Projetos, Customer Success, Dados, Logística, Compras, Compliance, Segurança da Informação, Growth, E-commerce, Captação e muitos outros
- **Diretor de Inteligência**: o funcionário principal que entende o pedido, envolve as áreas certas, divide demandas complexas em etapas e consolida um plano único — o usuário não precisa saber qual departamento chamar
- **Contratação dinâmica**: crie novos funcionários sob medida (por setor, profissão, projeto ou problema) direto no chat, sem reconstruir a aplicação
- **Adaptação por segmento**: as respostas se ajustam a setor, porte, estágio e objetivo do negócio cadastrado
- Painel de tarefas, CRM de leads, controle financeiro, documentos versionados, criador de sites, estúdio de logos/imagens/vídeos com IA e trilhas de certificação
- **Aplicativo instalável (PWA)**: funciona como site e como app no celular e no computador
- **Sincronização multi-dispositivo**: os projetos acompanham a conta — entre de qualquer aparelho e continue de onde parou

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
