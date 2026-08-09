// ===== Formatos compartilhados do worker =====
//
// Espelha src/components/formato.js do lado do servidor: dinheiro em real
// para orçamento, loja virtual e site público — texto gerado no worker, não
// no navegador, então não pode reaproveitar o utilitário do front.

export const moneyBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
