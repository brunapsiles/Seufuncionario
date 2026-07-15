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

## 2. Login com Google (escolhido por você)

| Item | Detalhe |
|---|---|
| Ação | Criar um "ID do cliente OAuth" no Google Cloud Console (gratuito) |
| Onde | console.cloud.google.com → APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth (tipo "Aplicativo da Web") |
| Configurar | Adicionar `https://seufuncionario-expo.brunapsiles.workers.dev` nas origens autorizadas; me enviar o "Client ID" gerado (ele é público, não é segredo) |
| Motivo | O Google exige que a titular crie a credencial em nome da sua conta Google |
| Impacto se não fizer | O login por e-mail e senha continua funcionando normalmente |
| Alternativa gratuita | O próprio Google é gratuito para esse uso |
| Bloqueia o lançamento? | Não |
| Observação | Login com Apple ID **não** foi incluído porque exige conta paga de desenvolvedor Apple (US$ 99/ano) |

## 3. Recuperação de senha por e-mail (escolhida por você)

| Item | Detalhe |
|---|---|
| Ação | Contratar um domínio próprio e conectar um serviço de envio de e-mail gratuito (ex.: Resend) |
| Motivo | Enviar e-mail de redefinição para qualquer usuário exige um **domínio verificado**; o endereço atual `.workers.dev` não permite verificação de e-mail |
| Configurar | Após ter domínio: criar conta no Resend (plano gratuito), verificar o domínio, e me enviar a chave para eu configurar como segredo `RESEND_API_KEY` |
| Impacto se não fizer | Não há recuperação de senha; oriente os usuários a guardarem a senha. Posso, alternativamente, implementar um "código de recuperação" gratuito que não depende de e-mail — me avise se preferir |
| Alternativa gratuita | Código de recuperação mostrado no cadastro (sem e-mail) |
| Bloqueia o lançamento? | Não |

## 4. Domínio próprio (opcional)

| Item | Detalhe |
|---|---|
| Ação | Comprar um domínio (ex.: seufuncionario.com.br) se quiser endereço de marca |
| Onde | registro.br (domínios .br) ou Cloudflare Registrar |
| Motivo | Compra de domínio exige pagamento e dados da titular |
| Onde configurar | Cloudflare → Workers → seufuncionario-expo → Settings → Domains & Routes |
| Impacto se não fizer | O endereço gratuito `seufuncionario-expo.brunapsiles.workers.dev` continua funcionando para sempre |
| Alternativa gratuita | Manter o endereço workers.dev atual |
| Bloqueia o lançamento? | Não |

## 5. Servidor próprio de vídeo com GPU (opcional)

| Item | Detalhe |
|---|---|
| Ação | Contratar servidor GPU e publicar a pasta `video-ai/` se quiser geração de vídeo ilimitada própria |
| Motivo | GPU não existe em plano gratuito; exige contratação paga |
| Onde configurar | `npx wrangler secret put VIDEO_AI_URL` e `VIDEO_AI_TOKEN` |
| Impacto se não fizer | O estúdio já oferece o caminho gratuito (Hugging Face) para vídeos; imagens e logos funcionam normalmente no plano gratuito |
| Alternativa gratuita | Já ativa (Hugging Face ZeroGPU, com fila) |
| Bloqueia o lançamento? | Não |
