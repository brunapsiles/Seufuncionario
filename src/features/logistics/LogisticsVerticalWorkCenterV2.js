import "./LogisticsVerticalWorkCenter.css";
import {
  buildWorkCenterAiRequest,
  summarizeWorkCenter,
} from "./todoGreenWorkCenterDomain.js";

const AUTH_TOKEN_KEY = "seu-funcionario-auth-token";
const CACHE_KEY = "todogreen-work-center-api-cache-v1";
const statuses = ["novo", "em-andamento", "aguardando", "bloqueado", "concluido"];
const priorities = ["baixa", "media", "alta", "critica"];
const label = (value) => String(value || "").replace(/-/g, " ");
const today = () => new Date().toISOString().slice(0, 10);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
  boards: [],
  items: [],
  activeBoardId: "",
  search: "",
  status: "todos",
  loading: true,
  saving: new Set(),
  error: "",
  notice: "",
  canWrite: false,
  showForm: false,
  aiBusy: false,
  aiResult: "",
};

const authHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  return token ? { authorization: `Bearer ${token}` } : {};
};

const api = async (path = "", options = {}) => {
  const response = await fetch(`/api/todogreen/work-center${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Não foi possível sincronizar a Central de Trabalho.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const saveCache = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ boards: state.boards, items: state.items, savedAt: new Date().toISOString() }));
  } catch {}
};
const loadCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    if (Array.isArray(cached.boards)) state.boards = cached.boards;
    if (Array.isArray(cached.items)) state.items = cached.items;
    if (!state.activeBoardId) state.activeBoardId = state.boards[0]?.id || "";
  } catch {}
};

const activeBoard = () => state.boards.find((board) => board.id === state.activeBoardId) || state.boards[0];
const boardItems = () => state.items.filter((item) => item.boardId === state.activeBoardId && !item.archivedAt);
const filteredItems = () => boardItems().filter((item) => {
  const source = `${item.title} ${item.description} ${item.responsible} ${item.client}`.toLowerCase();
  return (!state.search || source.includes(state.search.toLowerCase())) && (state.status === "todos" || item.status === state.status);
});

const sync = async () => {
  state.loading = true;
  state.error = "";
  renderWorkCenter();
  try {
    const payload = await api("?limit=200");
    state.boards = payload.boards || [];
    state.items = payload.items || [];
    state.canWrite = !!payload.access?.canWrite;
    if (!state.boards.some((board) => board.id === state.activeBoardId)) state.activeBoardId = state.boards[0]?.id || "";
    saveCache();
  } catch (error) {
    state.error = error.message;
    loadCache();
    if (state.boards.length) state.notice = "Exibindo a última cópia disponível neste aparelho.";
  } finally {
    state.loading = false;
    renderWorkCenter();
  }
};

const upsertItem = (item) => {
  const index = state.items.findIndex((current) => current.id === item.id);
  if (index >= 0) state.items[index] = item;
  else state.items.unshift(item);
  saveCache();
};

const patchItem = async (item, patch) => {
  if (!state.canWrite || state.saving.has(item.id)) return;
  state.saving.add(item.id);
  state.notice = "Salvando alteração...";
  renderWorkCenter();
  try {
    const payload = await api(`/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...patch, revision: item.revision }),
    });
    upsertItem(payload.item);
    state.notice = "Alteração sincronizada.";
  } catch (error) {
    if (error.status === 409 && error.payload?.current) {
      upsertItem(error.payload.current);
      state.notice = "Outra pessoa alterou este item. A versão mais recente foi carregada.";
    } else state.error = error.message;
  } finally {
    state.saving.delete(item.id);
    renderWorkCenter();
  }
};

const archiveItem = async (item) => {
  if (!state.canWrite || !confirm(`Arquivar “${item.title}”?`)) return;
  state.saving.add(item.id);
  renderWorkCenter();
  try {
    await api(`/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    state.items = state.items.filter((current) => current.id !== item.id);
    state.notice = "Item arquivado.";
    saveCache();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.saving.delete(item.id);
    renderWorkCenter();
  }
};

const createItem = async (formElement) => {
  if (!state.canWrite) return;
  const values = new FormData(formElement);
  const board = activeBoard();
  state.notice = "Criando item...";
  renderWorkCenter();
  try {
    const payload = await api("", {
      method: "POST",
      body: JSON.stringify({
        boardId: board.id,
        type: values.get("type"),
        title: values.get("title"),
        description: values.get("description"),
        priority: values.get("priority"),
        status: "novo",
        responsible: values.get("responsible"),
        dueDate: values.get("dueDate"),
        client: values.get("client"),
        fields: { esgImpact: values.get("esgImpact") || "" },
      }),
    });
    upsertItem(payload.item);
    state.showForm = false;
    state.notice = "Item criado e compartilhado com a equipe.";
  } catch (error) {
    state.error = error.message;
  } finally {
    renderWorkCenter();
  }
};

const formHtml = () => {
  if (!state.showForm || !state.canWrite) return "";
  const board = activeBoard();
  return `<form class="tdg-work-form" data-work-form>
    <label class="full"><span>Título</span><input name="title" required maxlength="240" placeholder="Ex.: Validar janela de recarga da operação Cajamar"></label>
    <label><span>Tipo</span><select name="type">${(board?.types || ["tarefa"]).map((type) => `<option value="${esc(type)}">${esc(label(type))}</option>`).join("")}</select></label>
    <label><span>Prioridade</span><select name="priority">${priorities.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
    <label><span>Responsável</span><input name="responsible" maxlength="160" placeholder="Nome ou equipe"></label>
    <label><span>Prazo</span><input name="dueDate" type="date"></label>
    <label><span>Cliente/operação</span><input name="client" maxlength="200"></label>
    <label><span>Impacto ESG</span><input name="esgImpact" maxlength="300"></label>
    <label class="full"><span>Descrição e critério de conclusão</span><textarea name="description" maxlength="4000"></textarea></label>
    <div class="tdg-work-center-actions full"><button class="tdg-action" type="submit">Criar item</button><button class="tdg-login-secondary" type="button" data-work-cancel>Cancelar</button></div>
  </form>`;
};

const rowHtml = (item) => {
  const overdue = item.dueDate && item.dueDate < today() && item.status !== "concluido";
  const disabled = !state.canWrite || state.saving.has(item.id) ? "disabled" : "";
  return `<article class="tdg-work-row" data-item-id="${esc(item.id)}">
    <div><span class="tdg-work-badge ${item.priority === "critica" ? "critical" : overdue ? "warning" : ""}">${esc(label(item.type))}</span><strong>${esc(item.title)}</strong><small>${esc(item.client || "Sem cliente/operação")}${item.description ? ` · ${esc(item.description)}` : ""}</small><em>rev. ${Number(item.revision || 1)} · ${esc(item.responsible || "sem responsável")}</em></div>
    <select data-field="status" ${disabled}>${statuses.map((value) => `<option value="${value}" ${value === item.status ? "selected" : ""}>${label(value)}</option>`).join("")}</select>
    <select data-field="priority" ${disabled}>${priorities.map((value) => `<option value="${value}" ${value === item.priority ? "selected" : ""}>${label(value)}</option>`).join("")}</select>
    <input data-field="responsible" value="${esc(item.responsible)}" placeholder="Responsável" ${disabled}>
    <input data-field="dueDate" type="date" value="${esc(item.dueDate)}" ${disabled}>
    <button type="button" data-work-remove ${disabled} aria-label="Arquivar item">×</button>
  </article>`;
};

const renderWorkCenter = () => {
  const root = document.querySelector("[data-tdg-work-center-root]");
  if (!root) return;
  const board = activeBoard();
  const summary = summarizeWorkCenter(boardItems().map((item) => ({ ...item, fields: { ...(item.fields || {}), dueDate: item.dueDate, responsible: item.responsible, client: item.client } })));
  root.innerHTML = `<section class="tdg-panel tdg-work-center">
    <div class="tdg-work-center-head"><div><span class="tdg-kicker">CENTRAL DE TRABALHO</span><h2>${esc(board?.name || "Central de Trabalho")}</h2><p>${esc(board?.description || "Quadros compartilhados da To Do Green.")}</p></div><div class="tdg-work-center-actions"><button class="tdg-login-secondary" type="button" data-work-sync>${state.loading ? "Sincronizando..." : "Atualizar"}</button>${state.canWrite ? '<button class="tdg-action" type="button" data-work-new>+ Novo item</button>' : ""}<button class="tdg-login-secondary" type="button" data-work-ai>Analisar com IA</button></div></div>
    ${(state.error || state.notice) ? `<div class="tdg-alert"><span>${esc(state.error || state.notice)}</span></div>` : ""}
    <div class="tdg-work-center-layout"><aside class="tdg-board-sidebar">${state.boards.map((item) => `<button type="button" data-board-id="${esc(item.id)}" class="${item.id === state.activeBoardId ? "active" : ""}"><strong>${esc(item.name)}</strong><small>${state.items.filter((work) => work.boardId === item.id && !work.archivedAt).length} item(ns)</small></button>`).join("")}</aside>
    <div class="tdg-board-main"><div class="tdg-work-metrics"><span><small>Ativos</small><strong>${summary.total}</strong></span><span><small>Atrasados</small><strong>${summary.overdue}</strong></span><span><small>Bloqueados</small><strong>${summary.blocked}</strong></span><span><small>Aprovações</small><strong>${summary.pendingApprovals}</strong></span></div>
    <div class="tdg-board-toolbar"><input data-work-search value="${esc(state.search)}" placeholder="Buscar título, cliente, operação ou responsável"><select data-work-filter><option value="todos">Todos os status</option>${statuses.map((value) => `<option value="${value}" ${value === state.status ? "selected" : ""}>${label(value)}</option>`).join("")}</select></div>
    ${formHtml()}<div class="tdg-work-list">${filteredItems().length ? filteredItems().map(rowHtml).join("") : `<div class="tdg-work-empty">${state.loading ? "Carregando itens..." : "Nenhum item neste quadro."}</div>`}</div>
    <div class="tdg-ai-panel"><strong>Assistente da Central</strong><small>Analisa somente os registros carregados e usa o roteador de IA do Seu Funcionário.</small><textarea readonly placeholder="A análise aparecerá aqui.">${esc(state.aiResult)}</textarea>${state.aiBusy ? "<small>Analisando...</small>" : ""}</div></div></div></section>`;

  root.querySelector("[data-work-sync]")?.addEventListener("click", sync);
  root.querySelector("[data-work-new]")?.addEventListener("click", () => { state.showForm = true; renderWorkCenter(); });
  root.querySelector("[data-work-cancel]")?.addEventListener("click", () => { state.showForm = false; renderWorkCenter(); });
  root.querySelector("[data-work-form]")?.addEventListener("submit", (event) => { event.preventDefault(); createItem(event.currentTarget); });
  root.querySelectorAll("[data-board-id]").forEach((button) => button.addEventListener("click", () => { state.activeBoardId = button.dataset.boardId; state.search = ""; state.status = "todos"; state.aiResult = ""; renderWorkCenter(); }));
  root.querySelector("[data-work-search]")?.addEventListener("input", (event) => { state.search = event.target.value; renderWorkCenter(); });
  root.querySelector("[data-work-filter]")?.addEventListener("change", (event) => { state.status = event.target.value; renderWorkCenter(); });
  root.querySelectorAll("[data-item-id]").forEach((row) => {
    const item = state.items.find((candidate) => candidate.id === row.dataset.itemId);
    if (!item) return;
    row.querySelectorAll("[data-field]").forEach((field) => field.addEventListener("change", (event) => patchItem(item, { [event.target.dataset.field]: event.target.value })));
    row.querySelector("[data-work-remove]")?.addEventListener("click", () => archiveItem(item));
  });
  root.querySelector("[data-work-ai]")?.addEventListener("click", async () => {
    if (!board || state.aiBusy) return;
    state.aiBusy = true; state.aiResult = ""; renderWorkCenter();
    const request = buildWorkCenterAiRequest({ action: "identify-bottlenecks", specialist: board.specialist, item: { board: board.name, items: boardItems().slice(0, 100), summary }, boardContext: `${board.name} da transportadora sustentável To Do Green`, instruction: "Identifique atrasos, riscos, responsáveis ausentes e próximos passos. Não invente números." });
    try {
      const response = await fetch(request.endpoint, { method: "POST", headers: { "content-type": "application/json", ...authHeaders() }, body: JSON.stringify({ prompt: request.prompt, specialist: request.specialist }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível analisar agora.");
      state.aiResult = payload.content || "Análise concluída sem conteúdo.";
    } catch (error) { state.aiResult = error.message; }
    finally { state.aiBusy = false; renderWorkCenter(); }
  });
};

const ensureTab = () => {
  const nav = document.querySelector(".tdg-tabs");
  if (!nav || nav.querySelector("[data-tdg-work-center-tab]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tdgWorkCenterTab = "true";
  button.textContent = "Central";
  button.addEventListener("click", () => { history.pushState({}, "", "/todogreen/central-trabalho"); window.dispatchEvent(new PopStateEvent("popstate")); render(); });
  nav.appendChild(button);
};

const render = () => {
  if (!location.pathname.startsWith("/todogreen")) return;
  ensureTab();
  const active = location.pathname.includes("/central-trabalho");
  const main = document.querySelector("main.tdg");
  if (!main) return;
  let root = main.querySelector("[data-tdg-work-center-root]");
  if (!root) { root = document.createElement("div"); root.dataset.tdgWorkCenterRoot = "true"; main.appendChild(root); }
  [...main.children].forEach((child) => { if (child.matches(".tdg-hero,.tdg-tabs,.tdg-metrics,[data-tdg-work-center-root]")) return; child.style.display = active ? "none" : ""; });
  root.style.display = active ? "block" : "none";
  document.querySelector("[data-tdg-work-center-tab]")?.classList.toggle("active", active);
  if (active) { renderWorkCenter(); if (!state.boards.length && !state.loading) sync(); }
};

if (typeof window !== "undefined") {
  loadCache();
  state.loading = false;
  const start = () => { render(); sync(); const observer = new MutationObserver(render); observer.observe(document.body, { childList: true, subtree: true }); };
  window.addEventListener("popstate", render);
  window.addEventListener("pageshow", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
}
