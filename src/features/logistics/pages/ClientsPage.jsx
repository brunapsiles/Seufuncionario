import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, X } from "lucide-react";
import "./TodoGreenPages.css";

const api = async (path, authHeaders, options = {}) => {
  const result = await fetch(`/api/todogreen/${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(authHeaders?.() || {}), ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload.error || "Não foi possível concluir a ação.");
  return payload;
};

export default function ClientsPage({ authHeaders, setToast }) {
  const [clients, setClients] = useState([]);
  const [access, setAccess] = useState({ podeGerenciar: false, somenteCarteira: true });
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [clientForm, setClientForm] = useState({ nome: "", documento: "", segmento: "" });
  const [assignment, setAssignment] = useState({ clientId: "", sellerEmail: "", note: "" });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await api("clients", authHeaders);
      setClients(data.clientes || []); setAccess(data.acesso || access);
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => clients.filter((client) =>
    `${client.name} ${client.document || ""} ${client.segment || ""}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  const createClient = async (event) => {
    event.preventDefault(); setError("");
    try {
      await api("clients", authHeaders, { method: "POST", body: JSON.stringify(clientForm) });
      setClientForm({ nome: "", documento: "", segmento: "" }); setToast?.("Cliente cadastrado."); await load();
    } catch (reason) { setError(reason.message); }
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
      await api(`client-assignments?clientId=${encodeURIComponent(clientId)}&sellerEmail=${encodeURIComponent(sellerEmail)}`,
        authHeaders, { method: "DELETE" });
      await load();
    } catch (reason) { setError(reason.message); }
  };

  return (
    <section className="tdg-panel tdg-page tdg-clients-page">
      <header className="tdg-page-title"><div><span>CARTEIRA COMERCIAL</span><h2>{access.somenteCarteira ? "Meus clientes" : "Clientes e responsáveis"}</h2><p>{access.somenteCarteira ? "Você visualiza somente os clientes atribuídos à sua carteira." : "Defina quem acompanha cada cliente. Vendedores não acessam carteiras de outras pessoas."}</p></div></header>
      {error && <div className="tdg-page-error">{error}</div>}
      {access.podeGerenciar && <>
        <form className="tdg-client-admin-form" onSubmit={createClient}>
          <strong>Novo cliente</strong><div className="tdg-form-row"><label><span>Nome</span><input required value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })} /></label><label><span>Documento</span><input value={clientForm.documento} onChange={(e) => setClientForm({ ...clientForm, documento: e.target.value })} /></label><label><span>Segmento</span><input value={clientForm.segmento} onChange={(e) => setClientForm({ ...clientForm, segmento: e.target.value })} /></label></div><button className="tdg-action"><Plus size={16} />Cadastrar cliente</button>
        </form>
        <form className="tdg-client-admin-form" onSubmit={assign}>
          <strong>Definir responsável comercial</strong><div className="tdg-form-row"><label><span>Cliente</span><select required value={assignment.clientId} onChange={(e) => setAssignment({ ...assignment, clientId: e.target.value })}><option value="">Selecione</option>{clients.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>E-mail do vendedor</span><input required type="email" value={assignment.sellerEmail} onChange={(e) => setAssignment({ ...assignment, sellerEmail: e.target.value })} /></label><label><span>Observação</span><input value={assignment.note} onChange={(e) => setAssignment({ ...assignment, note: e.target.value })} /></label></div><button className="tdg-action"><UserPlus size={16} />Atribuir cliente</button>
        </form>
      </>}
      <div className="tdg-client-toolbar"><Search size={18} /><input aria-label="Buscar clientes" placeholder="Buscar cliente" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      {loading && <p>Carregando clientes...</p>}
      {!loading && visible.length === 0 && <p>Nenhum cliente disponível para esta carteira.</p>}
      <div className="tdg-client-grid">{visible.map((client) => <article className="tdg-client-card" key={client.id}><header><div><strong>{client.name}</strong><p>{client.segment || "Segmento não informado"}</p></div><span>{client.status}</span></header><p>{client.document || "Documento não informado"}</p><div className="tdg-client-sellers">{(client.vendedores || []).length === 0 && <small>Sem responsável comercial</small>}{(client.vendedores || []).map((seller) => <span key={seller.email}>{seller.email}{access.podeGerenciar && <button type="button" aria-label={`Remover ${seller.email}`} onClick={() => unassign(client.id, seller.email)}><X size={12} /></button>}</span>)}</div></article>)}</div>
    </section>
  );
}
