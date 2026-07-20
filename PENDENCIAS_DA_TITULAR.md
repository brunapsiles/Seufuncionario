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
