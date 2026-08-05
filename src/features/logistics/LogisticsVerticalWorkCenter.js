import "./LogisticsVerticalWorkCenter.css";
import {
  buildWorkCenterAiRequest,
  createWorkCenterObject,
  summarizeWorkCenter,
} from "./todoGreenWorkCenterDomain.js";

const STORAGE_KEY = "todogreen-work-center-v2";
const AUTH_TOKEN_KEY = "seu-funcionario-auth-token";

const BOARD_TEMPLATES = [
  {
    id: "implantacoes",
    name: "Implantações de clientes",
    description: "Da assinatura do contrato ao início estável da operação.",
    specialist: "projects",
    types: ["implantacao", "tarefa", "aprovacao", "risco"],
  },
  {
    id: "torre-controle",
    name: "Torre de Controle",
    description: "Viagens, atrasos, SLA, ocorrências e planos de ação.",
    specialist: "operations",
    types: ["operacao", "viagem", "entrega", "nao-conformidade", "plano-de-acao"],
  },
  {
    id: "frota-sustentavel",
    name: "Frota sustentável",
    description: "Disponibilidade, manutenção, pneus, bateria, carregadores e energia.",
    specialist: "supplyChain",
    types: ["veiculo", "tarefa", "risco", "auditoria"],
  },
  {
    id: "comercial-deal-desk",
    name: "Comercial e Deal Desk",
    description: "RFQs, propostas, exceções, aprovações e contratos.",
    specialist: "commercial",
    types: ["rfq", "oportunidade", "aprovacao", "contrato", "cotacao"],
  },
  {
    id: "esg-evidencias",
    name: "ESG e Evidências",
    description: "Metas, relatórios, fatores, evidências e planos de melhoria.",
    specialist: "esg",
    types: ["indicador", "auditoria", "documento", "plano-de-acao"],
  },
  {
    id: "pessoas",
    name: "Pessoas e Escalas",
    description: "Treinamentos, certificações, férias, escalas e desenvolvimento.",
    specialist: "people",
    types: ["motorista", "tarefa", "aprovacao", "documento"],
  },
];

const statusOptions = ["novo", "em-andamento", "aguardando", "bloqueado", "concluido"];
const priorityOptions = ["baixa", "media", "alta", "critica"];

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const loadState = () => {
  const stored = safeParse(localStorage.getItem(STORAGE_KEY) || "{}", {});
  return {
    boards: Array.isArray(stored.boards) && stored.boards.length ? stored.boards : BOARD_TEMPLATES,
    items: Array.isArray(stored.items) ? stored.items : [],
  };
};

const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const label = (value) => String(value || "").replace(/-/g, " ");
const dateToday = () => new Date().toISOString().slice(0, 10);

let state = typeof window !== "undefined" ? loadState() : { boards: BOARD_TEMPLATES, items: [] };
let activeBoardId = state.boards[0]?.id || "implantacoes";
let search = "";
let statusFilter = "todos";
let showForm = false;
let aiResult = "";
let aiBusy = false;

const findMain = () => document.querySelector("main.tdg");

const ensureTab = () => {
  const nav = document.querySelector(".tdg-tabs");
  if (!nav || nav.querySelector('[data-tdg-work-center-tab="true"]')) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tdgWorkCenterTab = "true";
  button.textContent = "Central";
  button.addEventListener("click", () => {
    history.pushState({}, "", "/todogreen/central-trabalho");
    window.dispatchEvent(new PopStateEvent("popstate"));
    render();
  });
  nav.appendChild(button);
};

const currentBoard = () => state.boards.find((board) => board.id === activeBoardId) || state.boards[0];
const boardItems = () => state.items.filter((item) => item.boardId === activeBoardId && !item.archivedAt);

const filteredItems = () => boardItems().filter((item) => {
  const matchesSearch = !search || `${item.title} ${item.description} ${item.fields?.responsible || ""}`.toLowerCase().includes(search.toLowerCase());
  const matchesStatus = statusFilter === "todos" || item.status === statusFilter;
  return matchesSearch && matchesStatus;
});

const setItemPatch = (id, patch) => {
  state.items = state.items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  saveState(state);
  renderWorkCenter();
};

const removeItem = (id) => {
  state.items = state.items.map((item) => item.id === id ? { ...item, archivedAt: new Date().toISOString() } : item);
  saveState(state);
  renderWorkCenter();
};

const formHtml = () => {
  if (!showForm) return "";
  const board = currentBoard();
  const allowedTypes = board?.types || ["tarefa"];
  return `
    <form class="tdg-work-form" data-work-form>
      <label class="full"><span>Título</span><input name="title" required placeholder="Ex.: Validar janela de recarga da operação Cajamar" /></label>
      <label><span>Tipo</span><select name="type">${allowedTypes.map((type) => `<option value="${type}">${label(type)}</option>`).join("")}</select></label>
      <label><span>Prioridade</span><select name="priority">${priorityOptions.map((priority) => `<option value="${priority}">${label(priority)}</option>`).join("")}</select></label>
      <label><span>Responsável</span><input name="responsible" placeholder="Nome ou equipe" /></label>
      <label><span>Prazo</span><input name="dueDate" type="date" /></label>
      <label><span>Cliente/operação</span><input name="client" placeholder="Cliente, rota ou operação" /></label>
      <label><span>Impacto ESG</span><input name="esgImpact" placeholder="Ex.: fator de emissão pendente" /></label>
      <label class="full"><span>Descrição</span><textarea name="description" placeholder="Contexto, critérios de aceite, evidências e dependências"></textarea></label>
      <div class="tdg-work-center-actions full"><button class="tdg-action" type="submit">Criar item</button><button class="tdg-login-secondary" type="button" data-work-cancel>Cancelar</button></div>
    </form>`;
};

const rowHtml = (item) => {
  const overdue = item.fields?.dueDate && item.fields.dueDate < dateToday() && item.status !== "concluido";
  const badgeClass = item.priority === "critica" ? "critical" : overdue ? "warning" : "";
  return `
    <article class="tdg-work-row" data-item-id="${item.id}">
      <div><span class="tdg-work-badge ${badgeClass}">${label(item.type)}</span><strong>${item.title}</strong><small>${item.fields?.client || "Sem cliente/operação"}${item.description ? ` · ${item.description}` : ""}</small></div>
      <select data-work-status>${statusOptions.map((status) => `<option value="${status}" ${status === item.status ? "selected" : ""}>${label(status)}</option>`).join("")}</select>
      <select data-work-priority>${priorityOptions.map((priority) => `<option value="${priority}" ${priority === item.priority ? "selected" : ""}>${label(priority)}</option>`).join("")}</select>
      <input data-work-responsible value="${item.fields?.responsible || ""}" placeholder="Responsável" />
      <input data-work-due type="date" value="${item.fields?.dueDate || ""}" />
      <button type="button" data-work-remove aria-label="Arquivar item">×</button>
    </article>`;
};

const renderWorkCenter = () => {
  const root = document.querySelector("[data-tdg-work-center-root]");
  if (!root) return;
  const board = currentBoard();
  if (!board) return;
  const summary = summarizeWorkCenter(boardItems());
  const items = filteredItems();
  root.innerHTML = `
    <section class="tdg-panel tdg-work-center">
      <div class="tdg-work-center-head">
        <div><span class="tdg-kicker">CENTRAL DE TRABALHO</span><h2>${board.name}</h2><p>${board.description}</p></div>
        <div class="tdg-work-center-actions"><button class="tdg-action" type="button" data-work-new>+ Novo item</button><button class="tdg-login-secondary" type="button" data-work-ai>Analisar com IA</button></div>
      </div>
      <div class="tdg-work-center-layout">
        <aside class="tdg-board-sidebar">${state.boards.map((item) => `<button type="button" data-board-id="${item.id}" class="${item.id === activeBoardId ? "active" : ""}"><strong>${item.name}</strong><small>${state.items.filter((workItem) => workItem.boardId === item.id && !workItem.archivedAt).length} item(ns)</small></button>`).join("")}</aside>
        <div class="tdg-board-main">
          <div class="tdg-work-metrics"><span><small>Ativos</small><strong>${summary.total}</strong></span><span><small>Atrasados</small><strong>${summary.overdue}</strong></span><span><small>Bloqueados</small><strong>${summary.blocked}</strong></span><span><small>Aprovações</small><strong>${summary.pendingApprovals}</strong></span></div>
          <div class="tdg-board-toolbar"><input data-work-search value="${search}" placeholder="Buscar título, cliente, operação ou responsável" /><select data-work-filter><option value="todos">Todos os status</option>${statusOptions.map((status) => `<option value="${status}" ${status === statusFilter ? "selected" : ""}>${label(status)}</option>`).join("")}</select></div>
          ${formHtml()}
          <div class="tdg-work-list">${items.length ? items.map(rowHtml).join("") : `<div class="tdg-work-empty">Nenhum item neste quadro com os filtros atuais.</div>`}</div>
          <div class="tdg-ai-panel"><strong>Assistente da Central</strong><small>Usa o mesmo roteador de IA e as mesmas chaves já configuradas no Seu Funcionário.</small><textarea data-work-ai-output readonly placeholder="A análise de riscos, gargalos e próximos passos aparecerá aqui.">${aiResult}</textarea>${aiBusy ? "<small>Analisando...</small>" : ""}</div>
        </div>
      </div>
    </section>`;

  root.querySelectorAll("[data-board-id]").forEach((button) => button.addEventListener("click", () => {
    activeBoardId = button.dataset.boardId;
    search = "";
    statusFilter = "todos";
    aiResult = "";
    renderWorkCenter();
  }));
  root.querySelector("[data-work-new]")?.addEventListener("click", () => { showForm = true; renderWorkCenter(); });
  root.querySelector("[data-work-cancel]")?.addEventListener("click", () => { showForm = false; renderWorkCenter(); });
  root.querySelector("[data-work-search]")?.addEventListener("input", (event) => { search = event.target.value; renderWorkCenter(); });
  root.querySelector("[data-work-filter]")?.addEventListener("change", (event) => { statusFilter = event.target.value; renderWorkCenter(); });
  root.querySelector("[data-work-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = createWorkCenterObject({
      boardId: activeBoardId,
      type: form.get("type"),
      title: form.get("title"),
      description: form.get("description"),
      priority: form.get("priority"),
      status: "novo",
      fields: {
        responsible: form.get("responsible"),
        dueDate: form.get("dueDate"),
        client: form.get("client"),
        esgImpact: form.get("esgImpact"),
      },
    });
    state.items = [item, ...state.items];
    saveState(state);
    showForm = false;
    renderWorkCenter();
  });
  root.querySelectorAll("[data-item-id]").forEach((row) => {
    const id = row.dataset.itemId;
    row.querySelector("[data-work-status]")?.addEventListener("change", (event) => setItemPatch(id, { status: event.target.value }));
    row.querySelector("[data-work-priority]")?.addEventListener("change", (event) => setItemPatch(id, { priority: event.target.value }));
    row.querySelector("[data-work-responsible]")?.addEventListener("change", (event) => {
      const item = state.items.find((candidate) => candidate.id === id);
      setItemPatch(id, { fields: { ...(item?.fields || {}), responsible: event.target.value } });
    });
    row.querySelector("[data-work-due]")?.addEventListener("change", (event) => {
      const item = state.items.find((candidate) => candidate.id === id);
      setItemPatch(id, { fields: { ...(item?.fields || {}), dueDate: event.target.value } });
    });
    row.querySelector("[data-work-remove]")?.addEventListener("click", () => removeItem(id));
  });
  root.querySelector("[data-work-ai]")?.addEventListener("click", async () => {
    aiBusy = true;
    aiResult = "";
    renderWorkCenter();
    const request = buildWorkCenterAiRequest({
      action: "identify-bottlenecks",
      specialist: board.specialist,
      item: { board: board.name, items: boardItems().slice(0, 80), summary },
      boardContext: `${board.name} da transportadora sustentável To Do Green`,
      instruction: "Analise atrasos, bloqueios, riscos operacionais, impacto financeiro e ESG. Priorize ações com responsável e prazo sugerido.",
    });
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt: request.prompt, specialist: request.specialist }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível analisar agora.");
      aiResult = payload.content || "Análise concluída sem conteúdo.";
    } catch (error) {
      aiResult = error.message || "Não foi possível analisar agora.";
    } finally {
      aiBusy = false;
      renderWorkCenter();
    }
  });
};

const hideOtherContent = (active) => {
  const main = findMain();
  if (!main) return;
  [...main.children].forEach((child) => {
    if (child.matches(".tdg-hero,.tdg-tabs,.tdg-metrics,[data-tdg-work-center-root]")) return;
    child.style.display = active ? "none" : "";
  });
};

const render = () => {
  ensureTab();
  const active = location.pathname.startsWith("/todogreen/central-trabalho");
  document.querySelector('[data-tdg-work-center-tab="true"]')?.classList.toggle("active", active);
  let root = document.querySelector("[data-tdg-work-center-root]");
  if (!root && findMain()) {
    root = document.createElement("div");
    root.dataset.tdgWorkCenterRoot = "true";
    const metrics = document.querySelector(".tdg-metrics");
    metrics?.insertAdjacentElement("afterend", root);
  }
  if (!root) return;
  root.style.display = active ? "block" : "none";
  hideOtherContent(active);
  if (active) renderWorkCenter();
};

if (typeof window !== "undefined") {
  const start = () => {
    render();
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    ["popstate", "pageshow", "focus"].forEach((eventName) => window.addEventListener(eventName, render));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
