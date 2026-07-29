# Pendências da Titular

Ações que somente você pode realizar. **Nenhuma delas impede o uso do app**, que está no ar em https://seufuncionario-expo.brunapsiles.workers.dev

## 🔴 Recomendadas agora

### 1. Cadastrar as chaves VAPID (notificações do navegador)

Tudo de notificação push já está construído e no ar — lembrete do DAS do MEI, avisos de missão/entrega e o resumo semanal de segunda-feira — mas **nada é enviado** até estes dois segredos existirem no cofre do Worker. Sem eles o app funciona normalmente, só sem push.

Como fazer (uma vez só, ~2 minutos, no terminal do projeto):

```bash
# 1. Gerar um par de chaves novo (o comando imprime as duas linhas):
node -e "crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']).then(async k=>{const b=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');console.log('PUBLICA :',b(await crypto.subtle.exportKey('raw',k.publicKey)));console.log('PRIVADA :',(await crypto.subtle.exportKey('jwk',k.privateKey)).d)})"

# 2. Cadastrar cada uma no cofre (cola o valor quando o comando pedir):
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

Alternativa: um par de chaves já foi gerado e compartilhado na conversa com o assistente em 19/07/2026 — pode usar aquele em vez de gerar um novo. As chaves nunca ficam no código, só no cofre (por isso não estão escritas aqui).

Depois de cadastrar, teste: Configurações → "Notificações do navegador" → Ativar. Deve pedir permissão e confirmar.

## 🟡 Opcionais / segurança

### 1. Restringir ou regenerar chaves compartilhadas em conversas

- Chaves que passaram por chats (Codex/Claude): token Cloudflare, Gemini, xAI, Google API key, Brevo. O app guarda todas em cofre seguro; regenerar é só uma camada extra de proteção contra terceiros.
- Google API key: em console.cloud.google.com → Credenciais, dá para **restringir** quais APIs ela pode usar.

### 2. Domínio próprio (ex.: seufuncionario.com.br)

- Pago (~R$ 40/ano em registro.br). Deixa o endereço com a sua marca e habilita e-mails do seu domínio. O endereço gratuito atual continua funcionando para sempre.

### 3. Servidor GPU para vídeo próprio (pasta `video-ai/`)

- Pago. Sem ele, o estúdio já oferece o caminho gratuito (Hugging Face) para vídeos; imagens e logos funcionam normalmente.

### 4. Login com Apple

- Exige conta de desenvolvedor Apple (US$ 99/ano). Recomendação: não fazer por enquanto.

### 5. WhatsApp bidirecional de verdade (receber mensagens no app)

- Hoje a Caixa de entrada registra o WhatsApp que **sai** (pelos botões do app) e recebe **e-mail e formulários do site**. Receber mensagens de WhatsApp dentro do app exige a **WhatsApp Cloud API** da Meta: tem faixa gratuita, mas pede verificação da sua empresa na Meta, um número dedicado e configuração de webhook. É uma decisão sua — sem ela, tudo o mais da caixa funciona normalmente.

## 🔗 Integrações que você autorizou (dependem de cadastro seu)

Você disse "ok para tudo que depende da minha decisão". Ótimo — mas estas
integrações exigem uma configuração **feita por você** (eu não tenho acesso
ao cofre do Worker nem aos consoles do Google/Meta). Assim que você fizer os
passos abaixo, eu construo/ligo o resto no app. Enquanto isso, tudo o mais
funciona normalmente.

### A. Gmail dentro da Caixa de entrada (ler os e-mails recebidos)

Hoje o login com Google só confirma a sua identidade. Ler o Gmail exige um
fluxo de autorização com um segredo que só você pode cadastrar:

1. No **Google Cloud Console → APIs e serviços → Tela de consentimento**:
   adicionar o escopo `https://www.googleapis.com/auth/gmail.readonly`.
2. Em **Credenciais**, no OAuth Client já existente: adicionar como *Authorized
   redirect URI* `https://seufuncionario-expo.brunapsiles.workers.dev/api/auth/google/callback`
   e copiar o **Client secret**.
3. Cadastrar o segredo no cofre: `npx wrangler secret put GOOGLE_CLIENT_SECRET`.

Sem custo (Gmail API é gratuita na sua conta). Feito isso, eu ligo a leitura +
sincronização na Caixa de entrada.

### B. WhatsApp bidirecional (receber mensagens no app)

Exige a **WhatsApp Cloud API** da Meta (faixa gratuita, mas pede verificação da
empresa na Meta, um número dedicado e um token). Passos: criar app em
`developers.facebook.com`, adicionar o produto WhatsApp, obter o
**Permanent Access Token** e o **Phone Number ID**, e cadastrar
`WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID` no cofre. Eu configuro o webhook e a
Caixa de entrada quando os segredos existirem.

### C. Pesquisa na internet ao vivo (concorrentes, preços)

Precisa de uma chave de API de busca (várias com faixa gratuita, ex.: Brave
Search API ou Google Programmable Search). Você gera a chave e cadastra
`SEARCH_API_KEY` no cofre; eu ligo a pesquisa aprofundada com citações.

## ✅ Já resolvidas

- Conta Cloudflare conectada, app publicado e permanente
- Deploy automático conectado ao GitHub; alterações na `main` são publicadas sem ação manual
- Publicação real de sites e captação de contatos no banco
- Chaves Gemini/xAI/Google/Brevo no cofre do servidor
- Login com Google: origem autorizada, usuário de teste e fluxo completo validados
- Gmail API e Google Calendar API ativadas com os escopos necessários
- Verificação de e-mail por código no cadastro: entrega real e criação de conta validadas
- Recuperação de senha por código de e-mail
- Guia `AGENTS.md` para revezamento entre assistentes
- Compras e suprimentos: solicitações de cotação, propostas por fornecedor,
  comparação por item, melhor oferta, totais e exportação CSV, com vínculos
  opcionais a negócio, projeto, fornecedor e contrato
- Histórico de recuperação do workspace: até 20 versões anteriores no servidor,
  restauração protegida por revisão e preservação da versão substituída
- Cabeçalhos defensivos nas respostas da API contra incorporação, interpretação
  indevida de conteúdo, vazamento de referência e acesso desnecessário a sensores
- Automações executadas de hora em hora no servidor, mesmo com o app fechado,
  com prevenção de duplicidade, snapshots e registro relacional das execuções
