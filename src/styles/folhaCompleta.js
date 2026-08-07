import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A folha inteira, montada na ordem em que o navegador a monta.
//
// Os testes de layout liam `styles.css` direto. Depois da divisão esse arquivo
// virou índice — tem só os `@import` — e as asserções passariam a olhar para o
// nada, verdes por vazio. Que é a pior maneira de um teste falhar.
//
// Este ajudante lê o índice, segue os imports na ordem declarada e devolve o
// resultado concatenado. O teste passa a verificar o que a tela recebe, e não
// um arquivo específico — se amanhã a divisão mudar de forma, ele continua
// verificando a coisa certa.
export const folhaCompleta = () => {
  const indice = fileURLToPath(new URL("../styles.css", import.meta.url));
  const texto = readFileSync(indice, "utf8");
  const partes = [
    ...texto.matchAll(/@import\s+(?:url\()?["']([^"']+)["']\)?\s*;/g),
  ].map((m) => m[1]);
  return partes
    .map((caminho) => {
      const alvo = fileURLToPath(
        new URL(
          caminho.replace(/^\.\//, "./"),
          new URL("../", import.meta.url),
        ),
      );
      return readFileSync(alvo, "utf8");
    })
    .join("\n");
};
