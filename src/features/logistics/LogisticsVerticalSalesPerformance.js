import "./LogisticsVerticalSalesPerformance.css";
import "./LogisticsVerticalRecovery.css";
import "./LogisticsVerticalRecovery.js";
import "./LogisticsVerticalCredentials.js";
import "./LogisticsVerticalFleet.js";

const SALES_BLOCKS = [
  ["Meta por vendedor", "Receita, margem, novos clientes, propostas enviadas, contratos recorrentes e indicadores ESG vendidos."],
  ["Meta coletiva", "Receita do time, margem consolidada, carteira ativa, retenção, expansão e produtos estratégicos."],
  ["Comissão prevista", "Calculada sobre receita elegível, produto vendido, margem mínima, status da proposta e atingimento da meta."],
  ["Comissão liberada", "Só libera após faturamento, recebimento, margem validada, operação iniciada e ausência de bloqueios."],
  ["Aceleradores", "Multiplicadores por cliente enterprise, contrato recorrente, expansão relevante e alta redução de emissões."],
  ["Estornos e clawback", "Reverte comissão em inadimplência, cancelamento, margem negativa, erro de premissa ou descumprimento operacional."],
  ["Divisão de venda", "Permite rateio entre SDR, hunter, farmer, pricing e liderança conforme regra versionada."],
  ["Período fechado", "Alterações de regra não recalculam períodos encerrados sem fluxo formal de ajuste e aprovação."],
];

const COMMISSION_RULES = [
  "Receita elegível por produto e cliente",
  "Margem mínima atingida",
  "Proposta aprovada quando houver exceção",
  "Faturamento emitido",
  "Recebimento confirmado",
  "Operação iniciada",
  "Sem pendência documental ou ESG",
  "Regra versionada por período",
];

const COMMERCIAL_SUBFUNCTIONS = ["Metas", "Comissões", "Benchmark", "Deal Desk", "Carteira", "Próxima ação"];
const FINANCE_SUBFUNCTIONS = ["Receita prevista", "Contratada", "Realizada", "Faturada", "Recebida", "Comissões", "Clawback"];

const ensureSalesPerformanceBlock = () => {
  const revenuePanel = [...document.querySelectorAll(".tdg-panel")].find((panel) =>
    panel.textContent.includes("RECEITA") ||
    panel.textContent.includes("Financeiro") ||
    panel.textContent.includes("forecast") ||
    panel.textContent.includes("Faturamento"),
  );
  if (!revenuePanel || revenuePanel.querySelector(".tdg-sales-performance")) return;
  const section = document.createElement("section");
  section.className = "tdg-sales-performance";
  section.innerHTML = `
    <div><span class="tdg-kicker">METAS E COMISSÕES</span><h2>Performance comercial</h2><p>O vendedor acompanha meta, carteira, pipeline, receita elegível e comissão estimada sem planilha externa. A premiação considera qualidade da venda, margem, recebimento, recorrência, produto vendido e aderência ESG.</p></div>
    <div class="tdg-sales-grid">${SALES_BLOCKS.map(([title, text]) => `<article><span>${title}</span><strong>${title}</strong><small>${text}</small></article>`).join("")}</div>
    <div class="tdg-sales-formula"><strong>Regra operacional</strong><small>Comissão = receita elegível × percentual do produto × fator de margem × fator de atingimento × aceleradores − estornos. Toda regra deve ter versão, vigência, responsável, aprovação e bloqueio de períodos fechados.</small></div>
    <div class="tdg-sales-rules">${COMMISSION_RULES.map((item) => `<span>${item}</span>`).join("")}</div>`;
  revenuePanel.prepend(section);
};

const appendSubfunctions = (card, items) => {
  const sub = card.querySelector(".tdg-routine-sub");
  if (!sub) return;
  items.forEach((item) => {
    if (!sub.textContent.includes(item)) sub.insertAdjacentHTML("beforeend", `<span>${item}</span>`);
  });
};

const setTextIfChanged = (element, value) => {
  if (element && element.textContent !== value) element.textContent = value;
};

const relabelExistingRoutines = () => {
  document.querySelectorAll(".tdg-routine-card").forEach((card) => {
    const text = card.textContent || "";
    if (text.includes("Financeiro")) {
      setTextIfChanged(card.querySelector("p"), "Receita, custos, margem, forecast, faturamento, recebimento, metas e comissão elegível.");
      appendSubfunctions(card, FINANCE_SUBFUNCTIONS);
    }
    if (text.includes("CRM") || text.includes("Oportunidades")) appendSubfunctions(card, COMMERCIAL_SUBFUNCTIONS);
  });
  document.querySelector(".tdg-routine-score")?.remove();
};

const run = () => {
  document.querySelectorAll(".tdg-sales-routine").forEach((card) => card.remove());
  ensureSalesPerformanceBlock();
  relabelExistingRoutines();
};

if (typeof window !== "undefined") {
  const start = () => {
    run();
    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
