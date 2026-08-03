import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Trava de regressão para o layout no celular. Não substitui olhar a tela, mas
// pega de graça a classe de erro que deixava o app "desengonçado" no aparelho
// da titular: caixa que fica mais larga que a tela e some pela direita.
const css = readFileSync(
  fileURLToPath(new URL("./styles.css", import.meta.url)),
  "utf8",
);

// Extrai o corpo de cada @media (max-width: N) com N <= 980, respeitando as
// chaves aninhadas — regex sozinha para no primeiro "}" e pega bloco errado.
const blocosDeCelular = () => {
  const blocos = [];
  const re = /@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    if (Number(m[1]) > 980) continue;
    let profundidade = 1;
    let i = re.lastIndex;
    while (i < css.length && profundidade > 0) {
      if (css[i] === "{") profundidade++;
      else if (css[i] === "}") profundidade--;
      i++;
    }
    blocos.push({ largura: Number(m[1]), corpo: css.slice(re.lastIndex, i) });
  }
  return blocos;
};

describe("layout no celular", () => {
  it("acha os blocos de celular na folha de estilo", () => {
    expect(blocosDeCelular().length).toBeGreaterThan(3);
  });

  it("coluna única de celular usa minmax(0, 1fr), não 1fr puro", () => {
    // Com `1fr` puro a faixa cresce até a largura mínima do conteúdo: um
    // <select> ou um botão largo empurrava o cartão inteiro para fora da tela.
    const culpados = blocosDeCelular().filter((b) =>
      /grid-template-columns:\s*1fr\s*;/.test(b.corpo),
    );
    expect(culpados.map((b) => b.largura)).toEqual([]);
  });

  it("o cabeçalho de seção quebra linha em vez de empurrar o botão para fora", () => {
    const regra = css.match(
      /\.section-head,\s*\n\.panel-head\s*\{[^}]*\}/,
    )?.[0];
    expect(regra).toBeTruthy();
    expect(regra).toMatch(/flex-wrap:\s*wrap/);
  });

  it("campo nenhum pode passar da largura da tela", () => {
    const temTeto = blocosDeCelular().some((b) =>
      /input,\s*\n?\s*select,\s*\n?\s*textarea\s*\{[^}]*max-width:\s*100%/.test(
        b.corpo,
      ),
    );
    expect(temTeto).toBe(true);
  });

  it("as abas de visão rolam em vez de serem cortadas", () => {
    const regra = css.match(/\.view-toggle\s*\{[^}]*overflow-x:\s*auto/);
    expect(regra).toBeTruthy();
  });

  it("o app declara viewport-fit=cover para respeitar o entalhe do iPhone", () => {
    const html = readFileSync(
      fileURLToPath(new URL("../index.html", import.meta.url)),
      "utf8",
    );
    expect(html).toMatch(/viewport-fit=cover/);
    // A área segura só vale se o CSS realmente usar env(safe-area-inset-*).
    expect(css).toMatch(/env\(safe-area-inset-left\)/);
  });

  it("campo de texto no celular tem 16px, senão o iOS dá zoom e não volta", () => {
    const temFonte = blocosDeCelular().some((b) =>
      /input,[\s\S]{0,80}textarea\s*\{[^}]*font-size:\s*16px/.test(b.corpo),
    );
    expect(temFonte).toBe(true);
  });

  it("alvo de toque tem pelo menos 44px", () => {
    const temAlvo = blocosDeCelular().some((b) =>
      /\.icon-button[\s\S]{0,200}min-height:\s*44px/.test(b.corpo),
    );
    expect(temAlvo).toBe(true);
  });

  it("a página não rola para os lados", () => {
    expect(css).toMatch(/html,\s*\n?body\s*\{[^}]*overflow-x:\s*hidden/);
  });
});
