const PRODUCT_IDS = [
  "middle-mile",
  "last-mile",
  "dedicated",
  "transfer",
  "store-replenishment",
  "supplier-pickup",
  "fractional-distribution",
  "bulk",
  "custom-project",
];

const PRODUCT_NAMES = {
  "middle-mile": "Middle Mile",
  "last-mile": "Last Mile",
  dedicated: "Operação dedicada",
  transfer: "Transferência entre unidades",
  "store-replenishment": "Abastecimento de lojas",
  "supplier-pickup": "Coleta em fornecedores",
  "fractional-distribution": "Distribuição fracionada",
  bulk: "Transporte a granel",
  "custom-project": "Projeto logístico personalizado",
};

const MODULE_META = {
  clientes: ["Clientes e contatos", "Cadastre e acompanhe clientes, decisores, necessidades e próximos passos."],
  oportunidades: ["Oportunidades", "Acompanhe oportunidades comerciais, etapas, prioridades e potencial de negócio."],
  propostas: ["Propostas e contratos", "Crie propostas comerciais e acompanhe as condições de cada negociação."],
  precificacao: ["Precificação", "Escolha o serviço logístico que deseja calcular."],
  esg: ["Inteligência ESG", "Acompanhe impacto ambiental, Green Score e informações para clientes."],
  "central-esg": ["Central ESG", "Calcule, registre e acompanhe os resultados ambientais de cada cliente."],
  operacoes: ["Operações", "Registre e acompanhe rotas, viagens, entregas, produtividade e ocorrências."],
  receita: ["Receitas", "Acompanhe previsão, faturamento e recebimentos por cliente e serviço."],
  custos: ["Custos e margem", "Registre custos e acompanhe a rentabilidade das operações."],
  comissoes: ["Comissões", "Acompanhe valores e regras comerciais aplicáveis."],
  relatorios: ["Relatórios", "Consulte e gere informações comerciais, operacionais, financeiras e ambientais."],
  metodologia: ["Metodologia", "Consulte premissas, fontes e critérios utilizados nos cálculos."],
  auditoria: ["Auditoria e governança", "Acompanhe alterações, aprovações e responsabilidades."],
  acessos: ["Usuários e acessos", "Gerencie quem pode acessar e o que cada pessoa pode fazer."],
  "green-score": ["Green Score", "Acompanhe o indicador ambiental e sua evolução."],
  "calculadora-ambiental": ["Calculadora ambiental", "Calcule o impacto ambiental de uma operação."],
  "tradutor-esg": ["Tradutor ESG", "Transforme resultados ambientais em informações claras para o cliente."],
  "escopo-3": ["Escopo 3", "Organize as emissões relacionadas às operações logísticas do cliente."],
};

export const parseTodoGreenRoute = (pathname = "") => {
  const parts = String(pathname)
    .replace(/^\/todogreen\/?/, "")
    .split("/")
    .filter(Boolean);
  const section = parts[0] || "dashboard";
  return {
    section,
    detail: parts[1] || "",
    isHome: parts.length === 0 || section === "dashboard",
  };
};

export const pricingRoute = (productId) =>
  `/todogreen/precificacao/${PRODUCT_IDS.includes(productId) ? productId : "middle-mile"}`;

const navigate = (route) => {
  if (window.location.pathname === route) return;
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const setText = (node, value) => {
  if (node && node.textContent !== value) node.textContent = value;
};

const markProductCards = (root) => {
  root.querySelectorAll(".tdg-product-strip").forEach((strip) => {
    [...strip.querySelectorAll(".tdg-product-card")].forEach((button, index) => {
      const productId = PRODUCT_IDS[index];
      if (productId && button.dataset.tdgProductId !== productId)
        button.dataset.tdgProductId = productId;
    });
  });
};

const simplifyHomeLanguage = (root) => {
  const hero = root.querySelector(".tdg-hero");
  if (hero) {
    setText(hero.querySelector(".tdg-kicker"), "TO DO GREEN");
    setText(
      hero.querySelector("div > p"),
      "Escolha uma área e abra apenas o ambiente que precisa usar.",
    );
    const status = hero.querySelector("aside span");
    if (status) {
      const next = status.textContent
        .replace(/funcionais/gi, "disponíveis")
        .replace(/backlog/gi, "em preparação");
      setText(status, next);
    }
    setText(hero.querySelector("aside small"), "Recursos organizados por área e perfil de acesso.");
  }

  root.querySelectorAll(".tdg-module-card em").forEach((label) => {
    setText(label, /backlog/i.test(label.textContent || "") ? "Em preparação" : "Abrir");
  });
  root.querySelectorAll(".tdg-section-head > span").forEach((label) => {
    if (!/funcionais|backlog/i.test(label.textContent || "")) return;
    setText(
      label,
      label.textContent
        .replace(/funcionais/gi, "disponíveis")
        .replace(/backlog/gi, "em preparação"),
    );
  });
  root.querySelectorAll(".tdg-backlog summary").forEach((summary) =>
    setText(summary, "Ver recursos em preparação"),
  );
  root.querySelectorAll(".tdg-product-card small").forEach((label) => {
    setText(label, label.textContent.replace(/obrigatórios/gi, "campos necessários"));
  });
};

const markHomeOnlySections = (root) => {
  root.querySelectorAll(":scope > .tdg-panel").forEach((panel) => {
    const kicker = panel.querySelector(".tdg-kicker")?.textContent || "";
    if (/PRODUTOS LOGÍSTICOS/i.test(kicker)) panel.dataset.tdgHomeOnly = "true";
  });
};

const ensurePageHeader = (root, route) => {
  let header = root.querySelector(":scope > [data-tdg-page-header]");
  if (route.isHome) {
    root.classList.remove("tdg-module-page");
    header?.remove();
    return;
  }

  root.classList.add("tdg-module-page");
  if (!header) {
    header = document.createElement("section");
    header.className = "tdg-page-header";
    header.dataset.tdgPageHeader = "true";
    root.prepend(header);
  }

  const productName = PRODUCT_NAMES[route.detail];
  const isPricingSelection = route.section === "precificacao" && !productName;
  const isPricingDetail = route.section === "precificacao" && !!productName;
  const [baseTitle, baseDescription] = MODULE_META[route.section] || [
    "To Do Green",
    "Ambiente de trabalho da vertical To Do Green.",
  ];
  const title = isPricingDetail ? `Precificação: ${productName}` : baseTitle;
  const description = isPricingDetail
    ? "Preencha os dados da operação e consulte preço, margem e impacto ambiental em uma visão dedicada."
    : isPricingSelection
      ? "Selecione abaixo o tipo de operação que deseja precificar."
      : baseDescription;
  const key = `${route.section}:${route.detail}:${title}`;

  if (header.dataset.tdgHeaderKey !== key) {
    header.dataset.tdgHeaderKey = key;
    header.innerHTML = `
      <div class="tdg-page-heading">
        <span>TO DO GREEN</span>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      <div class="tdg-page-actions">
        ${isPricingDetail ? '<button type="button" data-tdg-pricing-types>Trocar tipo</button>' : ""}
        <button type="button" data-tdg-page-home>Voltar ao início</button>
      </div>
    `;
  }
};

const configurePricingPage = (root, route) => {
  const panel = root.querySelector(".tdg-pricing");
  if (!panel) return;
  const productName = PRODUCT_NAMES[route.detail];
  const selection = route.section === "precificacao" && !productName;
  const detail = route.section === "precificacao" && !!productName;

  panel.classList.toggle("tdg-pricing-select", selection);
  panel.classList.toggle("tdg-pricing-detail", detail);

  if (selection) {
    setText(panel.querySelector(".tdg-section-head h2"), "Qual operação deseja precificar?");
    setText(
      panel.querySelector(".tdg-section-head p"),
      "Cada serviço possui premissas, custos e campos próprios.",
    );
    setText(panel.querySelector(".tdg-section-head > strong"), "Escolha um tipo");
    panel.dataset.tdgRequestedProduct = "";
    return;
  }

  if (detail) {
    const target = panel.querySelector(`[data-tdg-product-id="${route.detail}"]`);
    if (
      target &&
      !target.classList.contains("active") &&
      panel.dataset.tdgRequestedProduct !== route.detail
    ) {
      panel.dataset.tdgRequestedProduct = route.detail;
      window.setTimeout(() => target.click(), 0);
    }
  }
};

const applyNavigation = () => {
  if (!window.location.pathname.startsWith("/todogreen")) return;
  const root = document.querySelector("main.tdg");
  if (!root) return;
  const route = parseTodoGreenRoute(window.location.pathname);
  markProductCards(root);
  simplifyHomeLanguage(root);
  markHomeOnlySections(root);
  ensurePageHeader(root, route);
  configurePricingPage(root, route);
};

let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyNavigation();
  });
};

const handleClick = (event) => {
  if (!window.location.pathname.startsWith("/todogreen")) return;
  const home = event.target.closest("[data-tdg-page-home]");
  if (home) {
    event.preventDefault();
    navigate("/todogreen");
    return;
  }
  const types = event.target.closest("[data-tdg-pricing-types]");
  if (types) {
    event.preventDefault();
    navigate("/todogreen/precificacao");
    return;
  }
  const product = event.target.closest(".tdg-product-card");
  if (!product || event.isTrusted === false) return;
  const root = document.querySelector("main.tdg");
  if (!root?.contains(product)) return;
  markProductCards(root);
  const productId = product.dataset.tdgProductId;
  if (!productId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigate(pricingRoute(productId));
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => {
    const target = document.getElementById("root") || document.body;
    new MutationObserver(schedule).observe(target, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule);
    document.addEventListener("click", handleClick, true);
    schedule();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
