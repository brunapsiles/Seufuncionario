import { useMemo, useState } from "react";
import {
  Building2,
  ExternalLink,
  FileSearch,
  Globe2,
  Mail,
  Newspaper,
  Phone,
  Search,
  UserRoundSearch,
} from "lucide-react";
import { buildTodoGreenWorkspaceIntelligence } from "./todoGreenWorkspaceDomain.js";

const formatDate = (value) => {
  if (!value) return "Data da pesquisa não registrada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data da pesquisa não registrada" : `Pesquisa atualizada em ${date.toLocaleDateString("pt-BR")}`;
};

const host = (value) => {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return "fonte externa"; }
};

function EmptyIntelligence({ type, onNavigate }) {
  const copy = type === "contacts"
    ? ["Nenhum contato disponível", "Os contatos aparecem aqui quando são registrados no CRM ou confirmados pela pesquisa da conta."]
    : ["Nenhuma fonte disponível", "As notícias, RFQs e páginas de fornecedores aparecem depois que uma conta é pesquisada no CRM."];
  return <div className="tdg-intelligence-empty">
    <FileSearch size={24} />
    <strong>{copy[0]}</strong>
    <span>{copy[1]}</span>
    <button type="button" onClick={() => onNavigate?.("/todogreen/clientes")}>Abrir CRM</button>
  </div>;
}

function SourceList({ items, empty, onNavigate }) {
  if (!items.length) return <EmptyIntelligence type={empty} onNavigate={onNavigate} />;
  return <div className="tdg-intelligence-source-list">
    {items.map((item) => <article key={`${item.kind}-${item.url}`}>
      <div className="tdg-intelligence-source-icon">{item.kind === "rfq" ? <FileSearch size={19} /> : item.kind === "supplier" ? <Building2 size={19} /> : <Newspaper size={19} />}</div>
      <div>
        <span>{item.clientName} · {item.kind === "segment" ? "Setor" : item.kind === "company" ? "Empresa" : item.kind === "rfq" ? "RFQ" : "Fornecedores"}</span>
        <a href={item.url} target="_blank" rel="noreferrer">{item.title || host(item.url)} <ExternalLink size={13} /></a>
        {item.snippet && <p>{item.snippet}</p>}
        <small>{formatDate(item.checkedAt)} · {host(item.url)}</small>
      </div>
      <button type="button" onClick={() => onNavigate?.(`/todogreen/clientes?client=${encodeURIComponent(item.clientId)}`)}>Abrir conta</button>
    </article>)}
  </div>;
}

function Contacts({ items, onNavigate }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.name || ""} ${item.title || ""} ${item.department || ""} ${item.clientName || ""} ${item.email || ""} ${item.phone || ""}`.toLowerCase().includes(term));
  }, [items, query]);

  return <section className="tdg-intelligence-contacts">
    <header className="tdg-intelligence-hero">
      <div><span className="tdg-kicker">CRM REAL</span><h2>Contatos e decisores</h2><p>Somente contatos ativos da carteira acessível. Resultado web só entra quando há vínculo atual, Brasil e fonte comprovada.</p></div>
      <button type="button" className="tdg-action" onClick={() => onNavigate?.("/todogreen/clientes")}><UserRoundSearch size={16} />Abrir CRM completo</button>
    </header>
    <label className="tdg-intelligence-search"><Search size={17} /><input aria-label="Buscar contatos do espaço" placeholder="Buscar pessoa, empresa, cargo, e-mail ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {!visible.length ? <EmptyIntelligence type="contacts" onNavigate={onNavigate} /> : <div className="tdg-intelligence-contact-grid">
      {visible.map((contact, index) => <article key={contact.id || `${contact.clientId}-${contact.email || contact.name}-${index}`}>
        <header><div className="tdg-intelligence-avatar">{String(contact.name || "?").trim().charAt(0).toUpperCase()}</div><span><strong>{contact.name}</strong><small>{contact.title || contact.department || "Cargo não informado"}</small></span></header>
        <button type="button" className="tdg-intelligence-account" onClick={() => onNavigate?.(`/todogreen/clientes?client=${encodeURIComponent(contact.clientId)}`)}><Building2 size={14} />{contact.clientName}</button>
        <div className="tdg-intelligence-contact-links">
          {contact.email && <a href={`mailto:${contact.email}`}><Mail size={14} />{contact.email}</a>}
          {contact.phone && <a href={`tel:${String(contact.phone).replace(/[^+\d]/g, "")}`}><Phone size={14} />{contact.phone}</a>}
          {contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />LinkedIn</a>}
          {!contact.email && !contact.phone && !contact.linkedinUrl && <small>Nenhum canal registrado</small>}
        </div>
      </article>)}
    </div>}
  </section>;
}

export default function TodoGreenIntelligenceHub({ verticalData = {}, initialView = "news", onNavigate }) {
  const intelligence = useMemo(
    () => buildTodoGreenWorkspaceIntelligence({ clients: verticalData.clients }),
    [verticalData.clients],
  );
  const [view, setView] = useState(initialView);

  if (initialView === "contacts") return <Contacts items={intelligence.contacts} onNavigate={onNavigate} />;

  const options = [
    ["news", "Notícias", intelligence.news.length],
    ["rfqs", "RFQs", intelligence.rfqs.length],
    ["suppliers", "Portais de fornecedores", intelligence.supplierLinks.length],
  ];

  return <section className="tdg-intelligence">
    <header className="tdg-intelligence-hero">
      <div><span className="tdg-kicker">INTELIGÊNCIA COM FONTE</span><h2>Notícias, RFQs e mercado</h2><p>Um painel único com as fontes já encontradas nas pesquisas das contas. Nada é inventado e cada item abre a origem e o cliente relacionado.</p></div>
      <button type="button" className="tdg-action" onClick={() => onNavigate?.("/todogreen/clientes")}><Globe2 size={16} />Pesquisar uma conta</button>
    </header>
    <nav className="tdg-intelligence-tabs" aria-label="Visões de inteligência">
      {options.map(([id, label, count]) => <button type="button" className={view === id ? "active" : ""} onClick={() => setView(id)} key={id}>{label}<b>{count}</b></button>)}
    </nav>
    {view === "news" && <SourceList items={intelligence.news} empty="news" onNavigate={onNavigate} />}
    {view === "rfqs" && <SourceList items={intelligence.rfqs} empty="rfqs" onNavigate={onNavigate} />}
    {view === "suppliers" && <SourceList items={intelligence.supplierLinks} empty="suppliers" onNavigate={onNavigate} />}
  </section>;
}
