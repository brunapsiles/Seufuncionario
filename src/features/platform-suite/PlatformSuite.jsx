import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Gauge,
  Headphones,
  LoaderCircle,
  Mail,
  PackageSearch,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  ScreenShare,
  Square,
  TicketCheck,
  Users,
} from "lucide-react";
import {
  consentedAudience,
  inventoryHealth,
  sprintMetrics,
  ticketSla,
} from "./platformSuiteDomain.js";
import "./platformSuite.css";

const TABS = [
  { id: "agenda", label: "Agenda pública", icon: CalendarCheck2 },
  { id: "atendimento", label: "Atendimento", icon: Headphones },
  { id: "sprints", label: "Sprints", icon: ClipboardList },
  { id: "gravacao", label: "Gravação", icon: ScreenShare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "campanhas", label: "Campanhas", icon: Mail },
  { id: "estoque", label: "Estoque", icon: PackageSearch },
];

const api = async (path, authHeaders, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
};

const ownerQuery = (ownerId) =>
  ownerId ? `?owner=${encodeURIComponent(ownerId)}` : "";

const download = (content, filename, type = "text/plain;charset=utf-8") => {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const localDate = (value) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value))
    : "—";

function Empty({ icon: Icon, title, children }) {
  return (
    <div className="ps-empty">
      <Icon />
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className={`ps-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SchedulePanel({ authHeaders, ownerId, business, setToast }) {
  const [pages, setPages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(true);
  const [form, setForm] = useState({
    name: "Conversa de 30 minutos",
    durationMinutes: 30,
    startTime: "09:00",
    endTime: "18:00",
    location: "Online",
  });
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const suffix = ownerQuery(ownerId);
      const [pageData, bookingData] = await Promise.all([
        api(`/api/platform/booking-pages${suffix}`, authHeaders),
        api(`/api/platform/bookings${suffix}`, authHeaders),
      ]);
      setPages(pageData.pages || []);
      setBookings(bookingData.bookings || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }, [authHeaders, ownerId, setToast]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async (event) => {
    event.preventDefault();
    try {
      await api("/api/platform/booking-pages", authHeaders, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          ownerId,
          businessId: business?.id || null,
          timezone: "America/Sao_Paulo",
          weekdays: [1, 2, 3, 4, 5],
        }),
      });
      setToast("Agenda pública criada");
      load();
    } catch (error) {
      setToast(error.message);
    }
  };

  const copyLink = async (slug) => {
    const link = `${window.location.origin}/agenda/${slug}`;
    await navigator.clipboard?.writeText(link);
    setToast("Link da agenda copiado");
  };

  const setStatus = async (id, status) => {
    try {
      await api(`/api/platform/bookings/${id}`, authHeaders, {
        method: "PATCH",
        body: JSON.stringify({ ownerId, status }),
      });
      load();
    } catch (error) {
      setToast(error.message);
    }
  };

  return (
    <div className="ps-grid">
      <section className="ps-card">
        <span className="ps-kicker">Calendly sem mensalidade</span>
        <h2>Crie um link de agendamento</h2>
        <form onSubmit={create}>
          <label>
            Nome da agenda
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <div className="ps-form-row">
            <label>
              Duração
              <select value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}>
                <option value="15">15 min</option><option value="30">30 min</option>
                <option value="45">45 min</option><option value="60">60 min</option>
              </select>
            </label>
            <label>
              Local
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
          </div>
          <div className="ps-form-row">
            <label>Das<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label>Até<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          </div>
          <button className="ps-primary" type="submit"><Plus /> Criar agenda</button>
        </form>
        <p className="ps-note">Plano B: se a agenda externa falhar, este link continua funcionando no próprio Seu Funcionário.</p>
      </section>
      <section className="ps-card">
        <div className="ps-card-head"><div><span className="ps-kicker">Links ativos</span><h2>Suas agendas</h2></div><button className="ps-icon" onClick={load} aria-label="Atualizar"><RefreshCw /></button></div>
        {busy ? <LoaderCircle className="spin" /> : pages.length ? (
          <div className="ps-list">
            {pages.map((page) => (
              <article className="ps-row" key={page.id}>
                <div><strong>{page.name}</strong><span>{page.durationMinutes} min · {page.startTime}–{page.endTime}</span></div>
                <button onClick={() => copyLink(page.slug)}><Copy /> Copiar link</button>
              </article>
            ))}
          </div>
        ) : <Empty icon={CalendarCheck2} title="Nenhuma agenda">Crie a primeira e compartilhe o link.</Empty>}
      </section>
      <section className="ps-card ps-wide">
        <span className="ps-kicker">Reservas recebidas</span>
        <h2>Próximos atendimentos</h2>
        {bookings.length ? (
          <div className="ps-table-wrap"><table><thead><tr><th>Cliente</th><th>Quando</th><th>Protocolo</th><th>Status</th></tr></thead>
            <tbody>{bookings.map((booking) => <tr key={booking.id}><td><strong>{booking.customerName}</strong><small>{booking.customerEmail}</small></td><td>{localDate(booking.startAt)}</td><td>{booking.protocol}</td><td><select value={booking.status} onChange={(event) => setStatus(booking.id, event.target.value)}><option>confirmado</option><option>concluído</option><option>cancelado</option><option>não compareceu</option></select></td></tr>)}</tbody>
          </table></div>
        ) : <Empty icon={CalendarCheck2} title="Ainda sem reservas">Elas aparecerão aqui quando alguém usar seu link.</Empty>}
      </section>
    </div>
  );
}

function SupportPanel({ authHeaders, ownerId, business, setToast }) {
  const [portals, setPortals] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ name: "Atendimento ao cliente", welcomeText: "Conte o que aconteceu. Vamos ajudar.", slaHours: 24 });
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const suffix = ownerQuery(ownerId);
      const [portalData, ticketData] = await Promise.all([
        api(`/api/platform/support-portals${suffix}`, authHeaders),
        api(`/api/platform/tickets${suffix}`, authHeaders),
      ]);
      setPortals(portalData.portals || []);
      setTickets(ticketData.tickets || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }, [authHeaders, ownerId, setToast]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async (event) => {
    event.preventDefault();
    try {
      await api("/api/platform/support-portals", authHeaders, {
        method: "POST",
        body: JSON.stringify({ ...form, ownerId, businessId: business?.id || null }),
      });
      setToast("Central pública criada");
      load();
    } catch (error) { setToast(error.message); }
  };
  const copyLink = async (slug) => {
    await navigator.clipboard?.writeText(`${window.location.origin}/atendimento/${slug}`);
    setToast("Link de atendimento copiado");
  };
  const updateTicket = async (ticket, status) => {
    try {
      await api(`/api/platform/tickets/${ticket.id}`, authHeaders, {
        method: "PATCH",
        body: JSON.stringify({ ownerId, status, resolution: ticket.resolution || "" }),
      });
      load();
    } catch (error) { setToast(error.message); }
  };
  const slaCounts = tickets.reduce((result, ticket) => {
    const state = ticketSla(ticket).state;
    result[state] = (result[state] || 0) + 1;
    return result;
  }, {});

  return (
    <div className="ps-grid">
      <section className="ps-card">
        <span className="ps-kicker">Zendesk gratuito próprio</span><h2>Abra sua central</h2>
        <form onSubmit={create}>
          <label>Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Mensagem de boas-vindas<textarea value={form.welcomeText} onChange={(event) => setForm({ ...form, welcomeText: event.target.value })} /></label>
          <label>SLA inicial em horas<input type="number" min="1" max="720" value={form.slaHours} onChange={(event) => setForm({ ...form, slaHours: Number(event.target.value) })} /></label>
          <button className="ps-primary"><Plus /> Criar central</button>
        </form>
      </section>
      <section className="ps-card">
        <span className="ps-kicker">Saúde do atendimento</span><h2>Controle por SLA</h2>
        <div className="ps-stats">
          <Stat label="Novos" value={tickets.filter((ticket) => ticket.status === "Novo").length} />
          <Stat label="Em risco" value={slaCounts.em_risco || 0} tone="warn" />
          <Stat label="Atrasados" value={slaCounts.atrasado || 0} tone="danger" />
        </div>
        <div className="ps-list">
          {portals.map((portal) => <article className="ps-row" key={portal.id}><div><strong>{portal.name}</strong><span>SLA: {portal.slaHours}h</span></div><button onClick={() => copyLink(portal.slug)}><Copy /> Copiar link</button></article>)}
        </div>
      </section>
      <section className="ps-card ps-wide">
        <div className="ps-card-head"><div><span className="ps-kicker">Fila unificada</span><h2>Chamados</h2></div><button className="ps-icon" onClick={load} aria-label="Atualizar"><RefreshCw /></button></div>
        {busy ? <LoaderCircle className="spin" /> : tickets.length ? <div className="ps-table-wrap"><table><thead><tr><th>Protocolo</th><th>Solicitação</th><th>Prioridade</th><th>SLA</th><th>Status</th></tr></thead><tbody>
          {tickets.map((ticket) => {
            const sla = ticketSla(ticket);
            return <tr key={ticket.id}><td>{ticket.protocol}</td><td><strong>{ticket.subject}</strong><small>{ticket.customerName} · {ticket.category}</small></td><td>{ticket.priority}</td><td><span className={`ps-pill ${sla.state}`}>{sla.state.replaceAll("_", " ")}</span></td><td><select value={ticket.status} onChange={(event) => updateTicket(ticket, event.target.value)}><option>Novo</option><option>Em atendimento</option><option>Aguardando cliente</option><option>Resolvido</option><option>Fechado</option></select></td></tr>;
          })}
        </tbody></table></div> : <Empty icon={TicketCheck} title="Fila vazia">Os chamados do link público aparecerão aqui.</Empty>}
      </section>
    </div>
  );
}

function SprintPanel({ db, update, business, setToast }) {
  const tasks = useMemo(
    () => (db.tasks || []).filter((task) => !business || task.businessId === business.id),
    [db.tasks, business],
  );
  const existing = [...new Set(tasks.map((task) => task.sprint).filter(Boolean))];
  const [sprint, setSprint] = useState(existing[0] || "Sprint atual");
  const metrics = sprintMetrics(tasks, sprint);
  const backlog = tasks.filter((task) => !task.sprint);
  const changeTask = (task, patch) => {
    update((current) => ({
      ...current,
      tasks: (current.tasks || []).map((item) =>
        item.id === task.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      ),
    }));
  };
  const assign = (task) => {
    changeTask(task, { sprint, storyPoints: Number(task.storyPoints) || 1, issueType: task.issueType || "Tarefa" });
    setToast("Tarefa adicionada ao sprint");
  };
  return (
    <div className="ps-stack">
      <section className="ps-card ps-sprint-head">
        <div><span className="ps-kicker">Jira + Asana, usando suas tarefas</span><h2>Planejamento ágil</h2></div>
        <label>Nome do sprint<input value={sprint} onChange={(event) => setSprint(event.target.value)} list="ps-sprints" /><datalist id="ps-sprints">{existing.map((name) => <option key={name}>{name}</option>)}</datalist></label>
      </section>
      <div className="ps-stats ps-four">
        <Stat label="Itens" value={metrics.count} /><Stat label="Pontos" value={metrics.totalPoints} />
        <Stat label="Concluídos" value={metrics.completedPoints} tone="ok" /><Stat label="Progresso" value={`${metrics.progress}%`} />
      </div>
      <div className="ps-kanban">
        <section className="ps-card"><h3>Backlog <span>{backlog.length}</span></h3>{backlog.slice(0, 40).map((task) => <article className="ps-ticket" key={task.id}><strong>{task.title}</strong><span>{task.priority || "Sem prioridade"}</span><button onClick={() => assign(task)}>Adicionar ao sprint</button></article>)}</section>
        <section className="ps-card"><h3>Em andamento <span>{metrics.items.filter((task) => !["Concluído", "Concluída"].includes(task.status)).length}</span></h3>{metrics.items.filter((task) => !["Concluído", "Concluída"].includes(task.status)).map((task) => <article className="ps-ticket" key={task.id}><strong>{task.title}</strong><label>Pontos<input type="number" min="1" max="100" value={task.storyPoints || 1} onChange={(event) => changeTask(task, { storyPoints: Number(event.target.value) })} /></label><button onClick={() => changeTask(task, { status: "Concluído" })}><CheckCircle2 /> Concluir</button></article>)}</section>
        <section className="ps-card"><h3>Concluído <span>{metrics.completed}</span></h3>{metrics.items.filter((task) => ["Concluído", "Concluída"].includes(task.status)).map((task) => <article className="ps-ticket done" key={task.id}><strong>{task.title}</strong><span>{task.storyPoints || 1} ponto(s)</span><button onClick={() => changeTask(task, { sprint: "", status: "A fazer" })}>Voltar ao backlog</button></article>)}</section>
      </div>
    </div>
  );
}

function RecordingPanel({ setToast }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [state, setState] = useState("idle");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [downloadName, setDownloadName] = useState("gravacao.webm");
  const supported = Boolean(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const start = async () => {
    if (!supported) return;
    try {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl("");
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm" });
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setRecordingUrl(URL.createObjectURL(blob));
        setDownloadName(`gravacao-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.webm`);
        stream.getTracks().forEach((track) => track.stop());
        setState("ready");
      };
      stream.getVideoTracks()[0]?.addEventListener("ended", () => recorder.state !== "inactive" && recorder.stop());
      recorder.start(1_000);
      setState("recording");
    } catch (error) {
      setState("idle");
      if (error?.name !== "NotAllowedError") setToast("Não foi possível iniciar a gravação");
    }
  };
  const pause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") { recorder.pause(); setState("paused"); }
    else if (recorder.state === "paused") { recorder.resume(); setState("recording"); }
  };
  const stop = () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
  };
  return (
    <div className="ps-grid">
      <section className="ps-card">
        <span className="ps-kicker">Loom local e privado</span><h2>Grave sua tela</h2>
        <p>O vídeo fica no seu dispositivo. Nenhuma gravação é enviada ao servidor.</p>
        {!supported ? <p className="ps-alert">Este navegador não oferece gravação de tela. Plano B: use o gravador nativo do celular ou computador.</p> : (
          <div className="ps-recorder-actions">
            {state === "idle" || state === "ready" ? <button className="ps-primary" onClick={start}><Play /> Iniciar gravação</button> : <>
              <button onClick={pause}>{state === "paused" ? <Play /> : <Pause />} {state === "paused" ? "Continuar" : "Pausar"}</button>
              <button className="ps-danger-button" onClick={stop}><Square /> Encerrar</button>
            </>}
          </div>
        )}
        <div className={`ps-record-state ${state}`}><span />{state === "recording" ? "Gravando agora" : state === "paused" ? "Gravação pausada" : state === "ready" ? "Gravação pronta" : "Pronto para começar"}</div>
      </section>
      <section className="ps-card">
        <span className="ps-kicker">Prévia e download</span><h2>Arquivo WebM</h2>
        {recordingUrl ? <>
          {/* A gravação é conteúdo criado localmente pelo usuário e não possui faixa de legendas. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video className="ps-video" controls src={recordingUrl} />
          <a className="ps-download" href={recordingUrl} download={downloadName}><Download /> Baixar gravação</a>
        </> : <Empty icon={ScreenShare} title="Sem gravação">Ao encerrar, a prévia aparece aqui.</Empty>}
      </section>
    </div>
  );
}

function AnalyticsPanel({ authHeaders, ownerId, business, setToast }) {
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState("");
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ name: business?.name || "Meu site", allowedOrigin: "*" });
  const loadSites = useCallback(async () => {
    try {
      const data = await api(`/api/platform/analytics-sites${ownerQuery(ownerId)}`, authHeaders);
      setSites(data.sites || []);
      setSelected((current) => current || data.sites?.[0]?.id || "");
    } catch (error) { setToast(error.message); }
  }, [authHeaders, ownerId, setToast]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadSites(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSites]);
  const loadSummary = useCallback(async () => {
    if (!selected) { setSummary(null); return; }
    try {
      const separator = ownerId ? "&" : "&";
      const data = await api(`/api/platform/analytics-summary?siteId=${encodeURIComponent(selected)}&days=30${ownerId ? `${separator}owner=${encodeURIComponent(ownerId)}` : ""}`, authHeaders);
      setSummary(data.summary);
    } catch (error) { setToast(error.message); }
  }, [authHeaders, ownerId, selected, setToast]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);
  const create = async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/platform/analytics-sites", authHeaders, {
        method: "POST",
        body: JSON.stringify({ ...form, ownerId, businessId: business?.id || null }),
      });
      setSelected(data.site.id);
      setToast("Analytics próprio criado");
      loadSites();
    } catch (error) { setToast(error.message); }
  };
  const site = sites.find((item) => item.id === selected);
  const snippet = site ? `<script>
(()=>{const k="sf_vid",s="sf_sid";let v=localStorage.getItem(k)||crypto.randomUUID(),q=sessionStorage.getItem(s)||crypto.randomUUID();localStorage.setItem(k,v);sessionStorage.setItem(s,q);navigator.sendBeacon("${window.location.origin}/api/public-analytics/${site.siteKey}/event",new Blob([JSON.stringify({eventName:"page_view",path:location.pathname,referrer:document.referrer,visitorId:v,sessionId:q,occurredAt:new Date().toISOString()})],{type:"application/json"}));})();
</script>` : "";
  const copySnippet = async () => {
    await navigator.clipboard?.writeText(snippet);
    setToast("Código de medição copiado");
  };
  return (
    <div className="ps-grid">
      <section className="ps-card">
        <span className="ps-kicker">Google Analytics próprio</span><h2>Crie uma medição</h2>
        <form onSubmit={create}>
          <label>Nome do site<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Origem permitida<input value={form.allowedOrigin} onChange={(event) => setForm({ ...form, allowedOrigin: event.target.value })} placeholder="https://meusite.com ou *" /></label>
          <button className="ps-primary"><Plus /> Criar analytics</button>
        </form>
        <p className="ps-note">Coleta mínima: evento, caminho, domínio referenciador e identificadores aleatórios. Sem cookies de publicidade.</p>
      </section>
      <section className="ps-card">
        <span className="ps-kicker">Instalação</span><h2>Código de medição</h2>
        {sites.length ? <><label>Site<select value={selected} onChange={(event) => setSelected(event.target.value)}>{sites.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><pre className="ps-code">{snippet}</pre><button onClick={copySnippet}><Copy /> Copiar código</button></> : <Empty icon={Gauge} title="Sem medição">Crie um identificador para gerar o código.</Empty>}
      </section>
      <section className="ps-card ps-wide">
        <div className="ps-card-head"><div><span className="ps-kicker">Últimos 30 dias</span><h2>Desempenho do site</h2></div><button className="ps-icon" onClick={loadSummary} aria-label="Atualizar"><RefreshCw /></button></div>
        <div className="ps-stats ps-four"><Stat label="Visualizações" value={summary?.pageViews || 0} /><Stat label="Visitantes" value={summary?.visitors || 0} /><Stat label="Sessões" value={summary?.sessions || 0} /><Stat label="Eventos" value={summary?.events || 0} /></div>
        <div className="ps-mini-columns"><div><h3>Páginas principais</h3>{(summary?.topPaths || []).map((item) => <div className="ps-rank" key={item.name}><span>{item.name}</span><strong>{item.count}</strong></div>)}</div><div><h3>Eventos principais</h3>{(summary?.topEvents || []).map((item) => <div className="ps-rank" key={item.name}><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></div>
      </section>
    </div>
  );
}

function CampaignPanel({ db, update, authHeaders, ownerId, business, setToast }) {
  const contacts = useMemo(() => (db.contacts || []).filter((contact) => !business || contact.businessId === business.id), [db.contacts, business]);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: "", subject: "", content: "", query: "" });
  const audience = useMemo(() => consentedAudience(contacts, { query: form.query, businessId: business?.id }), [contacts, form.query, business]);
  const load = useCallback(async () => {
    try {
      const data = await api(`/api/platform/campaigns${ownerQuery(ownerId)}`, authHeaders);
      setCampaigns(data.campaigns || []);
    } catch (error) { setToast(error.message); }
  }, [authHeaders, ownerId, setToast]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const toggleConsent = (contact) => {
    update((current) => ({
      ...current,
      contacts: (current.contacts || []).map((item) => item.id === contact.id ? { ...item, marketingOptIn: !item.marketingOptIn, marketingOptInAt: !item.marketingOptIn ? new Date().toISOString() : null } : item),
    }));
  };
  const save = async (event) => {
    event.preventDefault();
    try {
      await api("/api/platform/campaigns", authHeaders, {
        method: "POST",
        body: JSON.stringify({
          ownerId, businessId: business?.id || null, name: form.name,
          subject: form.subject, content: form.content,
          audience: { query: form.query, estimatedCount: audience.length },
        }),
      });
      setToast("Campanha salva como rascunho");
      load();
    } catch (error) { setToast(error.message); }
  };
  const exportAudience = () => {
    const rows = [["nome", "email", "empresa"], ...audience.map((contact) => [contact.name, contact.email, contact.company])];
    download(rows.map((row) => row.map(csvCell).join(",")).join("\n"), "publico-consentido.csv", "text/csv;charset=utf-8");
  };
  const exportCampaign = () => {
    download(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${form.subject}</title><body><main style="max-width:640px;margin:auto;font-family:Arial,sans-serif;line-height:1.6"><h1>${form.subject}</h1>${form.content.split("\n").map((line) => `<p>${line.replace(/[&<>]/g, "")}</p>`).join("")}<hr><p style="font-size:12px">Envie apenas para pessoas que autorizaram comunicações e inclua seu canal de descadastro.</p></main></body></html>`, "campanha.html", "text/html;charset=utf-8");
  };
  return (
    <div className="ps-grid">
      <section className="ps-card">
        <span className="ps-kicker">Mailchimp sem disparo obrigatório</span><h2>Monte sua campanha</h2>
        <form onSubmit={save}>
          <label>Nome interno<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Assunto<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label>
          <label>Conteúdo<textarea className="ps-tall" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required /></label>
          <label>Filtrar público<input value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="Nome, empresa ou tag" /></label>
          <div className="ps-button-row"><button className="ps-primary"><Save /> Salvar rascunho</button><button type="button" onClick={exportCampaign}><Download /> HTML</button></div>
        </form>
      </section>
      <section className="ps-card">
        <span className="ps-kicker">Consentimento primeiro</span><h2>{audience.length} destinatário(s) elegível(is)</h2>
        <p>Só entra quem tem e-mail e consentimento de marketing registrado.</p>
        <div className="ps-list ps-scroll">
          {contacts.map((contact) => <article className="ps-row" key={contact.id}><div><strong>{contact.name || contact.email}</strong><span>{contact.email || "Sem e-mail"}</span></div><button className={contact.marketingOptIn ? "ps-consent-on" : ""} onClick={() => toggleConsent(contact)}>{contact.marketingOptIn ? <CheckCircle2 /> : <Users />} {contact.marketingOptIn ? "Autorizado" : "Registrar autorização"}</button></article>)}
        </div>
        <button onClick={exportAudience} disabled={!audience.length}><Download /> Exportar público consentido</button>
        <p className="ps-note">Plano B: exporte HTML e CSV para qualquer provedor gratuito. Disparo automático fica desligado até existir canal gratuito configurado e descadastro verificável.</p>
      </section>
      <section className="ps-card ps-wide">
        <span className="ps-kicker">Biblioteca</span><h2>Rascunhos persistidos</h2>
        <div className="ps-list">{campaigns.map((campaign) => <article className="ps-row" key={campaign.id}><div><strong>{campaign.name}</strong><span>{campaign.subject} · público estimado: {campaign.audience?.estimatedCount || 0}</span></div><span className="ps-pill">{campaign.status}</span></article>)}</div>
      </section>
    </div>
  );
}

function InventoryPanel({ db, update, business, setToast }) {
  const products = useMemo(() => (db.products || []).filter((product) => !business || product.businessId === business.id), [db.products, business]);
  const health = useMemo(() => inventoryHealth(products), [products]);
  const adjust = (productId, variantId, delta) => {
    update((current) => ({
      ...current,
      products: (current.products || []).map((product) => {
        if (product.id !== productId) return product;
        if (variantId) return { ...product, variants: (product.variants || []).map((variant) => variant.id === variantId ? { ...variant, stock: Math.max(0, Number(variant.stock || 0) + delta) } : variant), updatedAt: new Date().toISOString() };
        return { ...product, stock: Math.max(0, Number(product.stock || 0) + delta), updatedAt: new Date().toISOString() };
      }),
    }));
    setToast("Estoque atualizado");
  };
  const exportPurchase = () => {
    const rows = [["produto", "estoque atual", "estoque mínimo", "comprar"], ...health.rows.filter((row) => row.status !== "normal").map((row) => [row.name, row.stock, row.threshold, row.suggestedPurchase])];
    download(rows.map((row) => row.map(csvCell).join(",")).join("\n"), "sugestao-de-compras.csv", "text/csv;charset=utf-8");
  };
  return (
    <div className="ps-stack">
      <section className="ps-card ps-card-head"><div><span className="ps-kicker">Bling + Tiny, conectado ao catálogo</span><h2>Central de estoque</h2></div><button onClick={exportPurchase}><Download /> Lista de compras</button></section>
      <div className="ps-stats"><Stat label="Produtos" value={health.rows.length} /><Stat label="Sem estoque" value={health.outOfStock} tone="danger" /><Stat label="Estoque baixo" value={health.lowStock} tone="warn" /></div>
      <section className="ps-card">
        {products.length ? <div className="ps-table-wrap"><table><thead><tr><th>Produto/variante</th><th>Disponível</th><th>Mínimo</th><th>Ajuste rápido</th></tr></thead><tbody>
          {products.flatMap((product) => (product.variants || []).length ? product.variants.map((variant) => ({ product, variant })) : [{ product, variant: null }]).map(({ product, variant }) => <tr key={`${product.id}:${variant?.id || "base"}`}><td><strong>{product.name}</strong>{variant && <small>{variant.name}</small>}</td><td>{variant ? variant.stock : product.stock || 0} {product.unit || "un"}</td><td>{product.lowStockAlert || 0}</td><td><div className="ps-stepper"><button onClick={() => adjust(product.id, variant?.id, -1)}>−1</button><button onClick={() => adjust(product.id, variant?.id, 1)}>+1</button><button onClick={() => adjust(product.id, variant?.id, 10)}>+10</button></div></td></tr>)}
        </tbody></table></div> : <Empty icon={PackageSearch} title="Catálogo vazio">Cadastre produtos em Produtos e Pedidos para controlar o estoque aqui.</Empty>}
      </section>
      <p className="ps-note">Pedidos já baixam o estoque automaticamente. Esta central acrescenta alerta de ruptura, reposição sugerida, ajustes por variante e exportação para compras.</p>
    </div>
  );
}

export default function PlatformSuite({
  db,
  update,
  business,
  setToast,
  authHeaders,
  ownerId,
}) {
  const [tab, setTab] = useState("agenda");
  return (
    <div className="ps-page">
      <header className="ps-hero">
        <div><span className="ps-kicker">Operação gratuita conectada</span><h1>Central de crescimento</h1><p>Recursos equivalentes aos blocos essenciais de sete plataformas, usando a base que você já tem e contingências sem mensalidade.</p></div>
        <div className="ps-hero-badge"><strong>7</strong><span>novas frentes</span></div>
      </header>
      <nav className="ps-tabs" aria-label="Recursos da central">
        {TABS.map(({ id, label, icon: Icon }) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon />{label}</button>)}
      </nav>
      {tab === "agenda" && <SchedulePanel authHeaders={authHeaders} ownerId={ownerId} business={business} setToast={setToast} />}
      {tab === "atendimento" && <SupportPanel authHeaders={authHeaders} ownerId={ownerId} business={business} setToast={setToast} />}
      {tab === "sprints" && <SprintPanel db={db} update={update} business={business} setToast={setToast} />}
      {tab === "gravacao" && <RecordingPanel setToast={setToast} />}
      {tab === "analytics" && <AnalyticsPanel authHeaders={authHeaders} ownerId={ownerId} business={business} setToast={setToast} />}
      {tab === "campanhas" && <CampaignPanel db={db} update={update} authHeaders={authHeaders} ownerId={ownerId} business={business} setToast={setToast} />}
      {tab === "estoque" && <InventoryPanel db={db} update={update} business={business} setToast={setToast} />}
    </div>
  );
}
