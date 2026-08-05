const LABELS = new Map([
  ["Transferência entre CDs, hubs ou lojas", "Transferência entre CDs"],
  ["Receita, forecast e faturamento", "Receita e forecast"],
  ["Custos, OPEX e margem", "Custos e margem"],
  ["ESG, Green Score e Escopo 3", "ESG e Green Score"],
  ["Logística sustentável com preço, operação e ESG no mesmo painel.", "Central To Do Green"],
  ["A vertical agora separa módulos funcionais de backlog. Card sem fluxo real não aparece como pronto.", "Operação, pricing, ESG, pipeline e governança em uma experiência privada e objetiva."],
  ["Produtos logísticos", "Produtos"],
  ["Produto logístico customizado", "Projeto customizado"],
  ["Projeto logístico personalizado", "Projeto customizado"],
  ["Calculadora Ambiental", "Cálculo ambiental"],
  ["Dashboard ESG", "Painel ESG"],
  ["Relatórios ESG", "Relatórios"],
  ["Certificados e declarações", "Declarações"],
  ["Remuneração Variável", "Comissões"],
  ["Centros de custo", "Centros de custo"],
  ["Operação a granel", "Granel"],
  ["Distribuição fracionada", "Fracionado"],
  ["Abastecimento de lojas", "Abastecimento"],
  ["Coleta em fornecedores", "Coletas"],
  ["Operação dedicada", "Dedicada"],
]);

const replaceTextNode = (node) => {
  const text = node.nodeValue;
  if (!text) return;
  const clean = LABELS.get(text.trim());
  if (clean && text !== clean) node.nodeValue = text.replace(text.trim(), clean);
};

const walk = (root) => {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll(".tdg *").forEach((element) => {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) replaceTextNode(node);
    }
  });
};

const markCards = () => {
  document.querySelectorAll(".tdg-module-card:not(.disabled), .tdg-product-card, .tdg-tabs button").forEach((button) => {
    button.setAttribute("data-tdg-clickable", "true");
    if (!button.getAttribute("aria-label")) {
      const label = button.textContent?.replace(/\s+/g, " ").trim();
      if (label) button.setAttribute("aria-label", `Abrir ${label}`);
    }
  });
};

const polish = () => {
  walk(document);
  markCards();
};

if (typeof window !== "undefined") {
  const start = () => {
    polish();
    const observer = new MutationObserver(() => polish());
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
