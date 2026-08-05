import "./LogisticsVerticalSalesPerformance.css";

const SALES_ROUTINE = {
  title: "Performance comercial",
  route: "/todogreen/receita",
  score: "8.4",
  text: "Metas, carteira, receita elegível, comissão prevista, comissão liberada e qualidade da venda.",
  subs: ["Metas", "Vendedores", "Comissões", "Aceleradores"],
};

const SALES_BLOCKS = [
  ["Meta por vendedor", "Receita, margem, novos clientes, propostas enviadas e indicadores ESG vendidos."],
  ["Comissão prevista", "Calculada por receita elegível, produto, margem mínima e status da proposta."],
  ["Comissão liberada", "Só entra após faturamento, recebimento, margem validada e ausência de bloqueio."],
  ["Aceleradores", "Bônus por venda estratégica, cliente enterprise, contrato recorrente e alta redução de emissões."],
];

const navigate = (route) => {
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const createRoutineCard = () => {
  const button = document.createElement("button");
  button.className = "tdg-routine-card tdg-sales-routine";
  button.type = "button";
  button.setAttribute("aria-label", `Abrir ${SALES_ROUTINE.title}`);
  button.innerHTML = `
    <header><strong>${SALES_ROUTINE.title}</strong><b>nota ${SALES_ROUTINE.score}</b></header>
    <p>${SALES_ROUTINE.text}</p>
    <div class="tdg-routine-sub">${SALES_ROUTINE.subs.map((item) => `<span>${item}</span>`).join("")}</div>
  `;
  button.addEventListener("click", () => navigate(SALES_ROUTINE.route));
  return button;
};

const ensureSalesRoutine = () => {
  const grid = document.querySelector(".tdg-routine-grid");
  if (!grid || document.querySelector(".tdg-sales-routine")) return;
  const finance = [...grid.querySelectorAll(".tdg-routine-card")].find((card) =>
    card.textContent.includes("Financeiro"),
  );
  const card = createRoutineCard();
  if (finance) finance.insertAdjacentElement("beforebegin", card);
  else grid.appendChild(card);

  const score = document.querySelector(".tdg-routine-score");
  if (score) score.textContent = "régua mínima 8/10 · 9 rotinas";
};

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
    <div>
      <span class="tdg-kicker">PERFORMANCE COMERCIAL</span>
      <h2>Metas e comissionamento</h2>
      <p>O vendedor precisa enxergar meta, carteira, pipeline, receita elegível e comissão sem depender de planilha externa. A comissão deve premiar venda boa, não apenas volume vendido.</p>
    </div>
    <div class="tdg-sales-grid">
      ${SALES_BLOCKS.map(([title, text]) => `<article><span>${title}</span><strong>${title}</strong><small>${text}</small></article>`).join("")}
    </div>
    <div class="tdg-sales-formula">
      <strong>Regra operacional</strong>
      <small>Comissão = receita elegível × percentual do produto × fator de margem × fator de atingimento. Bloqueios: margem abaixo do mínimo, proposta sem aprovação, cliente inadimplente, operação não iniciada ou evidência pendente.</small>
    </div>
  `;
  revenuePanel.prepend(section);
};

const relabelFinanceRoutine = () => {
  document.querySelectorAll(".tdg-routine-card").forEach((card) => {
    if (!card.textContent.includes("Financeiro")) return;
    const paragraph = card.querySelector("p");
    if (paragraph) paragraph.textContent = "Receita, custos, margem, forecast, faturamento, metas e elegibilidade de comissão.";
    const sub = card.querySelector(".tdg-routine-sub");
    if (sub && !sub.textContent.includes("Comissões")) {
      sub.insertAdjacentHTML("beforeend", "<span>Comissões</span><span>Metas</span>");
    }
  });
};

const run = () => {
  ensureSalesRoutine();
  ensureSalesPerformanceBlock();
  relabelFinanceRoutine();
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
