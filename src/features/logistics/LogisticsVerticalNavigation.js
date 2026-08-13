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
