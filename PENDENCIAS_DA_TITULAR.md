# Pendências da Titular

Ações que somente você pode realizar. **Nenhuma delas bloqueia o funcionamento atual** — o app está publicado, gratuito e operante em https://seufuncionario-expo.brunapsiles.workers.dev

## 1. Regenerar as chaves compartilhadas em conversas (recomendado)

| Item | Detalhe |
|---|---|
| Ação | Regenerar 3 chaves: token da Cloudflare, chave do Gemini e chave da xAI |
| Onde | Cloudflare: dash.cloudflare.com → API Tokens · Gemini: aistudio.google.com/apikey · xAI: console.x.ai |
| Motivo | As chaves atuais foram coladas em conversas com assistentes (Codex e Claude) e ficam nos históricos dessas plataformas |
| O que será gerado | Novos códigos de chave |
| Onde configurar | No terminal do projeto: `npx wrangler secret put GEMINI_API_KEY` e `npx wrangler secret put XAI_API_KEY` (ou me peça para configurar em uma nova sessão) |
| Cuidados | Nunca cole chaves em sites que não sejam os oficiais; revogue as antigas após criar as novas |
| Impacto se não fizer | O app continua funcionando; existe risco teórico de terceiros usarem suas cotas |
| Alternativa gratuita | O processo é gratuito |
| Bloqueia o lançamento? | Não |
| Próximo passo | Após regenerar, atualizar os segredos e revogar as chaves antigas |

## 2. Domínio próprio (opcional)

| Item | Detalhe |
|---|---|
| Ação | Comprar um domínio (ex.: seufuncionario.com.br) se quiser endereço de marca |
| Onde | registro.br (domínios .br) ou Cloudflare Registrar |
| Motivo | Compra de domínio exige pagamento e dados da titular |
| Onde configurar | Cloudflare → Workers → seufuncionario-expo → Settings → Domains & Routes |
| Impacto se não fizer | O endereço gratuito `seufuncionario-expo.brunapsiles.workers.dev` continua funcionando para sempre |
| Alternativa gratuita | Manter o endereço workers.dev atual |
| Bloqueia o lançamento? | Não |

## 3. Servidor próprio de vídeo com GPU (opcional)

| Item | Detalhe |
|---|---|
| Ação | Contratar servidor GPU e publicar a pasta `video-ai/` se quiser geração de vídeo ilimitada própria |
| Motivo | GPU não existe em plano gratuito; exige contratação paga |
| Onde configurar | `npx wrangler secret put VIDEO_AI_URL` e `VIDEO_AI_TOKEN` |
| Impacto se não fizer | O estúdio já oferece o caminho gratuito (Hugging Face) para vídeos; imagens e logos funcionam normalmente no plano gratuito |
| Alternativa gratuita | Já ativa (Hugging Face ZeroGPU, com fila) |
| Bloqueia o lançamento? | Não |
