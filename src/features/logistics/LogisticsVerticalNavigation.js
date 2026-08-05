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
  "escopo-3": ["Emissões da cadeia logística", "Organize as emissões relacionadas às operações do cliente. Nos relatórios, isso também aparece como Escopo 3."],
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

const directChildren = (root, selector) =>
  Array.from(root?.children || []).filter((node) => node.matches?.(selector));

const setVisible = (node, visible) => {
  if (!node) return;
  if (visible) {
    node.hidden = false;
    node.removeAttribute("aria-hidden");
    node.classList.remove("tdg-route-hidden");
  } else {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.classList.add("tdg-route-hidden");
  }
};

const setText = (node, value) => {
  if (node && node.textContent !== value) node.textContent = value;
};

const markProductCards = (root) => {
  root.querySelectorAll(".tdg-product-strip").forEach((strip) => {
    Array.from(strip.querySelectorAll(".tdg-product-card")).forEach((button, index) => {
      const productId = PRODUCT_IDS[index];
      if (productId) button.dataset.tdgProductId = productId;
    });
  });
};

const simplifyHomeLanguage = (root) => {
  const hero = root.querySelector(".tdg-hero");
  if (hero) {
    setText(hero.querySelector(".tdg-kicker"), "TO DO GREEN");
    setText(hero.querySelector("div > p"), "Escolha uma área e abra apenas o ambiente que precisa usar.");
    const status = hero.querySelector("aside span");
    if (status) {
      setText(
        status,
        status.textContent
          .replace(/funcionais/gi, "disponíveis")
          .replace(/backlog/gi, "em preparação"),
      );
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
};

const isProductCatalogPanel = (panel) => {
  if (!panel?.classList.contains("tdg-panel")) return false;
  const kicker = panel.querySelector(".tdg-kicker")?.textContent || "";
  return /PRODUTOS LOGÍSTICOS/i.test(kicker) || Boolean(panel.querySelector(".tdg-product-strip") && !panel.classList.contains("tdg-pricing"));
};

const applyPageVisibility = (root, route) => {
  root.classList.toggle("tdg-module-page", !route.isHome);

  const hero = directChildren(root, ".tdg-hero")[0];
  const tabs = directChildren(root, ".tdg-tabs")[0];
  const metrics = directChildren(root, ".tdg-metrics")[0];
  const areaSections = directChildren(root, ".tdg-section");
  const panels = directChildren(root, ".tdg-panel");

  setVisible(hero, route.isHome);
  setVisible(tabs, route.isHome);
  setVisible(metrics, route.isHome);
  areaSections.forEach((section) => setVisible(section, route.isHome));
  panels.filter(isProductCatalogPanel).forEach((panel) => setVisible(panel, route.isHome));

  panels
    .filter((panel) => !isProductCatalogPanel(panel))
    .forEach((panel) => setVisible(panel, true));
};

const ensurePageHeader = (root, route) => {
  let header = Array.from(root.children).find((node) => node.dataset?.tdgPageHeader === "true");
  const heroTitle = root.querySelector(".tdg-hero h1");

  if (route.isHome) {
    header?.remove();
    if (heroTitle) heroTitle.id = "tdg-title";
    return;
  }

  if (heroTitle) heroTitle.id = "tdg-home-title";
  if (!header) {
    header = document.createElement("section");
    header.className = "tdg-page-header";
    header.dataset.tdgPageHeader = "true";
    root.prepend(header);
  }

  const productName = PRODUCT_NAMES[route.detail];
  const isPricingSelection = route.section === "precificacao" && !productName;
  const isPricingDetail = route.section === "precificacao" && Boolean(productName);
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
        <h1 id="tdg-title">${title}</h1>
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
  const detail = route.section === "precificacao" && Boolean(productName);
  panel.classList.toggle("tdg-pricing-select", selection);
  panel.classList.toggle("tdg-pricing-detail", detail);

  const children = Array.from(panel.children);
  if (selection) {
    children.forEach((child) => {
      const keep = child.classList.contains("tdg-section-head") || child.classList.contains("tdg-product-strip");
      setVisible(child, keep);
    });
    setText(panel.querySelector(".tdg-section-head h2"), "Qual operação deseja precificar?");
    setText(panel.querySelector(".tdg-section-head p"), "Cada serviço possui premissas, custos e campos próprios.");
    setText(panel.querySelector(".tdg-section-head > strong"), "Escolha um tipo");
    panel.dataset.tdgRequestedProduct = "";
    return;
  }

  children.forEach((child) => setVisible(child, !detail || !child.classList.contains("tdg-product-strip")));

  if (detail) {
    const target = panel.querySelector(`[data-tdg-product-id="${route.detail}"]`);
    if (target && !target.classList.contains("active") && panel.dataset.tdgRequestedProduct !== route.detail) {
      panel.dataset.tdgRequestedProduct = route.detail;
      window.setTimeout(() => target.click(), 0);
    }
  }
};

const applyNavigation = () => {
  if (!window.location.pathname.startsWith("/todogreen")) return;
  const root = document.querySelector("main.tdg");
  if (!root || root.classList.contains("tdg-denied")) return;

  const route = parseTodoGreenRoute(window.location.pathname);
  markProductCards(root);
  simplifyHomeLanguage(root);
  applyPageVisibility(root, route);
  ensurePageHeader(root, route);
  configurePricingPage(root, route);
};

let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    try {
      applyNavigation();
    } catch (error) {
      console.error("Falha ao organizar a navegação To Do Green", error);
    }
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
  if (!product) {
    schedule();
    return;
  }

  const root = document.querySelector("main.tdg");
  if (!root?.contains(product)) return;
  markProductCards(root);
  const productId = product.dataset.tdgProductId;
  if (!productId) return;

  window.setTimeout(() => navigate(pricingRoute(productId)), 0);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => {
    const target = document.getElementById("root") || document.body;
    new MutationObserver(schedule).observe(target, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule);
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", schedule);
    schedule();
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
