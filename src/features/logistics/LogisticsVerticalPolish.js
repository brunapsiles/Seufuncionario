import "./LogisticsVerticalAccess.css";

const LABELS = new Map([
  ["VERTICAL PRIVADA · To Do Green", "PORTAL TO DO GREEN"],
  ["VERTICAL PRIVADA · TO DO GREEN", "PORTAL TO DO GREEN"],
  ["Vertical To Do Green protegida", "Acesso restrito à To Do Green"],
  ["Esta área só abre para usuários vinculados ao workspace da To Do Green ou com permissão individual ativa. Entrar pela URL não concede acesso.", "Este ambiente é exclusivo para usuários autorizados da To Do Green. O acesso é liberado por convite, e-mail corporativo ou permissão individual ativa."],
  ["Usuário atual", "Conta"],
  ["Tenant", "Ambiente"],
  ["todogreen", "To Do Green"],
  ["Transferência entre CDs, hubs ou lojas", "Transferência entre CDs"],
  ["Receita, forecast e faturamento", "Receita e forecast"],
  ["Custos, OPEX e margem", "Custos e margem"],
  ["ESG, Green Score e Escopo 3", "ESG e Green Score"],
  ["Logística sustentável com preço, operação e ESG no mesmo painel.", "Central To Do Green"],
  ["A vertical agora separa módulos funcionais de backlog. Card sem fluxo real não aparece como pronto.", "Operação, pricing, ESG, pipeline e governança em uma experiência privada e objetiva."],
  ["módulos por tenant, com rota e permissão", "funções privadas com acesso controlado"],
  ["Produtos logísticos", "Produtos"],
  ["Produto logístico customizado", "Projeto customizado"],
  ["Projeto logístico personalizado", "Projeto customizado"],
  ["Calculadora Ambiental", "Cálculo ambiental"],
  ["Dashboard ESG", "Painel ESG"],
  ["Relatórios ESG", "Relatórios"],
  ["Certificados e declarações", "Declarações"],
  ["Remuneração Variável", "Comissões"],
  ["Operação a granel", "Granel"],
  ["Distribuição fracionada", "Fracionado"],
  ["Abastecimento de lojas", "Abastecimento"],
  ["Coleta em fornecedores", "Coletas"],
  ["Operação dedicada", "Dedicada"],
  ["Ver itens planejados desta área", "Ver backlog desta área"],
  ["Backlog mapeado; ainda não exibido como funcional.", "Planejado. Ainda não liberado como função."],
  ["funcional", "ativo"],
]);

const replaceTextNode = (node) => {
  const original = node.nodeValue;
  if (!original) return;
  let next = original;
  for (const [from, to] of LABELS.entries()) {
    next = next.replaceAll(from, to);
  }
  if (next !== original) node.nodeValue = next;
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

const polishAccessScreen = () => {
  const denied = document.querySelector(".tdg-denied-card");
  if (!denied) return;
  denied.setAttribute("data-tdg-access", "private-portal");
  const terms = denied.querySelectorAll("dt, dd, h1, p, span");
  terms.forEach((element) => {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) replaceTextNode(node);
    }
  });
};

const polish = () => {
  walk(document);
  markCards();
  polishAccessScreen();
};

if (typeof window !== "undefined") {
  const start = () => {
    polish();
    const observer = new MutationObserver(() => polish());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
