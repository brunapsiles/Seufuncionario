import "./LogisticsVerticalCredentials.css";

const PERMISSION_LABELS = {
  "crm:view": "CRM",
  "opportunity:manage": "Oportunidades",
  "pricing:simulate": "Precificação",
  "deal:review": "Deal Desk",
  "proposal:create": "Propostas",
  "operation:manage": "Operações",
  "revenue:manage": "Receita",
  "cost:manage": "Custos",
  "commission:manage": "Metas e comissões",
  "esg:manage": "ESG",
  "report:export": "Relatórios",
  "audit:read": "Auditoria",
  "access:view": "Ver acessos",
  "access:manage": "Gerenciar funcionários",
};

const PERMISSION_GROUPS = [
  ["Comercial", ["crm:view", "opportunity:manage", "proposal:create"]],
  ["Pricing", ["pricing:simulate", "deal:review"]],
  ["Operações", ["operation:manage"]],
  ["Financeiro", ["revenue:manage", "cost:manage", "commission:manage"]],
  ["ESG", ["esg:manage", "report:export"]],
  ["Governança", ["audit:read", "access:view", "access:manage"]],
];

const tokenHeaders = () => {
  const token = localStorage.getItem("seu-funcionario-auth-token") || "";
  return token ? { authorization: `Bearer ${token}` } : {};
};

const hasAnyAccessPermission = (text) =>
  /admin|owner|access:view|access:manage|gerenciar funcionários|ver acessos/i.test(text || "");

const hideAccessNavigationWhenNotReleased = () => {
  const root = document.querySelector(".tdg");
  if (!root) return;
  const sourceText = root.textContent || "";
  if (hasAnyAccessPermission(sourceText)) return;
  document.querySelectorAll(".tdg-routine-card, .tdg-tabs button, .tdg-module-card").forEach((item) => {
    if (/\bAcessos\b/i.test(item.textContent || "")) item.remove();
  });
};

const permissionCheckboxes = () =>
  PERMISSION_GROUPS.map(
    ([group, permissions]) => `
      <fieldset class="tdg-permission-group">
        <legend>${group}</legend>
        ${permissions
          .map(
            (permission) => `
              <label class="tdg-permission-check">
                <input type="checkbox" name="permissions" value="${permission}" />
                <span>${PERMISSION_LABELS[permission]}</span>
              </label>
            `,
          )
          .join("")}
      </fieldset>
    `,
  ).join("");

const enhanceAccessPanel = () => {
  const panel = [...document.querySelectorAll(".tdg-panel")].find((item) =>
    /\bACESSOS\b|\bAcessos\b/i.test(item.textContent || ""),
  );
  if (!panel || panel.dataset.tdgAccessPolicy === "ready") return;
  panel.dataset.tdgAccessPolicy = "ready";

  const title = panel.querySelector("h2");
  const canManage = /admin|owner|access:manage|gerenciar/i.test(panel.textContent || "");
  const canView = canManage || /access:view|ver acessos|sem papel/i.test(panel.textContent || "");

  if (title) {
    title.textContent = canManage
      ? "Funcionários e permissões"
      : canView
        ? "Meu acesso"
        : "Acesso não liberado";
  }

  if (!canView && !canManage) {
    panel.innerHTML = `
      <div class="tdg-section-head">
        <div><span class="tdg-kicker">ACESSOS</span><h2>Acesso não liberado</h2></div>
        <strong>sem permissão</strong>
      </div>
      <p>Esta rotina só aparece para quem recebeu liberação específica do administrador.</p>
    `;
    return;
  }

  if (!panel.querySelector(".tdg-my-access")) {
    panel.insertAdjacentHTML(
      "afterbegin",
      `<section class="tdg-my-access">
        <span class="tdg-kicker">MEU ACESSO</span>
        <h3>Funções liberadas</h3>
        <p>As funções abaixo são controladas pelo administrador. Um funcionário pode acumular mais de uma função.</p>
        <div class="tdg-permission-tags">
          ${Object.values(PERMISSION_LABELS).map((label) => `<span>${label}</span>`).join("")}
        </div>
      </section>`,
    );
  }

  if (!canManage) return;
  const form = panel.querySelector("form.tdg-access-form");
  if (form && !form.querySelector(".tdg-permissions-box")) {
    form.insertAdjacentHTML(
      "beforeend",
      `<div class="tdg-permissions-box">
        <span class="tdg-permission-label">Funções liberadas</span>
        <div class="tdg-permission-grid">${permissionCheckboxes()}</div>
      </div>`,
    );
    form.addEventListener("submit", (event) => {
      const selected = [...form.querySelectorAll('input[name="permissions"]:checked')].map((item) => item.value);
      const hidden = form.querySelector('input[name="permissionPayload"]') || document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "permissionPayload";
      hidden.value = JSON.stringify(selected);
      if (!hidden.parentElement) form.appendChild(hidden);
    }, { capture: true });
  }
};

const installEmployeeCreationContract = () => {
  window.todoGreenEmployeeAccess = {
    permissions: PERMISSION_LABELS,
    createEndpoint: "/api/todogreen/employees",
    requiredPermission: "access:manage",
    request: async (payload) => {
      const response = await fetch("/api/todogreen/employees", {
        method: "POST",
        headers: { "content-type": "application/json", ...tokenHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Não foi possível cadastrar o funcionário.");
      return data;
    },
  };
};

const run = () => {
  hideAccessNavigationWhenNotReleased();
  enhanceAccessPanel();
  installEmployeeCreationContract();
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
