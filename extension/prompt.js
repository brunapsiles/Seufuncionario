// Núcleo puro da extensão: monta o prompt enviado à IA a partir do modo e do
// contexto da página. Sem dependências do navegador — testável em Node/vitest.
// popup.js importa esta função; o teste em src/extension-prompt.test.js valida.

const MAX = 6000;
const clip = (s) => String(s || "").replace(/\s+\n/g, "\n").trim().slice(0, MAX);

export function buildExtensionPrompt(mode, ctx = {}) {
  const url = String(ctx.url || "").trim();
  const selection = clip(ctx.selection);
  const pageText = clip(ctx.pageText);
  const question = String(ctx.question || "").trim();
  const target = selection || pageText;

  switch (mode) {
    case "summary":
      return `Resuma em português do Brasil a página abaixo, com um parágrafo curto e depois os pontos principais em tópicos. Não invente o que não estiver no texto.${
        url ? `\n\nPágina: ${url}` : ""
      }\n\n${pageText}`;
    case "translate":
      return `Detecte o idioma do texto abaixo e traduza para o português do Brasil, mantendo o sentido e o tom. Responda somente com a tradução.\n\n${target}`;
    case "reply":
      return `Escreva uma resposta profissional e cordial, em português do Brasil, para a mensagem/e-mail abaixo. Seja objetivo e educado.${
        question ? `\nInstrução adicional: ${question}` : ""
      }\n\nMensagem recebida:\n${target}`;
    case "explain":
      return `Explique de forma simples e clara, em português do Brasil, o trecho abaixo. Se houver termos difíceis, defina-os.\n\n${target}`;
    case "ask":
    default:
      return `${question || "Sobre o conteúdo abaixo:"}\n\nResponda em português do Brasil, usando apenas o conteúdo da página a seguir${
        url ? ` (${url})` : ""
      } — se a resposta não estiver nele, diga que não consta.\n\n${target}`;
  }
}

// Também exposto para ambientes CommonJS (não quebra a importação ESM acima).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildExtensionPrompt };
}
