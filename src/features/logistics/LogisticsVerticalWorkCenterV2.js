import "./LogisticsVerticalWorkCenter.css";
import {

  buildWorkCenterAiRequest,
  summarizeWorkCenter,
} from "./todoGreenWorkCenterDomain.js";

// Plural em português se escreve, não se abrevia com "(ns)". E zero merece
// palavra: "nenhum item" informa; "0 item(ns)" só mostra o código por baixo.
const contarItens = (n) =>
  n === 0 ? "nenhum item" : n === 1 ? "1 item" : `${n} itens`;


const AUTH_TOKEN_KEY = "seu-funcionario-auth-token";
const CACHE_KEY = "todogreen-work-center-api-cache-v1";
const statuses = ["novo", "em-andamento", "aguardando", "bloqueado", "concluido"];
const priorities = ["baixa", "media", "alta", "critica"];
const labels = {
  "item-created": "item criado",
  "item-updated": "item atualizado",
  "status-changed": "status alterado",
  "field-changed": "campo alterado",
  "date-overdue": "prazo vencido",
  "change-status": "alterar status",
  "change-priority": "alterar prioridade",
  "assign-person": "atribuir responsável",
  "move-item": "mover item",
  "research-client": "pesquisar e completar conta",
  "prepare-whatsapp": "preparar WhatsApp para aprovação",
};
const label = (value) => labels[value] || String(value || "").replace(/-/g, " ");
const today = () => new Date().toISOString().slice(0, 10);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
  boards: [],
  items: [],
  activeBoardId: "",
  search: "",
  status: "todos",
  view: "table",
  loading: true,
  saving: new Set(),
  error: "",
  notice: "",
  canWrite: false,
  showForm: false,
  aiBusy: false,
  aiResult: "",
  automationRules: [],
  clients: [],
  showAutomationForm: false,
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
    state.automationRules = payload.automationRules || [];
    state.clients = payload.clients || [];
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

const upsertAutomationRule = (rule) => {
  const index = state.automationRules.findIndex((current) => current.id === rule.id);
  if (index >= 0) state.automationRules[index] = rule;
  else state.automationRules.unshift(rule);
};

const createAutomationRule = async (formElement) => {
  if (!state.canWrite) return;
  const values = new FormData(formElement);
  const actionType = values.get("actionType");
  const actionValue = actionType === "change-status"
    ? values.get("statusValue")
    : actionType === "change-priority"
      ? values.get("priorityValue")
      : actionType === "move-item"
        ? values.get("targetBoardId")
        : actionType === "research-client"
          ? values.get("researchFocus")
          : actionType === "prepare-whatsapp"
            ? values.get("whatsappMessage")
            : values.get("responsibleValue");
  state.notice = "Salvando automação...";
  renderWorkCenter();
  try {
    const payload = await api("/automations", {
      method: "POST",
      body: JSON.stringify({
        name: values.get("name"),
        boardId: values.get("boardId"),
        trigger: values.get("trigger"),
        conditionField: values.get("conditionField"),
        conditionOperator: values.get("conditionOperator"),
        conditionValue: values.get("conditionValue"),
        actionType,
        actionValue,
      }),
    });
    upsertAutomationRule(payload.automationRule);
    state.showAutomationForm = false;
    state.notice = "Automação ativa. Ela será executada no servidor quando a condição acontecer.";
  } catch (error) {
    state.error = error.message;
  } finally {
    renderWorkCenter();
  }
};

const toggleAutomationRule = async (rule) => {
  if (!state.canWrite) return;
  try {
    const payload = await api(`/automations/${encodeURIComponent(rule.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !rule.enabled, revision: rule.revision }),
    });
    upsertAutomationRule(payload.automationRule);
    state.notice = payload.automationRule.enabled ? "Automação ativada." : "Automação pausada.";
  } catch (error) {
    state.error = error.message;
  } finally {
    renderWorkCenter();
  }
};

const deleteAutomationRule = async (rule) => {
  if (!state.canWrite || !confirm(`Excluir a automação “${rule.name}”?`)) return;
  try {
    await api(`/automations/${encodeURIComponent(rule.id)}`, { method: "DELETE" });
    state.automationRules = state.automationRules.filter((current) => current.id !== rule.id);
    state.notice = "Automação excluída.";
  } catch (error) {
    state.error = error.message;
  } finally {
    renderWorkCenter();
  }
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
    state.notice = payload.automationsExecuted?.length
      ? `Alteração sincronizada. ${payload.automationsExecuted.join(" ")}`
      : "Alteração sincronizada.";
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

const confirmWhatsapp = async (item) => {
  const pending = item.fields?.pendingWhatsapp;
  if (!state.canWrite || !pending || pending.status !== "pending") return;
  const confirmed = confirm(`Enviar esta mensagem para ${pending.contactName || "o contato selecionado"}?\n\n${pending.message}`);
  if (!confirmed) return;
  state.saving.add(item.id);
  state.notice = "Enviando WhatsApp confirmado...";
  renderWorkCenter();
  try {
    const payload = await api(`/${encodeURIComponent(item.id)}/whatsapp-confirm`, { method: "POST" });
    upsertItem(payload.item);
    state.notice = "WhatsApp enviado e registrado no histórico do item.";
  } catch (error) {
    state.error = error.message;
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
    const clientId = values.get("clientId") || "";
    const selectedClient = state.clients.find((client) => client.id === clientId);
    const contactId = values.get("contactId") || "";
    const selectedContact = selectedClient?.contacts?.find((contact) => contact.id === contactId);
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
        client: selectedClient?.name || values.get("client"),
        fields: {
          esgImpact: values.get("esgImpact") || "",
          clientId,
          contactId,
          contactName: selectedContact?.name || "",
        },
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
    <label><span>Conta do CRM</span><select name="clientId" data-work-client><option value="">Sem conta vinculada</option>${state.clients.map((client) => `<option value="${esc(client.id)}">${esc(client.name)}</option>`).join("")}</select></label>
    <label><span>Contato da ação</span><select name="contactId" data-work-contact disabled><option value="">Selecione primeiro a conta</option></select></label>
    <label><span>Operação / referência</span><input name="client" maxlength="200" placeholder="Usado quando não houver uma conta do CRM"></label>
    <label><span>Impacto ESG</span><input name="esgImpact" maxlength="300"></label>
    <label class="full"><span>Descrição e critério de conclusão</span><textarea name="description" maxlength="4000"></textarea></label>
    <div class="tdg-work-center-actions full"><button class="tdg-action" type="submit">Criar item</button><button class="tdg-login-secondary" type="button" data-work-cancel>Cancelar</button></div>
  </form>`;
};

const automationFormHtml = () => {
  if (!state.showAutomationForm || !state.canWrite) return "";
  return `<form class="tdg-work-form tdg-automation-form" data-automation-form>
    <label class="full"><span>Nome da automação</span><input name="name" required maxlength="160" placeholder="Ex.: Escalar item bloqueado para Operações"></label>
    <label><span>Aplicar em</span><select name="boardId"><option value="">Todos os quadros</option>${state.boards.map((board) => `<option value="${esc(board.id)}" ${board.id === state.activeBoardId ? "selected" : ""}>${esc(board.name)}</option>`).join("")}</select></label>
    <label><span>Quando</span><select name="trigger"><option value="item-created">um item for criado</option><option value="status-changed">o status mudar</option><option value="item-updated">um item for atualizado</option><option value="field-changed">um campo mudar</option><option value="date-overdue">o prazo estiver vencido</option></select></label>
    <label><span>Campo da condição</span><select name="conditionField"><option value="">Sem condição adicional</option><option value="status">Status</option><option value="priority">Prioridade</option><option value="responsible">Responsável</option><option value="client">Cliente/operação</option><option value="type">Tipo</option><option value="dueDate">Prazo</option></select></label>
    <label><span>Comparação</span><select name="conditionOperator"><option value="equals">é igual a</option><option value="not-equals">é diferente de</option><option value="contains">contém</option><option value="is-empty">está vazio</option><option value="is-not-empty">não está vazio</option></select></label>
    <label class="full"><span>Valor da condição</span><input name="conditionValue" maxlength="240" placeholder="Ex.: bloqueado, Adidas ou crítica"></label>
    <label><span>Ação</span><select name="actionType"><option value="change-status">Alterar status</option><option value="change-priority">Alterar prioridade</option><option value="assign-person">Atribuir responsável</option><option value="move-item">Mover para outro quadro</option><option value="research-client">Pesquisar e completar conta</option><option value="prepare-whatsapp">Preparar WhatsApp para aprovação</option></select></label>
    <label data-action-value="change-status"><span>Novo status</span><select name="statusValue">${statuses.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
    <label data-action-value="change-priority"><span>Nova prioridade</span><select name="priorityValue">${priorities.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
    <label data-action-value="assign-person"><span>Novo responsável</span><input name="responsibleValue" maxlength="160" placeholder="Nome ou equipe"></label>
    <label data-action-value="move-item"><span>Quadro de destino</span><select name="targetBoardId">${state.boards.map((board) => `<option value="${esc(board.id)}">${esc(board.name)}</option>`).join("")}</select></label>
    <label data-action-value="research-client"><span>O que pesquisar</span><select name="researchFocus"><option value="company">Empresa, site, segmento, ESG e notícias</option><option value="contacts">Contatos brasileiros de logística e procurement</option></select></label>
    <label class="full" data-action-value="prepare-whatsapp"><span>Mensagem para aprovação</span><textarea name="whatsappMessage" maxlength="1000" placeholder="A mensagem só será enviada depois de uma pessoa confirmar no item."></textarea></label>
    <div class="tdg-work-center-actions full"><button class="tdg-action" type="submit">Ativar automação</button><button class="tdg-login-secondary" type="button" data-automation-cancel>Cancelar</button></div>
  </form>`;
};

const automationRulesHtml = () => {
  const rules = state.automationRules.filter((rule) => !rule.boardId || rule.boardId === state.activeBoardId);
  const boardName = (id) => state.boards.find((board) => board.id === id)?.name || "Todos os quadros";
  if (!rules.length) return '<p class="tdg-work-empty">Nenhuma regra personalizada neste quadro.</p>';
  return `<div class="tdg-automation-rules">${rules.map((rule) => `<article class="${rule.enabled ? "" : "paused"}" data-rule-id="${esc(rule.id)}"><div><strong>${esc(rule.name)}</strong><small>${esc(boardName(rule.boardId))} · ${esc(label(rule.trigger))} · ${esc(label(rule.action.type))}: ${esc(rule.action.value)}</small>${rule.lastRunAt ? `<em>Última execução: ${esc(new Date(rule.lastRunAt).toLocaleString("pt-BR"))}</em>` : ""}</div><div><button type="button" data-rule-toggle>${rule.enabled ? "Pausar" : "Ativar"}</button><button type="button" data-rule-delete>Excluir</button></div></article>`).join("")}</div>`;
};

const rowHtml = (item) => {
  const overdue = item.dueDate && item.dueDate < today() && item.status !== "concluido";
  const disabled = !state.canWrite || state.saving.has(item.id) ? "disabled" : "";
  return `<article class="tdg-work-row" data-item-id="${esc(item.id)}">
    <div><span class="tdg-work-badge ${item.priority === "critica" ? "critical" : overdue ? "warning" : ""}">${esc(label(item.type))}</span><strong>${esc(item.title)}</strong><small>${esc(item.client || "Sem cliente/operação")}${item.description ? ` · ${esc(item.description)}` : ""}</small><em>rev. ${Number(item.revision || 1)} · ${esc(item.responsible || "sem responsável")}</em>${item.fields?.pendingWhatsapp?.status === "pending" ? `<button type="button" class="tdg-work-whatsapp-approval" data-whatsapp-confirm>Revisar e confirmar WhatsApp para ${esc(item.fields.pendingWhatsapp.contactName || "contato")}</button>` : item.fields?.pendingWhatsapp?.status === "sent" ? '<small class="tdg-work-whatsapp-sent">WhatsApp enviado com confirmação</small>' : ""}</div>
    <select data-field="status" ${disabled}>${statuses.map((value) => `<option value="${value}" ${value === item.status ? "selected" : ""}>${label(value)}</option>`).join("")}</select>
    <select data-field="priority" ${disabled}>${priorities.map((value) => `<option value="${value}" ${value === item.priority ? "selected" : ""}>${label(value)}</option>`).join("")}</select>
    <input data-field="responsible" value="${esc(item.responsible)}" placeholder="Responsável" ${disabled}>
    <input data-field="dueDate" type="date" value="${esc(item.dueDate)}" ${disabled}>
    <button type="button" data-work-remove ${disabled} aria-label="Arquivar item">×</button>
  </article>`;
};

const compactItemHtml = (item, mode = "card") => {
  const overdue = item.dueDate && item.dueDate < today() && item.status !== "concluido";
  const disabled = !state.canWrite || state.saving.has(item.id) ? "disabled" : "";
  return `<article class="tdg-work-${mode} ${overdue ? "overdue" : ""}" data-item-id="${esc(item.id)}">
    <div><span class="tdg-work-badge ${item.priority === "critica" ? "critical" : overdue ? "warning" : ""}">${esc(label(item.priority))}</span><strong>${esc(item.title)}</strong><small>${esc(item.client || "Sem cliente/operação")}</small></div>
    <p>${esc(item.description || "Sem descrição.")}</p>
    <footer><span>${esc(item.responsible || "Sem responsável")}</span><time>${esc(item.dueDate || "Sem prazo")}</time></footer>
    <div class="tdg-work-card-actions"><select data-field="status" aria-label="Status" ${disabled}>${statuses.map((value) => `<option value="${value}" ${value === item.status ? "selected" : ""}>${label(value)}</option>`).join("")}</select>${item.fields?.pendingWhatsapp?.status === "pending" ? '<button type="button" data-whatsapp-confirm>Confirmar WhatsApp</button>' : ""}<button type="button" data-work-remove ${disabled} aria-label="Arquivar item">×</button></div>
  </article>`;
};

const itemsViewHtml = () => {
  const items = filteredItems();
  if (!items.length) return `<div class="tdg-work-empty">${state.loading ? "Carregando itens..." : "Nenhum item neste quadro."}</div>`;
  if (state.view === "kanban") return `<div class="tdg-work-kanban">${statuses.map((status) => {
    const columnItems = items.filter((item) => item.status === status);
    return `<section><header><strong>${esc(label(status))}</strong><span>${columnItems.length}</span></header><div>${columnItems.length ? columnItems.map((item) => compactItemHtml(item)).join("") : "<small>Nenhum item</small>"}</div></section>`;
  }).join("")}</div>`;
  if (state.view === "calendar") {
    const dated = [...items].sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
    return `<div class="tdg-work-calendar">${dated.map((item) => `<section><time>${esc(item.dueDate ? new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" }) : "Sem prazo")}</time>${compactItemHtml(item, "calendar-item")}</section>`).join("")}</div>`;
  }
  if (state.view === "timeline") {
    const dated = [...items].sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
    return `<div class="tdg-work-timeline">${dated.map((item) => `<div><span></span>${compactItemHtml(item, "timeline-item")}</div>`).join("")}</div>`;
  }
  return `<div class="tdg-work-list">${items.map(rowHtml).join("")}</div>`;
};

const renderWorkCenter = () => {
  const root = document.querySelector("[data-tdg-work-center-root]");
  if (!root) return;
  const board = activeBoard();
  const summary = summarizeWorkCenter(boardItems().map((item) => ({ ...item, fields: { ...(item.fields || {}), dueDate: item.dueDate, responsible: item.responsible, client: item.client } })));
  root.innerHTML = `<section class="tdg-panel tdg-work-center">
    <div class="tdg-work-center-head"><div><span class="tdg-kicker">CENTRAL DE TRABALHO</span><h2>${esc(board?.name || "Central de Trabalho")}</h2><p>${esc(board?.description || "Quadros compartilhados da To Do Green.")}</p></div><div class="tdg-work-center-actions"><button class="tdg-login-secondary" type="button" data-work-sync>${state.loading ? "Sincronizando..." : "Atualizar"}</button>${state.canWrite ? '<button class="tdg-action" type="button" data-work-new>+ Novo item</button>' : ""}<button class="tdg-login-secondary" type="button" data-work-ai>Analisar com IA</button></div></div>
    ${(state.error || state.notice) ? `<div class="tdg-alert"><span>${esc(state.error || state.notice)}</span></div>` : ""}
    <div class="tdg-work-center-layout"><aside class="tdg-board-sidebar">${state.boards.map((item) => `<button type="button" data-board-id="${esc(item.id)}" class="${item.id === state.activeBoardId ? "active" : ""}"><strong>${esc(item.name)}</strong><small>${contarItens(state.items.filter((work) => work.boardId === item.id && !work.archivedAt).length)}</small></button>`).join("")}</aside>
    <div class="tdg-board-main"><div class="tdg-work-metrics"><span><small>Ativos</small><strong>${summary.total}</strong></span><span><small>Atrasados</small><strong>${summary.overdue}</strong></span><span><small>Bloqueados</small><strong>${summary.blocked}</strong></span><span><small>Aprovações</small><strong>${summary.pendingApprovals}</strong></span></div>
    <div class="tdg-board-toolbar"><input data-work-search value="${esc(state.search)}" placeholder="Buscar título, cliente, operação ou responsável"><select data-work-filter><option value="todos">Todos os status</option>${statuses.map((value) => `<option value="${value}" ${value === state.status ? "selected" : ""}>${label(value)}</option>`).join("")}</select></div>
    <div class="tdg-work-view-switch" aria-label="Visualização do quadro">${[["table", "Tabela"], ["kanban", "Kanban"], ["calendar", "Calendário"], ["timeline", "Cronograma"]].map(([id, text]) => `<button type="button" data-work-view="${id}" class="${state.view === id ? "active" : ""}">${text}</button>`).join("")}</div>
    <section class="tdg-work-automation"><div><strong>Automações</strong><span>As regras são executadas no servidor e registradas no histórico do item.</span></div>${state.canWrite ? '<button class="tdg-login-secondary" type="button" data-automation-new>+ Criar regra</button>' : ""}</section>
    ${automationFormHtml()}${automationRulesHtml()}
    ${formHtml()}${itemsViewHtml()}
    <div class="tdg-ai-panel"><strong>Assistente da Central</strong><small>Analisa somente os registros carregados e usa a camada de IA da To Do Green.</small><textarea readonly placeholder="A análise aparecerá aqui.">${esc(state.aiResult)}</textarea>${state.aiBusy ? "<small>Analisando...</small>" : ""}</div></div></div></section>`;

  root.querySelector("[data-work-sync]")?.addEventListener("click", sync);
  root.querySelector("[data-work-new]")?.addEventListener("click", () => { state.showForm = true; renderWorkCenter(); });
  root.querySelector("[data-work-cancel]")?.addEventListener("click", () => { state.showForm = false; renderWorkCenter(); });
  root.querySelector("[data-work-form]")?.addEventListener("submit", (event) => { event.preventDefault(); createItem(event.currentTarget); });
  const itemForm = root.querySelector("[data-work-form]");
  const syncClientContacts = () => {
    if (!itemForm) return;
    const client = state.clients.find((candidate) => candidate.id === itemForm.elements.clientId?.value);
    const select = itemForm.elements.contactId;
    if (!select) return;
    const contacts = client?.contacts || [];
    select.innerHTML = `<option value="">${contacts.length ? "Selecione o contato" : "Nenhum contato com cadastro"}</option>${contacts.map((contact) => `<option value="${esc(contact.id)}">${esc(contact.name)}${contact.phone ? " · WhatsApp disponível" : " · sem telefone"}</option>`).join("")}`;
    select.disabled = !contacts.length;
  };
  itemForm?.elements.clientId?.addEventListener("change", syncClientContacts);
  syncClientContacts();
  root.querySelector("[data-automation-new]")?.addEventListener("click", () => { state.showAutomationForm = true; renderWorkCenter(); });
  root.querySelector("[data-automation-cancel]")?.addEventListener("click", () => { state.showAutomationForm = false; renderWorkCenter(); });
  root.querySelector("[data-automation-form]")?.addEventListener("submit", (event) => { event.preventDefault(); createAutomationRule(event.currentTarget); });
  const automationForm = root.querySelector("[data-automation-form]");
  const syncAutomationFields = () => {
    if (!automationForm) return;
    const selected = automationForm.elements.actionType?.value;
    automationForm.querySelectorAll("[data-action-value]").forEach((field) => {
      const active = field.dataset.actionValue === selected;
      field.hidden = !active;
      field.querySelectorAll("input,select").forEach((control) => { control.disabled = !active; });
    });
  };
  automationForm?.elements.actionType?.addEventListener("change", syncAutomationFields);
  syncAutomationFields();
  root.querySelectorAll("[data-rule-id]").forEach((row) => {
    const rule = state.automationRules.find((candidate) => candidate.id === row.dataset.ruleId);
    if (!rule) return;
    row.querySelector("[data-rule-toggle]")?.addEventListener("click", () => toggleAutomationRule(rule));
    row.querySelector("[data-rule-delete]")?.addEventListener("click", () => deleteAutomationRule(rule));
  });
  root.querySelectorAll("[data-board-id]").forEach((button) => button.addEventListener("click", () => { state.activeBoardId = button.dataset.boardId; state.search = ""; state.status = "todos"; state.aiResult = ""; renderWorkCenter(); }));
  root.querySelector("[data-work-search]")?.addEventListener("input", (event) => { state.search = event.target.value; renderWorkCenter(); });
  root.querySelector("[data-work-filter]")?.addEventListener("change", (event) => { state.status = event.target.value; renderWorkCenter(); });
  root.querySelectorAll("[data-work-view]").forEach((button) => button.addEventListener("click", () => { state.view = button.dataset.workView; renderWorkCenter(); }));
  root.querySelectorAll("[data-item-id]").forEach((row) => {
    const item = state.items.find((candidate) => candidate.id === row.dataset.itemId);
    if (!item) return;
    row.querySelectorAll("[data-field]").forEach((field) => field.addEventListener("change", (event) => patchItem(item, { [event.target.dataset.field]: event.target.value })));
    row.querySelector("[data-work-remove]")?.addEventListener("click", () => archiveItem(item));
    row.querySelector("[data-whatsapp-confirm]")?.addEventListener("click", () => confirmWhatsapp(item));
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
  const nav = document.querySelector("[data-tdg-management-tools]");
  if (!nav || nav.querySelector("[data-tdg-work-center-tab]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tdgWorkCenterTab = "true";
  button.textContent = "Gestão de Projetos";
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
  const pageContent = main.querySelector("[data-tdg-page-content]");
  if (pageContent) pageContent.style.display = active ? "none" : "";
  // Simétrico ao que a Frota já faz: se os dois painéis chegarem a existir ao
  // mesmo tempo, cada um esconde o do outro ao assumir a tela — nenhum fica
  // visível por baixo do que a pessoa está de fato vendo.
  const fleetRoot = main.querySelector("[data-tdg-fleet-root]");
  if (active && fleetRoot) fleetRoot.style.display = "none";
  root.style.display = active ? "block" : "none";
  document.querySelector("[data-tdg-work-center-tab]")?.classList.toggle("active", active);
  if (active) { renderWorkCenter(); if (!state.boards.length && !state.loading) sync(); }
};

// Ver o comentário equivalente em LogisticsVerticalFleet.js: esperar só por
// `main.tdg` não bastava, porque `[data-tdg-page-content]` — o que `render()`
// de fato precisa achar pra esconder o conteúdo do dashboard — pode chegar num
// commit do React posterior. Espera o elemento certo, com um observer de um
// disparo só.
const waitForShell = () => {
  if (document.querySelector("[data-tdg-page-content]")) { render(); return; }
  const alvo = document.getElementById("root") || document.body;
  const observer = new MutationObserver(() => {
    if (!document.querySelector("[data-tdg-page-content]")) return;
    observer.disconnect();
    render();
  });
  observer.observe(alvo, { childList: true, subtree: true });
};

if (typeof window !== "undefined") {
  loadCache();
  state.loading = false;
  const start = () => {
    waitForShell();
  };
  window.addEventListener("popstate", render);
  window.addEventListener("pageshow", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
}
