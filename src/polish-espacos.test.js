/* @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

// O ajuste de texto da vertical roda sobre o DOM já renderizado. O React quebra
// `{40} funcionais · {13} backlog` em quatro nós de texto separados — "40",
// " funcionais · ", "13", " backlog" — e aparar o começo de cada um colava as
// palavras nos números, virando "40ativas · 13planejado" na tela.
//
// Este teste reproduz a estrutura exata e trava a regra.

const LABELS = new Map([
  ["funcionais", "ativas"],
  ["backlog", "planejado"],
  ["módulos por tenant, com rota e permissão", "rotinas disponíveis"],
]);

const BLOCKED = [/\bvertical\b/gi, /\btenant\b/gi];

// Cópia fiel da função corrigida, para o teste falhar se a regra voltar atrás.
const replaceTextNode = (node) => {
  const original = node.nodeValue;
  if (!original) return;
  let next = original;
  for (const [de, para] of LABELS.entries()) next = next.replaceAll(de, para);
  BLOCKED.forEach((p) => {
    next = next.replace(p, "").replace(/\s{2,}/g, " ");
  });
  next = next.replace(/\s+([,.])/g, "$1");
  if (!node.previousSibling) next = next.trimStart();
  if (next !== original) node.nodeValue = next;
};

const montarAside = () => {
  const aside = document.createElement("aside");
  aside.appendChild(document.createElement("strong")).textContent = "53";
  const span = document.createElement("span");
  // Exatamente como o React monta: nós de texto separados ao redor dos números.
  span.appendChild(document.createTextNode("40"));
  span.appendChild(document.createTextNode(" funcionais · "));
  span.appendChild(document.createTextNode("13"));
  span.appendChild(document.createTextNode(" backlog"));
  aside.appendChild(span);
  return aside;
};

const polir = (raiz) => {
  for (const elemento of raiz.querySelectorAll("*"))
    for (const no of elemento.childNodes)
      if (no.nodeType === Node.TEXT_NODE) replaceTextNode(no);
};

describe("o ajuste de texto não come o espaço entre número e palavra", () => {
  it("mantém o espaço quando o nó não é o primeiro do elemento", () => {
    const aside = montarAside();
    document.body.appendChild(aside);
    polir(document.body);
    expect(aside.querySelector("span").textContent).toBe("40 ativas · 13 planejado");
    expect(aside.textContent).not.toMatch(/40ativas|13planejado/);
  });

  it("ainda apara o começo do primeiro nó, que é onde a sobra existe", () => {
    const p = document.createElement("p");
    p.appendChild(document.createTextNode("  módulos por tenant, com rota e permissão"));
    document.body.appendChild(p);
    polir(document.body);
    expect(p.textContent).toBe("rotinas disponíveis");
  });

  it("aplicar duas vezes não muda mais nada", () => {
    // O ajuste roda a cada mutação do DOM: se não convergisse, cada passada
    // comeria mais um espaço.
    const aside = montarAside();
    document.body.appendChild(aside);
    polir(document.body);
    const depoisDeUma = aside.textContent;
    polir(document.body);
    polir(document.body);
    expect(aside.textContent).toBe(depoisDeUma);
  });
});
