// ===== Formatos compartilhados do worker =====
//
// Espelha src/components/formato.js do lado do servidor: dinheiro em real
// para orçamento, loja virtual e site público — texto gerado no worker, não
// no navegador, então não pode reaproveitar o utilitário do front.

export const moneyBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Tira o que dá para montar marcação HTML e corta no tamanho — não é
// sanitização de HTML de verdade, é o suficiente para texto livre que vai
// para uma coluna de banco, não para um editor de rich text.
export const cleanText = (value, max = 200) =>
  String(value || "")
    .replace(/[<>{}]/g, "")
    .trim()
    .slice(0, max);
