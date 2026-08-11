import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Edit3,
  Eye,
  Globe2,
  LayoutGrid,
  List,
  ListPlus,
  Plus,
  Search,
  Target,
  Trash2,
  Upload,
  ExternalLink,
  Mail,
  MessageCircle,
  RefreshCw,
  UserSearch,
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
import { assessAccount, gmailComposeUrl, isTrustedCrmContact, outlookComposeUrl, whatsappUrl } from "../accountIntelligenceDomain.js";
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
  contacts: (client.crm?.contacts || []).filter(isTrustedCrmContact),
});

const opportunityForCrm = (item) => ({
  ...item,
  accountId: item.clientId,
  stage: item.estagio,
  value: Number(item.valorContrato || 0) || Number(item.valorMensal || 0) * Number(item.mesesContrato || 12),
  probability: item.probabilidade,
});

const formatCheckedAt = (value) => value ? new Date(value).toLocaleString("pt-BR") : "Ainda não pesquisado";

const ENGLISH_WORDS = /\b(the|and|with|from|for|across|we|our|their|this|that|company|manager|procurement|supply|chain|transportation|distribution|reports|growth|emissions|business)\b/gi;
const PORTUGUESE_WORDS = /\b(o|a|os|as|de|do|da|dos|das|com|para|por|empresa|compras|logística|transporte|emissões|crescimento)\b/gi;
const sourceHost = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "fonte externa"; } };
const isEnglishSource = (item) => {
  const text = `${item?.title || ""} ${item?.snippet || ""}`;
  const english = text.match(ENGLISH_WORDS)?.length || 0;
  const portuguese = text.match(PORTUGUESE_WORDS)?.length || 0;
  return english >= 4 && english > portuguese * 2;
};

function ResearchLinks({ title, items = [], empty }) {
  return <div className="tdg-crm-research-group"><span>{title}</span>{items.length
    ? <ul>{items.map((item) => { const english = isEnglishSource(item); return <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{english ? `Fonte internacional · ${sourceHost(item.url)}` : item.title}</a>{item.snippet && <small>{english ? "Conteúdo original em inglês. A evidência foi classificada pelo CRM, e o link permanece disponível para conferência." : item.snippet}</small>}{item.validation && <em>{item.validation}</em>}</li>; })}</ul>
    : <small>{empty}</small>}</div>;
}

function ExternalIntelligence({ report, researching, error, onResearch }) {
  return <section className="tdg-crm-web-intelligence">
    <header><div><strong>Inteligência externa</strong><small>{formatCheckedAt(report?.checkedAt)}</small></div><button type="button" onClick={() => onResearch?.("company")} disabled={researching}><RefreshCw size={14} className={researching ? "spin" : ""} />{researching ? "Pesquisando..." : report ? "Atualizar web" : "Pesquisar empresa"}</button></header>
    {error && <p className="tdg-crm-research-error">{error}</p>}
    {!report && !error && <p>A IA ainda não pesquisou esta empresa na web. A busca verifica site, LinkedIn, ESG, fornecedores, RFQs, procurement e notícias.</p>}
    {report && <>
      <div className="tdg-crm-research-identity">{report.officialWebsite && <a href={report.officialWebsite.url} target="_blank" rel="noreferrer">Site provável <ExternalLink size={13} /></a>}{report.linkedinCompany && <a href={report.linkedinCompany.url} target="_blank" rel="noreferrer">LinkedIn da empresa <ExternalLink size={13} /></a>}<b>ESG: {report.esg?.relevance || "A validar"}</b></div>
      <ResearchLinks title="RFQs de transporte abertas" items={report.openRfqs} empty="Nenhuma RFQ acionável comprovada nesta pesquisa." />
      <ResearchLinks title="Cadastro de fornecedores" items={report.supplierLinks} empty="Nenhum portal oficial identificado." />
      <ResearchLinks title="Procurement de Logística e Transportes no Brasil" items={report.procurementPeople} empty="Nenhum contato público passou pelos critérios de empresa, Brasil e escopo logístico." />
      <ResearchLinks title="LinkedIn dos contatos cadastrados" items={report.knownContactProfiles} empty="Nenhum LinkedIn adicional foi confirmado para os contatos já cadastrados." />
      {report.contactSearchQuality && <div className="tdg-crm-research-enrichment"><strong>Filtro de contatos: Brasil + Procurement logístico</strong><small>{report.contactSearchQuality.accepted || 0} aceito(s); {report.contactSearchQuality.foreignRejected || 0} de outros países, {report.contactSearchQuality.noBrazilEvidenceRejected || 0} sem evidência de Brasil e {report.contactSearchQuality.nonLogisticsRejected || 0} sem escopo logístico foram descartados.</small></div>}
      {report.suggestedSegment?.value && <div className="tdg-crm-research-enrichment"><strong>Segmento identificado: {report.suggestedSegment.value}</strong><small>Confiança {report.suggestedSegment.confidence}. {report.autoEnrichment?.segmentFilled ? "Preenchido automaticamente no CRM." : "O CRM já possuía um segmento e foi preservado."}</small></div>}
      {report.suggestedHeadquarters?.value && <div className="tdg-crm-research-enrichment"><strong>Operação brasileira identificada: {report.suggestedHeadquarters.value}</strong><small>Confiança {report.suggestedHeadquarters.confidence}. {report.autoEnrichment?.headquartersFilled ? "Preenchida automaticamente na conta." : "A conta já possuía uma sede e foi preservada."}</small></div>}
      {report.autoEnrichment?.contactsAdded > 0 && <div className="tdg-crm-research-enrichment"><strong>{report.autoEnrichment.contactsAdded} contato(s) público(s) incluído(s)</strong><small>Vínculo e cargo ficam marcados para confirmação antes da abordagem.</small></div>}
      {report.autoEnrichment?.contactsUpdated > 0 && <div className="tdg-crm-research-enrichment"><strong>{report.autoEnrichment.contactsUpdated} contato(s) cadastrado(s) complementado(s)</strong><small>Os dados existentes foram preservados e somente campos vazios receberam evidência pública.</small></div>}
      {(report.autoEnrichment?.websiteFilled || report.autoEnrichment?.linkedinFilled) && <div className="tdg-crm-research-enrichment"><strong>Dados institucionais preenchidos</strong><small>{[report.autoEnrichment.websiteFilled && "site", report.autoEnrichment.linkedinFilled && "LinkedIn da empresa"].filter(Boolean).join(" e ")} vinculados à conta.</small></div>}
      {(report.autoEnrichment?.websiteCorrected || report.autoEnrichment?.invalidWebsiteRemoved) && <div className="tdg-crm-research-enrichment"><strong>{report.autoEnrichment.websiteCorrected ? "Site oficial corrigido" : "Site incorreto removido"}</strong><small>{report.autoEnrichment.websiteCorrected ? "O endereço anterior era de uma fonte externa e foi substituído pelo domínio da própria empresa." : "O endereço anterior era de uma fonte externa e nenhuma página oficial segura foi encontrada para substituí-lo."}</small></div>}
      {report.autoEnrichment?.legacyContactsRemoved > 0 && <div className="tdg-crm-research-enrichment"><strong>{report.autoEnrichment.legacyContactsRemoved} contato(s) antigo(s) descartado(s)</strong><small>Resultados web sem comprovação de atuação no Brasil foram removidos da conta.</small></div>}
      <ResearchLinks title="Sinais ESG" items={report.esg?.signals} empty="Nenhuma evidência pública suficiente." />
      <ResearchLinks title="Notícias da empresa" items={report.companyNews} empty="Nenhuma notícia relevante encontrada." />
      <ResearchLinks title="Notícias e tendências do segmento" items={report.segmentNews} empty="Nenhuma notícia setorial relevante encontrada." />
      <div className="tdg-crm-research-next"><span>Próximas ações sugeridas</span>{report.nextActions?.map((item) => <strong key={item}>{item}</strong>)}</div>
      <small className="tdg-crm-research-note">{report.disclaimer}</small>
    </>}
  </section>;
}

function ClientTaskModal({ client, suggestion, currentUserId, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: suggestion || `Próxima ação comercial · ${client.name}`,
    description: `Conta vinculada: ${client.name}`,
    priority: "Alta",
    due: "",
  });
  const [saving, setSaving] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await onCreate?.({
        id: crypto.randomUUID(), title: form.title.trim(), description: form.description.trim(),
        priority: form.priority, status: "A fazer", due: form.due, area: "Comercial",
        assigneeType: "real", assignee: "", assigneeId: currentUserId || "", project: "",
        isMission: false, distribution: "atribuida", difficulty: "Simples", slots: "1",
        points: "", reward: "", approvalMode: "imediata", allowWithdrawal: true,
        assignees: [], interested: [], missionStatus: "", deliveries: [], attachments: [],
        visibility: "privado", sharedWith: [], sharedTeams: [], subtasks: [], dependsOn: [],
        recurrence: { frequency: "none" }, ownerId: currentUserId || null,
        clientId: client.id, clientName: client.name, source: "todogreen-crm",
        createdAt: new Date().toISOString(),
      });
      onClose();
    } finally { setSaving(false); }
  };
  return <Modal title={`Nova tarefa · ${client.name}`} onClose={onClose}>
    <form className="tdg-crm-task-form" onSubmit={save}>
      <label><span>Tarefa</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label><span>Orientação</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <div><label><span>Prioridade</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label><span>Prazo</span><input type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} /></label></div>
      <footer><button type="button" onClick={onClose}>Cancelar</button><button className="tdg-action" type="submit" disabled={saving}>{saving ? "Criando..." : "Criar tarefa"}</button></footer>
    </form>
  </Modal>;
}

const roleLabel = (role) => ({ cliente_admin: "Administrador do cliente", cliente_gestor: "Gestor do cliente", cliente_leitor: "Leitor" })[role] || role;

function ClientPortalPreview({ client, authHeaders, open, onClose }) {
  const [role, setRole] = useState("cliente_gestor");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || !client?.id) return undefined;
    let active = true; setLoading(true); setError("");
    api(`client-portal-preview/${encodeURIComponent(client.id)}?role=${encodeURIComponent(role)}`, authHeaders)
      .then((data) => { if (active) setPreview(data); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authHeaders, client?.id, open, role]);
  if (!open) return null;
  const summary = preview?.summary;
  return <section className="tdg-crm-portal-preview" aria-label="Prévia do portal do cliente">
    <header><div><span>VISUALIZAÇÃO ADMINISTRATIVA</span><h3>O que {client.name} vê no portal</h3><p>Prévia somente leitura. Nenhuma ação é registrada como se tivesse sido feita pelo cliente.</p></div><button type="button" onClick={onClose}><X size={15} />Fechar prévia</button></header>
    <div className="tdg-crm-portal-bar"><strong className={preview?.portal?.enabled ? "enabled" : "disabled"}>{preview?.portal?.enabled ? "Portal liberado" : "Portal ainda bloqueado"}</strong><label><span>Visualizar como</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="cliente_admin">Administrador do cliente</option><option value="cliente_gestor">Gestor do cliente</option><option value="cliente_leitor">Leitor</option></select></label><small>{preview?.users?.length || 0} acesso(s) ativo(s)</small></div>
    {loading && <p>Montando a visão do cliente...</p>}{error && <p className="tdg-crm-research-error">{error}</p>}
    {!loading && preview && <>
      <nav>{preview.portal.menu.map((item) => <span key={item.id}>{item.label}</span>)}</nav>
      <div className="tdg-crm-portal-metrics"><article><small>Operações</small><strong>{summary?.operacoes?.total || 0}</strong></article><article><small>Entregas</small><strong>{summary?.operacoes?.entregas || 0}</strong></article><article><small>CO₂ evitado</small><strong>{Number(summary?.ambiental?.co2EvitadoKg || 0).toLocaleString("pt-BR")} kg</strong></article><article><small>Green Score</small><strong>{summary?.greenScore?.valor ?? "Sem cálculo"}</strong></article></div>
      <div className="tdg-crm-portal-content"><section><header><strong>Operações recentes</strong><small>{preview.counts.operations} registro(s)</small></header>{preview.recentOperations.length ? preview.recentOperations.map((item) => <article key={item.id}><span><b>{item.reference || "Sem referência"}</b><small>{item.origin || "Origem não informada"} → {item.destination || "Destino não informado"}</small></span><strong>{item.status || "Sem status"}</strong></article>) : <p>Nenhuma operação disponível para o cliente.</p>}</section><section><header><strong>Serviços do portal</strong></header><dl><div><dt>Documentos</dt><dd>{preview.counts.documents}</dd></div><div><dt>Solicitações</dt><dd>{preview.counts.requests}</dd></div><div><dt>Papel simulado</dt><dd>{roleLabel(preview.portal.role)}</dd></div></dl>{preview.users.length > 0 && <div className="tdg-crm-portal-users"><small>Usuários liberados</small>{preview.users.map((user) => <span key={user.email}>{user.email} · {roleLabel(user.role)}</span>)}</div>}</section></div>
    </>}
  </section>;
}

function ContactCard({ contact, clientName }) {
  const details = [...new Set([contact.title, contact.department, contact.specialty, contact.country, contact.relationshipRole].filter(Boolean))];
  const whatsapp = whatsappUrl(contact.phone);
  return <article>
    <div><b>{contact.name}</b><small>{details.join(" · ") || "Função ainda não informada"}</small>{contact.source && <em className="tdg-crm-contact-source">{contact.source} · confirmar vínculo</em>}{contact.validation && <em className="tdg-crm-contact-source">{contact.validation}</em>}</div>
    <div className="tdg-crm-contact-channels">{contact.email && <a href={`mailto:${contact.email}`}><Mail size={13} />{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}</div>
    <div className="tdg-crm-contact-actions">{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp</a>}{contact.email && <><a href={gmailComposeUrl(contact.email, `To Do Green · ${clientName}`)} target="_blank" rel="noreferrer">Gmail</a><a href={outlookComposeUrl(contact.email, `To Do Green · ${clientName}`)} target="_blank" rel="noreferrer">Outlook</a></>}{contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />LinkedIn</a>}</div>
  </article>;
}

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
    website: crm.website || "",
    linkedinUrl: crm.linkedinUrl || "",
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
  const [contact, setContact] = useState({ name: "", title: "", email: "", phone: "", linkedinUrl: "", relationshipRole: "Influenciador" });
  const [saving, setSaving] = useState(false);
  const field = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const addContact = () => {
    if (!contact.name.trim()) return;
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, { ...contact, id: crypto.randomUUID(), active: true }],
    }));
    setContact({ name: "", title: "", email: "", phone: "", linkedinUrl: "", relationshipRole: "Influenciador" });
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
          website: form.website,
          linkedinUrl: form.linkedinUrl,
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
            <label><span>Site da empresa</span><input type="url" placeholder="https://empresa.com.br" value={form.website} onChange={field("website")} /></label>
            <label><span>LinkedIn da empresa</span><input type="url" placeholder="https://linkedin.com/company/..." value={form.linkedinUrl} onChange={field("linkedinUrl")} /></label>
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
            <input aria-label="LinkedIn do contato" type="url" placeholder="https://linkedin.com/in/..." value={contact.linkedinUrl} onChange={(event) => setContact({ ...contact, linkedinUrl: event.target.value })} />
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

const clientIdFromLocation = () => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("client") || "";

export default function ClientsPage({ authHeaders, opportunities = [], onNavigate, setToast, onCreateTask, currentUserId, onClientContextChange }) {
  const [clients, setClients] = useState([]);
  const [access, setAccess] = useState({ podeGerenciar: false, podeEditar: true, somenteCarteira: true });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "cards";
    return window.localStorage.getItem("todogreen-crm-view") === "table" ? "table" : "cards";
  });
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(clientIdFromLocation);
  const [editingId, setEditingId] = useState("");
  const [taskClientId, setTaskClientId] = useState("");
  const [portalPreviewOpen, setPortalPreviewOpen] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchReports, setResearchReports] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [clientForm, setClientForm] = useState({ nome: "", documento: "", segmento: "", tier: "Enterprise", stage: "Mapeamento" });
  const [assignment, setAssignment] = useState({ clientId: "", sellerEmail: "", note: "" });
  const [importProgress, setImportProgress] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await api("clients", authHeaders);
      const loaded = data.clientes || [];
      setClients(loaded); setAccess(data.acesso || access);
      setSelectedId((current) => loaded.some((item) => item.id === current)
        ? current
        : loaded.some((item) => item.id === clientIdFromLocation()) ? clientIdFromLocation() : "");
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => { setSelectedId(clientIdFromLocation()); setPortalPreviewOpen(false); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("todogreen-crm-view", viewMode);
  }, [viewMode]);

  const accounts = useMemo(() => clients.map(accountFromClient), [clients]);
  const crmOpportunities = useMemo(() => opportunities.map(opportunityForCrm), [opportunities]);
  const command = useMemo(() => buildCrmCommandCenter(accounts, crmOpportunities), [accounts, crmOpportunities]);
  const summaryById = useMemo(() => new Map(command.accounts.map((item) => [item.id, item])), [command]);
  const stageOptions = useMemo(() => [...new Set(clients.map((client) => client.crm?.stage).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [clients]);
  const ownerOptions = useMemo(() => [...new Set(clients.flatMap((client) => (client.vendedores || []).map((seller) => seller.email)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [clients]);
  const visible = useMemo(() => clients.filter((client) => {
    const summary = summaryById.get(client.id);
    const contactText = (client.crm?.contacts || []).map((contact) => `${contact.name || ""} ${contact.title || ""} ${contact.department || ""} ${contact.email || ""} ${contact.phone || ""}`).join(" ");
    const ownerText = (client.vendedores || []).map((seller) => seller.email).join(" ");
    const matchesQuery = `${client.name} ${client.legalName || ""} ${client.document || ""} ${client.segment || ""} ${client.crm?.stage || ""} ${contactText} ${ownerText}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || summary?.attention === filter || (filter === "no-decision" && summary?.coverage < 60);
    const matchesTemperature = temperatureFilter === "all" || client.crm?.temperature === temperatureFilter;
    const hasContact = (client.crm?.contacts || []).some((contact) => contact.active !== false && (contact.email || contact.phone));
    const matchesContact = contactFilter === "all" || (contactFilter === "with" ? hasContact : !hasContact);
    const matchesStage = stageFilter === "all" || client.crm?.stage === stageFilter;
    const matchesOwner = ownerFilter === "all" || (ownerFilter === "unassigned"
      ? !(client.vendedores || []).length
      : (client.vendedores || []).some((seller) => seller.email === ownerFilter));
    return matchesQuery && matchesFilter && matchesTemperature && matchesContact && matchesStage && matchesOwner;
  }).sort((a, b) => {
    if (sortBy === "name-desc") return String(b.name).localeCompare(String(a.name), "pt-BR", { sensitivity: "base" });
    if (sortBy === "temperature") {
      const rank = { Quente: 0, Morno: 1, Frio: 2 };
      return (rank[a.crm?.temperature] ?? 3) - (rank[b.crm?.temperature] ?? 3) || String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" });
    }
    if (sortBy === "next-action") return String(a.crm?.nextActionAt || "9999").localeCompare(String(b.crm?.nextActionAt || "9999")) || String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" });
    if (sortBy === "updated") return String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" });
    if (sortBy === "contacts") return (b.crm?.contacts?.length || 0) - (a.crm?.contacts?.length || 0) || String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" });
    return String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" });
  }), [clients, contactFilter, filter, ownerFilter, query, sortBy, stageFilter, summaryById, temperatureFilter]);
  const renderedClients = visible.slice(0, visibleLimit);
  const selected = clients.find((client) => client.id === selectedId) || null;
  const selectedAccount = useMemo(() => selected ? accountFromClient(selected) : null, [selected]);
  const selectedOpportunities = selected ? crmOpportunities.filter((item) => item.clientId === selected.id) : [];
  const selectedSummary = selectedAccount ? crmAccountSummary(selectedAccount, selectedAccount.contacts, crmOpportunities) : null;
  const selectedIntelligence = selected && selectedAccount
    ? assessAccount({ ...selected, crm: { ...(selected.crm || {}), contacts: selectedAccount.contacts } })
    : null;
  const selectedReportCandidate = selected ? researchReports[selected.id] || selected.crm?.intelligence || null : null;
  const selectedReport = Number(selectedReportCandidate?.version || 0) >= 5 ? selectedReportCandidate : null;
  const logisticsProcurementNames = selectedIntelligence
    ? [...new Set(selectedIntelligence.logisticsProcurementContacts.map((item) => item.name).filter(Boolean))]
    : [];
  const procurementNames = selectedIntelligence
    ? [...new Set(selectedIntelligence.procurementContacts.map((item) => item.name).filter(Boolean))]
    : [];
  const procurementSummary = logisticsProcurementNames.length
    ? logisticsProcurementNames.join(", ")
    : procurementNames.length
      ? `${procurementNames.join(", ")} (Compras cadastrado; escopo logístico a confirmar)`
      : selectedAccount?.contacts.length
        ? `${selectedAccount.contacts.length} contato(s) cadastrado(s); nenhum de Procurement logístico confirmado.`
        : "Nenhum contato cadastrado.";

  useEffect(() => {
    if (!onClientContextChange) return;
    if (!selected) { onClientContextChange(null); return; }
    onClientContextChange({
      id: selected.id,
      nome: selected.name,
      segmento: selected.segment || "",
      temperatura: selected.crm?.temperature || "",
      etapa: selected.crm?.stage || "",
      proximaAcao: selectedIntelligence?.nextTask || selected.crm?.nextAction || "",
      pesquisaExterna: selectedReport ? {
        consultadaEm: selectedReport.checkedAt,
        relevanciaEsg: selectedReport.esg?.relevance || "A validar",
        contatosProcurementLogistico: selectedReport.procurementPeople?.map((item) => ({ titulo: item.title, url: item.url })) || [],
        fontes: [selectedReport.officialWebsite, selectedReport.linkedinCompany, ...(selectedReport.companyNews || [])].filter(Boolean).slice(0, 8),
      } : null,
      contatos: selectedAccount.contacts.slice(0, 20).map((contact) => ({
        nome: contact.name, cargo: contact.title, area: contact.department,
        email: contact.email, telefone: contact.phone, linkedin: contact.linkedinUrl,
        validacao: contact.validation,
      })),
    });
  }, [onClientContextChange, selected, selectedAccount, selectedIntelligence, selectedReport]);
  useEffect(() => () => onClientContextChange?.(null), [onClientContextChange]);

  const openClient = (clientId) => {
    setSelectedId(clientId); setPortalPreviewOpen(false); setResearchError("");
    onNavigate?.(`/todogreen/clientes?client=${encodeURIComponent(clientId)}`);
  };
  const closeClient = () => {
    setSelectedId(""); setPortalPreviewOpen(false); setResearchError("");
    onNavigate?.("/todogreen/clientes");
  };
  const researchSelected = async (focus = "company") => {
    if (!selected) return;
    setResearching(true); setResearchError("");
    try {
      const data = await api(`client-intelligence/${encodeURIComponent(selected.id)}`, authHeaders, {
        method: "POST", body: JSON.stringify({ force: true, focus }),
      });
      setResearchReports((current) => ({ ...current, [selected.id]: data.intelligence || null }));
      if (data.client?.id) setClients((current) => current.map((client) => client.id === data.client.id ? {
        ...client,
        segment: data.client.segment ?? client.segment,
        revision: data.client.revision ?? client.revision,
        updatedAt: data.client.updatedAt ?? client.updatedAt,
        crm: { ...(client.crm || {}), ...(data.client.crm || {}) },
      } : client));
      await load();
      const additions = data.enrichment?.contactsAdded ? ` ${data.enrichment.contactsAdded} contato(s) incluído(s).` : "";
      const updates = data.enrichment?.contactsUpdated ? ` ${data.enrichment.contactsUpdated} contato(s) complementado(s).` : "";
      const segment = data.enrichment?.segmentFilled ? " Segmento preenchido." : "";
      const institutional = data.enrichment?.websiteFilled || data.enrichment?.linkedinFilled ? " Site ou LinkedIn institucional preenchido." : "";
      const correctedWebsite = data.enrichment?.websiteCorrected ? " Site oficial corrigido." : data.enrichment?.invalidWebsiteRemoved ? " Site incorreto removido." : "";
      const headquarters = data.enrichment?.headquartersFilled ? " Operação brasileira preenchida." : "";
      const removed = data.enrichment?.legacyContactsRemoved ? ` ${data.enrichment.legacyContactsRemoved} contato(s) web sem comprovação brasileira removido(s).` : "";
      setToast?.(`${focus === "contacts" ? "Contatos de Procurement logístico no Brasil pesquisados." : "Empresa pesquisada e ficha atualizada."}${segment}${institutional}${correctedWebsite}${headquarters}${additions}${updates}${removed}`);
    } catch (reason) { setResearchError(reason.message); }
    finally { setResearching(false); }
  };
  const createTask = async (task) => {
    if (!onCreateTask) throw new Error("Não foi possível conectar a tarefa ao workspace.");
    await onCreateTask(task); setToast?.("Tarefa criada e vinculada ao cliente.");
  };
  const completeSuggestedAction = async () => {
    if (!selected || !selectedIntelligence?.nextTaskKey) return;
    const completed = [...new Set([
      ...(selected.crm?.completedSuggestedActions || []),
      selectedIntelligence.nextTaskKey,
    ])];
    try {
      await api(`clients/${encodeURIComponent(selected.id)}`, authHeaders, {
        method: "PATCH",
        body: JSON.stringify({
          revision: selected.revision,
          crm: { ...selected.crm, completedSuggestedActions: completed },
        }),
      });
      setToast?.("Ação concluída. A IA selecionou o próximo passo da conta.");
      await load();
    } catch (reason) {
      setError(reason.message);
    }
  };

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

  return <section className="tdg-panel tdg-page tdg-clients-page">
    {error && <div className="tdg-page-error">{error}</div>}
    {!selected && <>
      <header className="tdg-page-title"><div><span>COMANDO COMERCIAL</span><h2>CRM e carteira 360º</h2><p>Priorize contas, acompanhe relacionamentos, forecast e próximas ações. Clique em uma conta para abrir sua visão gerencial.</p></div>{access.podeGerenciar && <div className="tdg-crm-admin-actions"><label className="tdg-action tdg-crm-import"><Upload size={16} />{importProgress || "Importar base"}<input type="file" accept="application/json,.json" disabled={Boolean(importProgress)} onChange={importClients} /></label><button className="tdg-action" type="button" onClick={() => setShowCreate((value) => !value)}><Plus size={16} />Nova conta</button></div>}</header>
      <div className="tdg-crm-metrics" aria-label="Resumo do CRM"><article><Building2 size={18} /><span>Contas na carteira</span><strong>{command.totalAccounts}</strong></article><article><BriefcaseBusiness size={18} /><span>Oportunidades abertas</span><strong>{command.openOpportunities}</strong></article><article><CircleDollarSign size={18} /><span>Forecast ponderado</span><strong>{BRL.format(command.weightedPipeline)}</strong><small>{BRL.format(command.totalPipeline)} em pipeline</small></article><article className={command.overdueActions ? "attention" : ""}><CalendarClock size={18} /><span>Ações atrasadas</span><strong>{command.overdueActions}</strong></article><article className={command.relationshipGaps ? "attention" : ""}><Users size={18} /><span>Mapa incompleto</span><strong>{command.relationshipGaps}</strong></article></div>
      {showCreate && <form className="tdg-client-admin-form" onSubmit={createClient}><strong>Nova conta</strong><div className="tdg-form-row"><label><span>Nome</span><input required value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })} /></label><label><span>Documento</span><input value={clientForm.documento} onChange={(e) => setClientForm({ ...clientForm, documento: e.target.value })} /></label><label><span>Segmento</span><input value={clientForm.segmento} onChange={(e) => setClientForm({ ...clientForm, segmento: e.target.value })} /></label><label><span>Classificação</span><select value={clientForm.tier} onChange={(e) => setClientForm({ ...clientForm, tier: e.target.value })}>{TODO_GREEN_ACCOUNT_TIERS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Momento</span><select value={clientForm.stage} onChange={(e) => setClientForm({ ...clientForm, stage: e.target.value })}>{TODO_GREEN_ACCOUNT_STAGES.map((item) => <option key={item}>{item}</option>)}</select></label></div><button className="tdg-action"><Plus size={16} />Cadastrar conta</button></form>}
      <div className="tdg-crm-toolbar"><div className="tdg-client-toolbar"><Search size={18} /><input aria-label="Buscar clientes e contatos" placeholder="Buscar conta, contato, e-mail, telefone ou responsável" value={query} onChange={(e) => { setQuery(e.target.value); setVisibleLimit(100); }} /></div><div className="tdg-crm-view-switch" aria-label="Modo de visualização"><button type="button" className={viewMode === "cards" ? "active" : ""} onClick={() => setViewMode("cards")}><LayoutGrid size={15} />Cartões</button><button type="button" className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}><List size={15} />Tabela</button></div><div className="tdg-crm-filter-grid" aria-label="Filtros e ordenação do CRM"><label><span>Ordenar</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name-asc">Nome (A–Z)</option><option value="name-desc">Nome (Z–A)</option><option value="temperature">Temperatura</option><option value="next-action">Próxima ação</option><option value="updated">Atualização recente</option><option value="contacts">Mais contatos</option></select></label><label><span>Etapa</span><select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option value="all">Todas as etapas</option>{stageOptions.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label><span>Responsável</span><select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}><option value="all">Todos</option><option value="unassigned">Sem responsável</option>{ownerOptions.map((owner) => <option key={owner}>{owner}</option>)}</select></label><label><span>Contatos</span><select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}><option value="all">Com e sem contato</option><option value="with">Com telefone/e-mail</option><option value="without">Sem telefone/e-mail</option></select></label></div><div className="tdg-crm-filters" aria-label="Temperatura das contas">{[["all", "Todas"], ["Quente", "Quentes"], ["Morno", "Mornas"], ["Frio", "Frias"]].map(([id, label]) => <button type="button" className={temperatureFilter === id ? "active" : ""} onClick={() => { setTemperatureFilter(id); setVisibleLimit(100); }} key={id}>{label}</button>)}</div><div className="tdg-crm-filters" aria-label="Saúde da carteira">{[["all", "Toda saúde"], ["critical", "Críticas"], ["attention", "Atenção"], ["healthy", "Saudáveis"], ["no-decision", "Mapa incompleto"]].map(([id, label]) => <button type="button" className={filter === id ? "active" : ""} onClick={() => { setFilter(id); setVisibleLimit(100); }} key={id}>{label}</button>)}</div></div>
      {loading && <p>Carregando carteira...</p>}{!loading && visible.length === 0 && <p className="tdg-crm-empty">Nenhuma conta corresponde aos filtros desta carteira.</p>}
      {!loading && visible.length > 0 && viewMode === "cards" && <div className="tdg-crm-card-grid" aria-label="Contas do CRM em cartões">{renderedClients.map((client) => { const summary = summaryById.get(client.id); return <button type="button" className={summary?.attention || ""} onClick={() => openClient(client.id)} key={client.id}><header><span><strong>{client.name}</strong><small>{client.segment || "Segmento não informado"}</small></span><b>{summary?.score || 0}</b></header><div className="tdg-crm-card-tags"><em>{client.crm?.temperature || "Sem temperatura"}</em><em>{client.crm?.stage || "Mapeamento"}</em></div><dl><div><dt>Pipeline</dt><dd>{BRL.format(summary?.pipeline || 0)}</dd></div><div><dt>Decisores</dt><dd>{summary?.coverage || 0}%</dd></div><div><dt>Contatos</dt><dd>{client.crm?.contacts?.length || 0}</dd></div></dl><footer><span><small>Próxima ação</small><strong>{summary?.nextAction || "Definir próxima ação"}</strong></span><ArrowRight size={16} /></footer></button>; })}{visible.length > renderedClients.length && <button type="button" className="tdg-crm-card-load-more" onClick={() => setVisibleLimit((current) => current + 100)}>Mostrar mais 100 contas ({renderedClients.length} de {visible.length})</button>}</div>}
      {!loading && visible.length > 0 && viewMode === "table" && <div className="tdg-crm-table" role="table" aria-label="Contas do CRM"><div className="tdg-crm-table-head" role="row"><span>Conta</span><span>Saúde</span><span>Pipeline</span><span>Próxima ação</span></div>{renderedClients.map((client) => { const summary = summaryById.get(client.id); return <button type="button" role="row" className={summary?.attention || ""} onClick={() => openClient(client.id)} key={client.id}><span><strong>{client.name}</strong><small>{client.crm?.temperature ? `${client.crm.temperature} · ` : ""}{client.segment || "Segmento não informado"} · {client.crm?.stage || "Mapeamento"}</small></span><span><b>{summary?.score || 0}</b><small>{summary?.coverage || 0}% de cobertura</small></span><span><strong>{BRL.format(summary?.pipeline || 0)}</strong><small>{summary?.openOpportunities || 0} aberta(s)</small></span><span><strong>{summary?.nextAction || "Definir próxima ação"}</strong><small>{client.crm?.nextActionAt || "Sem prazo"}</small></span></button>; })}{visible.length > renderedClients.length && <button type="button" className="tdg-crm-load-more" onClick={() => setVisibleLimit((current) => current + 100)}>Mostrar mais 100 contas ({renderedClients.length} de {visible.length})</button>}</div>}
    </>}

    {selected && selectedSummary && <div className="tdg-crm-detail">
      <button className="tdg-crm-back" type="button" onClick={closeClient}><ArrowLeft size={16} />Voltar para a carteira</button>
      <header className="tdg-crm-detail-hero"><div><span>{selected.crm?.tier || "Enterprise"}{selected.crm?.temperature ? ` · ${selected.crm.temperature}` : ""}</span><h2>{selected.name}</h2><p>{selected.segment || "Segmento não informado"} · {selected.crm?.stage || "Mapeamento"}{selected.document ? ` · ${selected.document}` : ""}</p><small>{selected.crm?.source ? `Origem: ${selected.crm.source}` : "Conta da carteira To Do Green"}</small></div><div className="tdg-crm-detail-actions">{access.podeEditar && <button type="button" onClick={() => setEditingId(selected.id)}><Edit3 size={15} />Editar</button>}<button type="button" onClick={() => setTaskClientId(selected.id)}><ListPlus size={15} />Adicionar tarefa</button><button type="button" onClick={() => researchSelected("company")} disabled={researching}><Globe2 size={15} />Pesquisar empresa</button><button type="button" onClick={() => researchSelected("contacts")} disabled={researching}><UserSearch size={15} />Pesquisar contatos</button><button type="button" onClick={() => setPortalPreviewOpen(true)}><Eye size={15} />Ver como cliente</button><button type="button" onClick={() => onNavigate?.(`/todogreen/oportunidades?client=${encodeURIComponent(selected.id)}`)}>Pipeline <ArrowRight size={15} /></button></div></header>
      <div className="tdg-crm-detail-metrics"><article><small>Saúde da conta</small><strong>{selectedSummary.score}</strong><span>{selectedSummary.attention === "healthy" ? "Saudável" : selectedSummary.attention === "critical" ? "Crítica" : "Atenção"}</span></article><article><small>Cobertura de decisores</small><strong>{selectedSummary.coverage}%</strong><span>{selectedAccount.contacts.length} contato(s)</span></article><article><small>Pipeline da conta</small><strong>{BRL.format(selectedSummary.pipeline || 0)}</strong><span>{selectedSummary.openOpportunities || 0} oportunidade(s)</span></article><article><small>Portal do cliente</small><strong>{selected.portalEnabled ? "Liberado" : "Bloqueado"}</strong><span>{selected.portalUserCount || 0} acesso(s) ativo(s)</span></article></div>
      <section className="tdg-crm-next"><Target size={17} /><div><small>PRÓXIMA MELHOR AÇÃO</small><strong>{selectedIntelligence.nextTask}</strong></div><button type="button" onClick={() => setTaskClientId(selected.id)}>Transformar em tarefa</button><button type="button" onClick={completeSuggestedAction} disabled={!selectedIntelligence.nextTaskCanComplete}>Marcar feita e ver próxima</button></section>
      {portalPreviewOpen && <ClientPortalPreview client={selected} authHeaders={authHeaders} open onClose={() => setPortalPreviewOpen(false)} />}
      <div className="tdg-crm-detail-grid"><main>
        <section className="tdg-crm-intelligence"><header><strong>IA · mapa da empresa</strong><small>Leitura dos dados do CRM</small></header><div><span>Relevância ESG</span><strong>{selectedIntelligence.esgRelevance}</strong><small>{selectedIntelligence.esgReason}</small></div><div><span>Próxima tarefa sugerida</span><strong>{selectedIntelligence.nextTask}</strong></div><div><span>Procurement de Logística e Transportes</span><strong>{procurementSummary}</strong></div></section>
        <ExternalIntelligence report={selectedReport} researching={researching} error={researchError} onResearch={researchSelected} />
        <section className="tdg-crm-detail-section"><header><strong>Relacionamento</strong><small>{selectedAccount.contacts.length} contato(s)</small></header><div className="tdg-crm-roles">{selectedAccount.contacts.map((contact) => <ContactCard key={contact.id} contact={contact} clientName={selected.name} />)}{selectedAccount.contacts.length === 0 && <p>Nenhum decisor ou patrocinador mapeado.</p>}</div></section>
      </main><aside>
        {selectedSummary.alerts.length > 0 && <section className="tdg-crm-alerts"><strong><AlertTriangle size={15} />Pontos de atenção</strong>{selectedSummary.alerts.map((alert) => <span key={alert}>{alert}</span>)}</section>}
        <section className="tdg-crm-detail-section"><header><strong>Oportunidades</strong><button type="button" onClick={() => onNavigate?.(`/todogreen/oportunidades?client=${encodeURIComponent(selected.id)}`)}>Abrir pipeline <ArrowRight size={13} /></button></header>{selectedOpportunities.length === 0 ? <p>Nenhuma oportunidade ligada a esta conta.</p> : <div className="tdg-crm-opps">{selectedOpportunities.slice(0, 6).map((opp) => <article key={opp.id}><span><strong>{opp.stage}</strong><small>{opp.nextStep || "Próximo passo não definido"}</small></span><b>{BRL.format(opp.value || 0)}</b></article>)}</div>}</section>
        <section className="tdg-crm-detail-section"><header><strong>Responsáveis</strong></header><div className="tdg-client-sellers">{(selected.vendedores || []).length === 0 && <small>Sem responsável comercial</small>}{(selected.vendedores || []).map((seller) => <span key={seller.email}>{seller.email}{access.podeGerenciar && <button type="button" aria-label={`Remover ${seller.email}`} onClick={() => unassign(selected.id, seller.email)}><X size={12} /></button>}</span>)}</div>{access.podeGerenciar && <form className="tdg-crm-assign" onSubmit={assign}><input required type="email" aria-label="E-mail do vendedor" placeholder="vendedor@empresa.com" value={assignment.clientId === selected.id ? assignment.sellerEmail : ""} onChange={(e) => setAssignment({ clientId: selected.id, sellerEmail: e.target.value, note: "" })} /><button type="submit"><UserPlus size={14} />Atribuir</button></form>}</section>
        <section className="tdg-crm-detail-section"><header><strong>Dados da conta</strong></header><dl className="tdg-crm-account-data"><div><dt>Razão social</dt><dd>{selected.legalName || "Não informada"}</dd></div><div><dt>Sede</dt><dd>{selected.crm?.headquarters || "Não informada"}</dd></div><div><dt>Site</dt><dd>{selected.crm?.website ? <a href={selected.crm.website} target="_blank" rel="noreferrer">Abrir site <ExternalLink size={12} /></a> : "Não informado"}</dd></div><div><dt>LinkedIn</dt><dd>{selected.crm?.linkedinUrl ? <a href={selected.crm.linkedinUrl} target="_blank" rel="noreferrer">Abrir empresa <ExternalLink size={12} /></a> : "Não informado"}</dd></div><div><dt>Última atualização</dt><dd>{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString("pt-BR") : "Não informada"}</dd></div></dl></section>
      </aside></div>
    </div>}
    {editingId && <AccountEditor client={clients.find((item) => item.id === editingId)} onClose={() => setEditingId("")} onSave={(payload) => saveClient(clients.find((item) => item.id === editingId), payload)} />}
    {taskClientId && <ClientTaskModal client={clients.find((item) => item.id === taskClientId)} suggestion={selectedIntelligence?.nextTask} currentUserId={currentUserId} onClose={() => setTaskClientId("")} onCreate={createTask} />}
  </section>;
}
