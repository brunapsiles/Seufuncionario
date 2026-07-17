# Pendências da Titular

Ações que somente você pode realizar. **Nenhuma delas impede o uso do app**, que está no ar em https://seufuncionario-expo.brunapsiles.workers.dev

## 🔴 Recomendadas agora

### 1. Login com Google — corrigir a origem (você fará com o Codex)

- Erro atual: "no registered origin". Na credencial que termina em `...r3td8vn0`, o endereço `https://seufuncionario-expo.brunapsiles.workers.dev` precisa estar em **"Origens JavaScript autorizadas"** (a caixa de cima, sem barra no final). Salvar e aguardar ~10 min.

### 2. Testar o cadastro real

- Criar uma conta no app com um e-mail seu de verdade e confirmar que o código de 6 dígitos chega (pode cair no spam nas primeiras vezes — marque "não é spam").

### 3. Ativar Gmail API e Calendar API (para envio real de e-mail e criação real de eventos)

- No mesmo projeto do Google Cloud usado no login: **APIs e serviços → Biblioteca** → ativar **Gmail API** e **Google Calendar API**.
- **APIs e serviços → Tela de consentimento OAuth → Acesso a dados/Escopos** → adicionar `.../auth/gmail.send` e `.../auth/calendar.events`.
- Se o app estiver em modo "Teste", adicionar sua conta Google em **Usuários de teste**.
- Sem isso, os botões "Enviar pelo Gmail" (CRM) e "Adicionar à Google Agenda" (Tarefas/Agendamentos) mostram erro do Google — o código já está pronto e publicado, só falta essa configuração.
- Ao usar pela primeira vez, o Google mostra a tela "app não verificado" — normal até você submeter o app para revisão (não obrigatório para uso próprio/testes).

## 🟡 Opcionais / segurança

### 3. Restringir ou regenerar chaves compartilhadas em conversas

- Chaves que passaram por chats (Codex/Claude): token Cloudflare, Gemini, xAI, Google API key, Brevo. O app guarda todas em cofre seguro; regenerar é só uma camada extra de proteção contra terceiros.
- Google API key: em console.cloud.google.com → Credenciais, dá para **restringir** quais APIs ela pode usar.

### 4. Domínio próprio (ex.: seufuncionario.com.br)

- Pago (~R$ 40/ano em registro.br). Deixa o endereço com a sua marca e habilita e-mails do seu domínio. O endereço gratuito atual continua funcionando para sempre.

### 5. Servidor GPU para vídeo próprio (pasta `video-ai/`)

- Pago. Sem ele, o estúdio já oferece o caminho gratuito (Hugging Face) para vídeos; imagens e logos funcionam normalmente.

### 6. Login com Apple

- Exige conta de desenvolvedor Apple (US$ 99/ano). Recomendação: não fazer por enquanto.

## ✅ Já resolvidas

- Conta Cloudflare conectada, app publicado e permanente
- Deploy automático conectado ao GitHub; alterações na `main` são publicadas sem ação manual
- Publicação real de sites e captação de contatos no banco
- Chaves Gemini/xAI/Google/Brevo no cofre do servidor
- Login com Google construído (falta só a origem — item 2)
- Verificação de e-mail por código no cadastro (Brevo ativo)
- Recuperação de senha por código de e-mail
- Guia `AGENTS.md` para revezamento entre assistentes
