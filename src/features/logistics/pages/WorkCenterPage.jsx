import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  List,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Modal from "../../../components/Modal.jsx";
import { buildIcs } from "../../integrations/integrationsDomain.js";
import {
  buildWorkCenterCalendar,
  filterWorkCenterItems,
  summarizeWorkCenter,
} from "../todoGreenWorkCenterDomain.js";
import "../LogisticsVerticalWorkCenter.css";
import "./WorkCenterPage.css";

const STATUSES = ["novo", "em-andamento", "aguardando", "bloqueado", "concluido"];
const PRIORITIES = ["baixa", "media", "alta", "critica"];
const label = (value) => String(value || "").replace(/-/g, " ");
const currentMonth = () => new Date().toISOString().slice(0, 7);
const emptyForm = {
  boardId: "",
  type: "tarefa",
  title: "",
  description: "",
  priority: "media",
  responsible: "",
  client: "",
  dueDate: "",
};

const shiftMonth = (value, amount) => {
  const [year, month] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
};

const api = async (path, authHeaders, options = {}) => {
  const response = await fetch(`/api/todogreen/work-center${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(authHeaders?.() || {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Não foi possível atualizar a Central de Trabalho.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const downloadCalendar = (items, setToast) => {
  const events = items
    .filter((item) => item.dueDate && item.status !== "concluido")
    .map((item) => ({
      id: item.id,
      titulo: [item.title, item.client].filter(Boolean).join(" — "),
      inicio: `${item.dueDate}T09:00:00`,
      fim: `${item.dueDate}T10:00:00`,
      descricao: item.description,
    }));
  const { conteudo, incluidos } = buildIcs(events, { nome: "To Do Green — Central de Trabalho" });
  if (!incluidos) {
    setToast?.("Não há itens com prazo para exportar.");
    return;
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "agenda-todo-green.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setToast?.(`${incluidos} compromisso(s) exportado(s) para a agenda.`);
};

function WorkItem({ item, canWrite, onPatch, onArchive }) {
  const overdue = item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && item.status !== "concluido";
  return (
    <article className="tdg-work-row">
      <div>
        <span className={`tdg-work-badge ${item.priority === "critica" ? "critical" : overdue ? "warning" : ""}`}>{label(item.type)}</span>
        <strong>{item.title}</strong>
        <small>{item.client || "Sem cliente/operação"}{item.description ? ` · ${item.description}` : ""}</small>
        <em>rev. {Number(item.revision || 1)} · {item.responsible || "sem responsável"}</em>
      </div>
      <select aria-label={`Status de ${item.title}`} value={item.status} disabled={!canWrite} onChange={(event) => onPatch(item, { status: event.target.value })}>
        {STATUSES.map((status) => <option value={status} key={status}>{label(status)}</option>)}
      </select>
      <select aria-label={`Prioridade de ${item.title}`} value={item.priority} disabled={!canWrite} onChange={(event) => onPatch(item, { priority: event.target.value })}>
        {PRIORITIES.map((priority) => <option value={priority} key={priority}>{label(priority)}</option>)}
      </select>
      <input key={`${item.id}:${item.revision}:responsible`} aria-label={`Responsável por ${item.title}`} defaultValue={item.responsible || ""} disabled={!canWrite} placeholder="Responsável" onBlur={(event) => { if (event.target.value !== (item.responsible || "")) onPatch(item, { responsible: event.target.value }); }} />
      <input aria-label={`Prazo de ${item.title}`} type="date" value={item.dueDate || ""} disabled={!canWrite} onChange={(event) => onPatch(item, { dueDate: event.target.value })} />
      <button type="button" disabled={!canWrite} onClick={() => onArchive(item)} aria-label={`Arquivar ${item.title}`}><Archive size={15} /></button>
    </article>
  );
}

export default function WorkCenterPage({ authHeaders, clients = [], setToast }) {
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [view, setView] = useState("lista");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [month, setMonth] = useState(currentMonth());
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api("?limit=200", authHeaders);
      setBoards(payload.boards || []);
      setItems(payload.items || []);
      setCanWrite(Boolean(payload.access?.canWrite));
      setActiveBoardId((current) => (payload.boards || []).some((board) => board.id === current) ? current : payload.boards?.[0]?.id || "");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  const activeBoard = boards.find((board) => board.id === activeBoardId) || boards[0] || null;
  const boardItems = useMemo(() => filterWorkCenterItems(items, { boardId: activeBoardId }), [items, activeBoardId]);
  const visibleItems = useMemo(() => filterWorkCenterItems(items, { boardId: activeBoardId, search, status }), [items, activeBoardId, search, status]);
  const summary = useMemo(() => summarizeWorkCenter(boardItems), [boardItems]);
  const calendar = useMemo(() => buildWorkCenterCalendar(month, visibleItems), [month, visibleItems]);

  const patchItem = async (item, patch) => {
    const optimistic = { ...item, ...patch };
    setItems((current) => current.map((candidate) => candidate.id === item.id ? optimistic : candidate));
    try {
      const payload = await api(`/${encodeURIComponent(item.id)}`, authHeaders, {
        method: "PATCH",
        body: JSON.stringify({ ...patch, revision: item.revision }),
      });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? payload.item : candidate));
    } catch (reason) {
      if (reason.status === 409 && reason.payload?.current) {
        setItems((current) => current.map((candidate) => candidate.id === item.id ? reason.payload.current : candidate));
      } else {
        setItems((current) => current.map((candidate) => candidate.id === item.id ? item : candidate));
      }
      setToast?.(reason.message);
    }
  };

  const archiveItem = async (item) => {
    if (!window.confirm(`Arquivar “${item.title}”?`)) return;
    try {
      await api(`/${encodeURIComponent(item.id)}`, authHeaders, { method: "DELETE" });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setToast?.("Item arquivado.");
    } catch (reason) {
      setToast?.(reason.message);
    }
  };

  const createItem = async (event) => {
    event.preventDefault();
    if (!form?.title.trim()) return;
    try {
      const payload = await api("", authHeaders, { method: "POST", body: JSON.stringify(form) });
      setItems((current) => [payload.item, ...current]);
      setForm(null);
      setToast?.("Item criado na Central de Trabalho.");
    } catch (reason) {
      setToast?.(reason.message);
    }
  };

  const openForm = (date = "") => setForm({ ...emptyForm, boardId: activeBoardId, dueDate: date });

  return (
    <section className="tdg-panel tdg-work-center tdg-work-center-react">
      <header className="tdg-work-center-head">
        <div><span className="tdg-kicker">EXECUÇÃO INTEGRADA</span><h2>Central de Trabalho</h2><p>Tarefas, reuniões, aprovações, implantações e rotinas ligadas aos clientes e operações da To Do Green.</p></div>
        <div className="tdg-work-center-actions">
          <button className="tdg-login-secondary" type="button" onClick={load}><RefreshCw size={15} />Atualizar</button>
          <button className="tdg-login-secondary" type="button" onClick={() => downloadCalendar(boardItems, setToast)}><Download size={15} />Exportar agenda</button>
          {canWrite && <button className="tdg-action" type="button" onClick={() => openForm()}><Plus size={15} />Novo item</button>}
        </div>
      </header>
      {error && <div className="tdg-alert" role="alert">{error}</div>}
      <div className="tdg-work-metrics"><span><small>Itens</small><strong>{summary.total}</strong></span><span><small>Atrasados</small><strong>{summary.overdue}</strong></span><span><small>Bloqueados</small><strong>{summary.blocked}</strong></span><span><small>Aprovações</small><strong>{summary.pendingApprovals}</strong></span></div>
      <div className="tdg-work-center-layout">
        <aside className="tdg-board-sidebar">
          {boards.map((board) => <button type="button" className={board.id === activeBoardId ? "active" : ""} onClick={() => { setActiveBoardId(board.id); setSearch(""); setStatus("todos"); }} key={board.id}><strong>{board.name}</strong><small>{items.filter((item) => item.boardId === board.id && !item.archivedAt).length} item(ns)</small></button>)}
        </aside>
        <div className="tdg-board-main">
          <div className="tdg-work-view-tabs" role="tablist" aria-label="Visualização da Central">
            {[["lista", List, "Lista"], ["kanban", Columns3, "Kanban"], ["agenda", CalendarDays, "Agenda"]].map(([id, Icon, text]) => <button type="button" role="tab" aria-selected={view === id} className={view === id ? "active" : ""} onClick={() => setView(id)} key={id}><Icon size={15} />{text}</button>)}
          </div>
          <div className="tdg-board-toolbar"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título, cliente, operação ou responsável" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos os status</option>{STATUSES.map((value) => <option value={value} key={value}>{label(value)}</option>)}</select></div>
          {loading && <div className="tdg-work-empty">Carregando itens...</div>}
          {!loading && view === "lista" && <div className="tdg-work-list">{visibleItems.length ? visibleItems.map((item) => <WorkItem item={item} canWrite={canWrite} onPatch={patchItem} onArchive={archiveItem} key={item.id} />) : <div className="tdg-work-empty">Nenhum item neste filtro.</div>}</div>}
          {!loading && view === "kanban" && <div className="tdg-work-kanban">{STATUSES.map((column) => <section key={column}><header><strong>{label(column)}</strong><span>{visibleItems.filter((item) => item.status === column).length}</span></header>{visibleItems.filter((item) => item.status === column).map((item) => <article key={item.id}><span className={`tdg-work-badge ${item.priority === "critica" ? "critical" : ""}`}>{label(item.priority)}</span><strong>{item.title}</strong><small>{item.client || "Sem cliente"}</small>{item.dueDate && <time>{new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</time>}{canWrite && <select value={item.status} aria-label={`Mover ${item.title}`} onChange={(event) => patchItem(item, { status: event.target.value })}>{STATUSES.map((value) => <option value={value} key={value}>{label(value)}</option>)}</select>}</article>)}</section>)}</div>}
          {!loading && view === "agenda" && <><div className="tdg-work-calendar-head"><button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft size={16} /></button><strong>{new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight size={16} /></button></div><div className="tdg-work-calendar-week">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="tdg-work-calendar">{calendar.map((cell) => <button type="button" className={cell.currentMonth ? "" : "outside"} onClick={() => canWrite && openForm(cell.date)} key={cell.date}><b>{cell.day}</b>{cell.items.slice(0, 3).map((item) => <span className={item.status === "concluido" ? "done" : ""} key={item.id}>{item.title}</span>)}{cell.items.length > 3 && <small>+ {cell.items.length - 3}</small>}</button>)}</div></>}
        </div>
      </div>
      {form && <Modal title="Novo item da Central" onClose={() => setForm(null)}><form className="tdg-work-form" onSubmit={createItem}><label className="full"><span>Título</span><input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label><span>Quadro</span><select value={form.boardId} onChange={(event) => setForm({ ...form, boardId: event.target.value })}>{boards.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}</select></label><label><span>Tipo</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{[...new Set(["tarefa", "reuniao", "aprovacao", "implantacao", "rfq", "oportunidade", ...(activeBoard?.types || [])])].map((type) => <option value={type} key={type}>{label(type)}</option>)}</select></label><label><span>Prioridade</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((priority) => <option value={priority} key={priority}>{label(priority)}</option>)}</select></label><label><span>Prazo</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label><span>Responsável</span><input value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></label><label><span>Cliente/operação</span><input list="tdg-work-clients" value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} /><datalist id="tdg-work-clients">{clients.map((client) => <option value={client.name} key={client.id} />)}</datalist></label><label className="full"><span>Descrição e critério de conclusão</span><textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="tdg-work-center-actions full"><button className="tdg-login-secondary" type="button" onClick={() => setForm(null)}>Cancelar</button><button className="tdg-action" type="submit">Criar item</button></div></form></Modal>}
    </section>
  );
}
