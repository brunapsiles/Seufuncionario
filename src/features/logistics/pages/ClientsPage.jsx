import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Edit3,
  Plus,
  Search,
  Target,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Modal from "../../../components/Modal.jsx";
import {
  TODO_GREEN_ACCOUNT_STAGES,
  TODO_GREEN_ACCOUNT_TEMPERATURES,
  TODO_GREEN_ACCOUNT_TIERS,
  TODO_GREEN_RELATIONSHIP_ROLES,
  buildCrmCommandCenter,
  crmAccountSummary,
} from "../todoGreenCrmDomain.js";
import "./TodoGreenPages.css";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const api = async (path, authHeaders, options = {}) => {
  const result = await fetch(`/api/todogreen/${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(authHeaders?.() || {}), ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload.error || "Não foi possível concluir a ação.");
  return payload;
};

const accountFromClient = (client) => ({
  ...(client.crm || {}),
  id: client.id,
  legalName: client.legalName,
  tradeName: client.name,
  document: client.document,
  segment: client.segment,
  status: client.status,
  notes: client.notes,
  revision: client.revision,
  ownerId: client.vendedores?.[0]?.email || "",
  contacts: client.crm?.contacts || [],
});

const opportunityForCrm = (item) => ({
  ...item,
  accountId: item.clientId,
  stage: item.estagio,
  value: Number(item.valorContrato || 0) || Number(item.valorMensal || 0) * Number(item.mesesContrato || 12),
  probability: item.probabilidade,
});

const accountForm = (client) => {
  const crm = client?.crm || {};
  return {
    name: client?.name || "",
    legalName: client?.legalName || "",
    document: client?.document || "",
    segment: client?.segment || "",
    notes: client?.notes || "",
    tier: crm.tier || "Enterprise",
    temperature: crm.temperature || "",
    stage: crm.stage || "Mapeamento",
    headquarters: crm.headquarters || "",
    strategicPotential: crm.strategicPotential || 0,
    relationshipStrength: crm.relationshipStrength || 0,
    operationalFit: crm.operationalFit || 0,
    esgFit: crm.esgFit || 0,
    dataQuality: crm.dataQuality || 0,
    churnRisk: crm.churnRisk || 0,
    nextAction: crm.nextAction || "",
    nextActionAt: crm.nextActionAt || "",
    contacts: crm.contacts || [],
  };
};

function AccountEditor({ client, onClose, onSave }) {
  const [form, setForm] = useState(() => accountForm(client));
  const [contact, setContact] = useState({ name: "", title: "", email: "", phone: "", relationshipRole: "Influenciador" });
  const [saving, setSaving] = useState(false);
  const field = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const addContact = () => {
    if (!contact.name.trim()) return;
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, { ...contact, id: crypto.randomUUID(), active: true }],
    }));
    setContact({ name: "", title: "", email: "", phone: "", relationshipRole: "Influenciador" });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        legalName: form.legalName,
        document: form.document,
        segment: form.segment,
        notes: form.notes,
        revision: client.revision,
        crm: {
          ...client.crm,
          tier: form.tier,
          temperature: form.temperature,
          stage: form.stage,
          headquarters: form.headquarters,
          strategicPotential: Number(form.strategicPotential || 0),
          relationshipStrength: Number(form.relationshipStrength || 0),
          operationalFit: Number(form.operationalFit || 0),
          esgFit: Number(form.esgFit || 0),
          dataQuality: Number(form.dataQuality || 0),
          churnRisk: Number(form.churnRisk || 0),
          nextAction: form.nextAction,
          nextActionAt: form.nextActionAt,
          contacts: form.contacts,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Visão 360º · ${client.name}`} onClose={onClose} wide>
      <form className="tdg-crm-editor" onSubmit={save}>
        <fieldset>
          <legend>Conta e estratégia</legend>
          <div className="tdg-crm-form-grid">
            <label><span>Nome da conta</span><input required value={form.name} onChange={field("name")} /></label>
            <label><span>Razão social</span><input value={form.legalName} onChange={field("legalName")} /></label>
            <label><span>Documento</span><input value={form.document} onChange={field("document")} /></label>
            <label><span>Segmento</span><input value={form.segment} onChange={field("segment")} /></label>
            <label><span>Classificação</span><select value={form.tier} onChange={field("tier")}>{TODO_GREEN_ACCOUNT_TIERS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Temperatura</span><select value={form.temperature} onChange={field("temperature")}><option value="">Não classificada</option>{TODO_GREEN_ACCOUNT_TEMPERATURES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Momento da conta</span><select value={form.stage} onChange={field("stage")}>{TODO_GREEN_ACCOUNT_STAGES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Sede / região</span><input value={form.headquarters} onChange={field("headquarters")} /></label>
            <label><span>Próxima ação</span><input value={form.nextAction} onChange={field("nextAction")} /></label>
            <label><span>Prazo da próxima ação</span><input type="date" value={form.nextActionAt} onChange={field("nextActionAt")} /></label>
          </div>
          <label><span>Contexto e observações</span><textarea value={form.notes} onChange={field("notes")} /></label>
        </fieldset>

        <fieldset>
          <legend>Score da conta</legend>
          <p>Registre a leitura da equipe. O painel separa potencial, aderência e risco para não esconder uma conta frágil atrás de um único número.</p>
          <div className="tdg-crm-score-inputs">
            {[
              ["strategicPotential", "Potencial estratégico"],
              ["relationshipStrength", "Força do relacionamento"],
              ["operationalFit", "Aderência operacional"],
              ["esgFit", "Aderência ESG"],
              ["dataQuality", "Qualidade dos dados"],
              ["churnRisk", "Risco comercial"],
            ].map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" max="100" value={form[key]} onChange={field(key)} /></label>)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Mapa de relacionamento</legend>
          <div className="tdg-crm-contact-form">
            <input aria-label="Nome do contato" placeholder="Nome" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
            <input aria-label="Cargo do contato" placeholder="Cargo" value={contact.title} onChange={(event) => setContact({ ...contact, title: event.target.value })} />
            <select aria-label="Papel no relacionamento" value={contact.relationshipRole} onChange={(event) => setContact({ ...contact, relationshipRole: event.target.value })}>{TODO_GREEN_RELATIONSHIP_ROLES.map((item) => <option key={item}>{item}</option>)}</select>
            <input aria-label="E-mail do contato" type="email" placeholder="E-mail" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
            <input aria-label="Telefone do contato" placeholder="Telefone" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
            <button type="button" onClick={addContact}><UserPlus size={15} />Adicionar</button>
          </div>
          <div className="tdg-crm-contact-list">
            {form.contacts.length === 0 && <p>Nenhum contato mapeado. Comece pelo patrocinador e pelos decisores econômico e técnico.</p>}
            {form.contacts.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.title || "Cargo não informado"} · {item.relationshipRole}</small></div><span>{item.email || item.phone || "Sem canal informado"}</span><button type="button" aria-label={`Remover ${item.name}`} onClick={() => setForm((current) => ({ ...current, contacts: current.contacts.filter((candidate) => candidate.id !== item.id) }))}><Trash2 size={14} /></button></article>)}
          </div>
        </fieldset>
        <footer><button type="button" onClick={onClose}>Cancelar</button><button className="tdg-action" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar visão 360º"}</button></footer>
      </form>
    </Modal>
  );
}

export default function ClientsPage({ authHeaders, opportunities = [], onNavigate, setToast }) {
  const [clients, setClients] = useState([]);
  const [access, setAccess] = useState({ podeGerenciar: false, podeEditar: true, somenteCarteira: true });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", documento: "", segmento: "", tier: "Enterprise", stage: "Mapeamento" });
  const [assignment, setAssignment] = useState({ clientId: "", sellerEmail: "", note: "" });
  const [importProgress, setImportProgress] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await api("clients", authHeaders);
      setClients(data.clientes || []); setAccess(data.acesso || access);
      setSelectedId((current) => current || data.clientes?.[0]?.id || "");
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const accounts = useMemo(() => clients.map(accountFromClient), [clients]);
  const crmOpportunities = useMemo(() => opportunities.map(opportunityForCrm), [opportunities]);
  const command = useMemo(() => buildCrmCommandCenter(accounts, crmOpportunities), [accounts, crmOpportunities]);
  const summaryById = useMemo(() => new Map(command.accounts.map((item) => [item.id, item])), [command]);
  const visible = useMemo(() => clients.filter((client) => {
    const summary = summaryById.get(client.id);
    const matchesQuery = `${client.name} ${client.document || ""} ${client.segment || ""} ${client.crm?.stage || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || summary?.attention === filter || (filter === "no-decision" && summary?.coverage < 60);
    const matchesTemperature = temperatureFilter === "all" || client.crm?.temperature === temperatureFilter;
    return matchesQuery && matchesFilter && matchesTemperature;
  }), [clients, filter, query, summaryById, temperatureFilter]);
  const renderedClients = visible.slice(0, visibleLimit);
  const selected = clients.find((client) => client.id === selectedId) || visible[0] || null;
  const selectedAccount = selected ? accountFromClient(selected) : null;
  const selectedOpportunities = selected ? crmOpportunities.filter((item) => item.clientId === selected.id) : [];
  const selectedSummary = selectedAccount ? crmAccountSummary(selectedAccount, selectedAccount.contacts, crmOpportunities) : null;

  const createClient = async (event) => {
    event.preventDefault(); setError("");
    try {
      await api("clients", authHeaders, { method: "POST", body: JSON.stringify({ ...clientForm, crm: { tier: clientForm.tier, stage: clientForm.stage } }) });
      setClientForm({ nome: "", documento: "", segmento: "", tier: "Enterprise", stage: "Mapeamento" });
      setShowCreate(false); setToast?.("Cliente cadastrado no CRM."); await load();
    } catch (reason) { setError(reason.message); }
  };
  const saveClient = async (client, payload) => {
    try {
      await api(`clients/${encodeURIComponent(client.id)}`, authHeaders, { method: "PATCH", body: JSON.stringify(payload) });
      setToast?.("Visão 360º atualizada."); await load();
    } catch (reason) { setError(reason.message); throw reason; }
  };
  const assign = async (event) => {
    event.preventDefault(); setError("");
    try {
      await api("client-assignments", authHeaders, { method: "PUT", body: JSON.stringify(assignment) });
      setAssignment({ clientId: "", sellerEmail: "", note: "" }); setToast?.("Carteira atualizada."); await load();
    } catch (reason) { setError(reason.message); }
  };
  const unassign = async (clientId, sellerEmail) => {
    try {
      await api(`client-assignments?clientId=${encodeURIComponent(clientId)}&sellerEmail=${encodeURIComponent(sellerEmail)}`, authHeaders, { method: "DELETE" });
      await load();
    } catch (reason) { setError(reason.message); }
  };
  const importClients = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const payload = JSON.parse(await file.text());
      const items = Array.isArray(payload?.clientes) ? payload.clientes : [];
      if (!items.length) throw new Error("O arquivo não contém clientes para importar.");
      for (let index = 0; index < items.length; index += 100) {
        const batch = items.slice(index, index + 100);
        setImportProgress(`Importando ${Math.min(index + batch.length, items.length)} de ${items.length} contas...`);
        await api("clients/import", authHeaders, { method: "POST", body: JSON.stringify({ clientes: batch }) });
      }
      setToast?.(`${items.length} contas importadas e atribuídas à sua carteira.`);
      await load();
    } catch (reason) {
      setError(reason instanceof SyntaxError ? "O arquivo de importação não é um JSON válido." : reason.message);
    } finally {
      setImportProgress("");
      event.target.value = "";
    }
  };

  return (
    <section className="tdg-panel tdg-page tdg-clients-page">
      <header className="tdg-page-title"><div><span>COMANDO COMERCIAL</span><h2>CRM e carteira 360º</h2><p>Priorize contas, acompanhe relacionamentos, forecast e próximas ações em uma única rotina. Cada vendedor continua vendo somente sua carteira.</p></div>{access.podeGerenciar && <div className="tdg-crm-admin-actions"><label className="tdg-action tdg-crm-import"><Upload size={16} />{importProgress || "Importar base"}<input type="file" accept="application/json,.json" disabled={Boolean(importProgress)} onChange={importClients} /></label><button className="tdg-action" type="button" onClick={() => setShowCreate((value) => !value)}><Plus size={16} />Nova conta</button></div>}</header>
      {error && <div className="tdg-page-error">{error}</div>}

      <div className="tdg-crm-metrics" aria-label="Resumo do CRM">
        <article><Building2 size={18} /><span>Contas na carteira</span><strong>{command.totalAccounts}</strong></article>
        <article><BriefcaseBusiness size={18} /><span>Oportunidades abertas</span><strong>{command.openOpportunities}</strong></article>
        <article><CircleDollarSign size={18} /><span>Forecast ponderado</span><strong>{BRL.format(command.weightedPipeline)}</strong><small>{BRL.format(command.totalPipeline)} em pipeline</small></article>
        <article className={command.overdueActions ? "attention" : ""}><CalendarClock size={18} /><span>Ações atrasadas</span><strong>{command.overdueActions}</strong></article>
        <article className={command.relationshipGaps ? "attention" : ""}><Users size={18} /><span>Mapa incompleto</span><strong>{command.relationshipGaps}</strong></article>
      </div>

      {showCreate && <form className="tdg-client-admin-form" onSubmit={createClient}><strong>Nova conta</strong><div className="tdg-form-row"><label><span>Nome</span><input required value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })} /></label><label><span>Documento</span><input value={clientForm.documento} onChange={(e) => setClientForm({ ...clientForm, documento: e.target.value })} /></label><label><span>Segmento</span><input value={clientForm.segmento} onChange={(e) => setClientForm({ ...clientForm, segmento: e.target.value })} /></label><label><span>Classificação</span><select value={clientForm.tier} onChange={(e) => setClientForm({ ...clientForm, tier: e.target.value })}>{TODO_GREEN_ACCOUNT_TIERS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Momento</span><select value={clientForm.stage} onChange={(e) => setClientForm({ ...clientForm, stage: e.target.value })}>{TODO_GREEN_ACCOUNT_STAGES.map((item) => <option key={item}>{item}</option>)}</select></label></div><button className="tdg-action"><Plus size={16} />Cadastrar conta</button></form>}

      <div className="tdg-crm-toolbar"><div className="tdg-client-toolbar"><Search size={18} /><input aria-label="Buscar clientes" placeholder="Buscar por conta, documento, segmento ou etapa" value={query} onChange={(e) => { setQuery(e.target.value); setVisibleLimit(100); }} /></div><div className="tdg-crm-filters" aria-label="Temperatura das contas">{[["all", "Todas"], ["Quente", "Quentes"], ["Morno", "Mornas"], ["Frio", "Frias"]].map(([id, label]) => <button type="button" className={temperatureFilter === id ? "active" : ""} onClick={() => { setTemperatureFilter(id); setVisibleLimit(100); }} key={id}>{label}</button>)}</div><div className="tdg-crm-filters" aria-label="Saúde da carteira">{[["all", "Toda saúde"], ["critical", "Críticas"], ["attention", "Atenção"], ["healthy", "Saudáveis"], ["no-decision", "Mapa incompleto"]].map(([id, label]) => <button type="button" className={filter === id ? "active" : ""} onClick={() => { setFilter(id); setVisibleLimit(100); }} key={id}>{label}</button>)}</div></div>

      {loading && <p>Carregando carteira...</p>}
      {!loading && visible.length === 0 && <p className="tdg-crm-empty">Nenhuma conta corresponde aos filtros desta carteira.</p>}
      {!loading && visible.length > 0 && <div className="tdg-crm-workspace">
        <div className="tdg-crm-table" role="table" aria-label="Contas do CRM">
          <div className="tdg-crm-table-head" role="row"><span>Conta</span><span>Saúde</span><span>Pipeline</span><span>Próxima ação</span></div>
          {renderedClients.map((client) => { const summary = summaryById.get(client.id); return <button type="button" role="row" className={`${selected?.id === client.id ? "selected" : ""} ${summary?.attention || ""}`} onClick={() => setSelectedId(client.id)} key={client.id}><span><strong>{client.name}</strong><small>{client.crm?.temperature ? `${client.crm.temperature} · ` : ""}{client.segment || "Segmento não informado"} · {client.crm?.stage || "Mapeamento"}</small></span><span><b>{summary?.score || 0}</b><small>{summary?.coverage || 0}% de cobertura</small></span><span><strong>{BRL.format(summary?.pipeline || 0)}</strong><small>{summary?.openOpportunities || 0} aberta(s)</small></span><span><strong>{summary?.nextAction || "Definir próxima ação"}</strong><small>{client.crm?.nextActionAt || "Sem prazo"}</small></span></button>; })}
          {visible.length > renderedClients.length && <button type="button" className="tdg-crm-load-more" onClick={() => setVisibleLimit((current) => current + 100)}>Mostrar mais 100 contas ({renderedClients.length} de {visible.length})</button>}
        </div>

        {selected && selectedSummary && <aside className="tdg-crm-account">
          <header><div><span>{selected.crm?.tier || "Enterprise"}{selected.crm?.temperature ? ` · ${selected.crm.temperature}` : ""}</span><h3>{selected.name}</h3><p>{selected.segment || "Segmento não informado"} · {selected.crm?.stage || "Mapeamento"}</p>{selected.crm?.source && <small>Origem interna: {selected.crm.source}</small>}</div>{access.podeEditar && <button type="button" onClick={() => setEditingId(selected.id)}><Edit3 size={15} />Editar 360º</button>}</header>
          <div className="tdg-crm-health"><div><strong>{selectedSummary.score}</strong><span>saúde da conta</span></div><div><strong>{selectedSummary.coverage}%</strong><span>cobertura de decisores</span></div></div>
          <section className="tdg-crm-next"><Target size={17} /><div><small>PRÓXIMA MELHOR AÇÃO</small><strong>{selectedSummary.nextAction}</strong></div></section>
          {selectedSummary.alerts.length > 0 && <section className="tdg-crm-alerts"><strong><AlertTriangle size={15} />Pontos de atenção</strong>{selectedSummary.alerts.map((alert) => <span key={alert}>{alert}</span>)}</section>}
          <section><header><strong>Relacionamento</strong><small>{selectedAccount.contacts.length} contato(s)</small></header><div className="tdg-crm-roles">{selectedAccount.contacts.slice(0, 5).map((contact) => <span key={contact.id}><b>{contact.name}</b>{contact.relationshipRole}</span>)}{selectedAccount.contacts.length === 0 && <p>Nenhum decisor ou patrocinador mapeado.</p>}</div></section>
          <section><header><strong>Oportunidades</strong><button type="button" onClick={() => onNavigate?.(`/todogreen/oportunidades?client=${encodeURIComponent(selected.id)}`)}>Abrir pipeline <ArrowRight size={13} /></button></header>{selectedOpportunities.length === 0 ? <p>Nenhuma oportunidade ligada a esta conta.</p> : <div className="tdg-crm-opps">{selectedOpportunities.slice(0, 4).map((opp) => <article key={opp.id}><span><strong>{opp.stage}</strong><small>{opp.nextStep || "Próximo passo não definido"}</small></span><b>{BRL.format(opp.value || 0)}</b></article>)}</div>}</section>
          <section><header><strong>Responsáveis</strong></header><div className="tdg-client-sellers">{(selected.vendedores || []).length === 0 && <small>Sem responsável comercial</small>}{(selected.vendedores || []).map((seller) => <span key={seller.email}>{seller.email}{access.podeGerenciar && <button type="button" aria-label={`Remover ${seller.email}`} onClick={() => unassign(selected.id, seller.email)}><X size={12} /></button>}</span>)}</div>{access.podeGerenciar && <form className="tdg-crm-assign" onSubmit={assign}><input required type="email" aria-label="E-mail do vendedor" placeholder="vendedor@empresa.com" value={assignment.clientId === selected.id ? assignment.sellerEmail : ""} onChange={(e) => setAssignment({ clientId: selected.id, sellerEmail: e.target.value, note: "" })} /><button type="submit"><UserPlus size={14} />Atribuir</button></form>}</section>
        </aside>}
      </div>}
      {editingId && <AccountEditor client={clients.find((item) => item.id === editingId)} onClose={() => setEditingId("")} onSave={(payload) => saveClient(clients.find((item) => item.id === editingId), payload)} />}
    </section>
  );
}
