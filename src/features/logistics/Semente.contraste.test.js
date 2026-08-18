import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// ===== A cor da conversa não pode ser decidida por outra folha =====
//
// As bolhas do chat da Semente são <p>. A vertical carrega uma regra ampla
// `.tdg p { color: var(--tdg-muted) }` — cinza. Como `.tdg p` vale (0,1,1) e
// `.semente-msg--voce` valia (0,1,0), o CINZA vencia o branco: a mensagem da
// própria pessoa saía cinza sobre o verde escuro da bolha, e o erro saía
// cinza no lugar do vermelho. Medido no navegador, não deduzido.
//
// A defesa é especificidade, não ordem de import: empate resolvido por ordem
// de carregamento volta a quebrar no dia em que alguém reordenar um arquivo.
// Por isso toda regra que pinta texto de mensagem precisa nascer dentro de
// `.semente`.

// Comentários fora: eles citam as próprias classes que este teste procura, e
// um comentário explicando o bug seria lido como se fosse o bug.
const css = readFileSync(new URL("./Semente.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

// As classes cujo texto é lido pela pessoa e que são renderizadas em <p>.
const CLASSES_DE_TEXTO = [
  "semente-msg--voce",
  "semente-msg--semente",
  "semente-msg--erro",
  "semente-msg--pensando",
];

// Um seletor "solto" é o que começa direto na classe, sem o pai `.semente`.
const regrasQuePintam = (classe) =>
  css
    .split("}")
    .map((bloco) => bloco.trim())
    .filter((bloco) => bloco.includes(`.${classe}`) && /(^|[^-])color\s*:/.test(bloco));

describe("a cor do texto do chat da Semente é imune a `.tdg p`", () => {
  for (const classe of CLASSES_DE_TEXTO) {
    it(`.${classe} só recebe cor por seletor iniciado em .semente`, () => {
      const soltas = regrasQuePintam(classe).filter((bloco) => {
        const seletores = bloco.split("{")[0].split(",").map((s) => s.trim());
        // Basta UM seletor da lista mirar a classe sem passar por .semente
        // para a regra inteira ficar vulnerável ao cinza de `.tdg p`.
        return seletores.some(
          (sel) => sel.includes(`.${classe}`) && !sel.startsWith(".semente "),
        );
      });

      expect(
        soltas,
        `escreva ".semente .${classe}" — sem o pai, "\`.tdg p\`" (0,1,1) vence e o texto sai cinza`,
      ).toEqual([]);
    });
  }

  it("a mensagem da pessoa continua branca sobre a bolha verde", () => {
    expect(css).toMatch(/\.semente\s+\.semente-msg--voce\s*\{[^}]*color:\s*#fff/);
  });
});
