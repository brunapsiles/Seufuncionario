# Extensão do navegador — Seu Funcionário

Leva a IA do Seu Funcionário para **qualquer página** do navegador: resumir,
traduzir uma seleção, escrever uma resposta a uma mensagem/e-mail, explicar um
trecho ou perguntar sobre o que você está vendo.

É a **frente 4** do pacote de funções grandes. Não é uma página do app: é um
pequeno pacote de extensão que conversa com a mesma IA (o mesmo endpoint
`/api/ai`), usando o seu token de acesso.

## Como instalar (Chrome / Edge / Brave)

1. Abra `chrome://extensions`.
2. Ligue o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha esta pasta `extension/`.
4. Fixe a extensão na barra (ícone de quebra-cabeça → alfinete).

## Como instalar (Firefox)

1. Abra `about:debugging#/runtime/this-firefox`.
2. **Carregar extensão temporária…** e selecione o arquivo `manifest.json`
   desta pasta.

## Como conectar

1. No app, vá em **Configurações → Extensão do navegador** e copie o **token**.
2. Clique no ícone da extensão → engrenagem (⚙️) → cole o token → **Salvar**.
   O token fica salvo só no seu navegador.

## O que ela faz

- **Resumir a página** — resumo + pontos principais.
- **Traduzir seleção** — traduz o texto selecionado para português.
- **Responder mensagem** — escreve uma resposta cordial para o texto
  selecionado (e-mail, mensagem).
- **Explicar seleção** — explica um trecho de forma simples.
- **Perguntar** — pergunte qualquer coisa sobre a página aberta.

Também há um item no **menu do botão direito**: "Perguntar ao Seu Funcionário".

## Gratuidade e privacidade

- Usa o mesmo endpoint de IA do app (sem serviço novo, sem custo extra).
- Só envia o conteúdo para a IA quando **você** clica em uma ação.
- O token fica apenas no seu navegador (`chrome.storage.local`).

## Publicar na loja (opcional)

- **Firefox**: gratuito.
- **Chrome Web Store**: taxa única de US$ 5 para conta de desenvolvedor. Não é
  necessário para uso pessoal via "Carregar sem compactação".

## Manutenção

A lógica de montagem do prompt fica em `prompt.js` (`buildExtensionPrompt`),
importada pelo `popup.js` e coberta por testes em
`src/extension-prompt.test.js`. Se mudar o comportamento, atualize os dois.
