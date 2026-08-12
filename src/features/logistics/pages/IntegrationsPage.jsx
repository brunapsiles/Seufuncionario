import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, RefreshCw, Search, Workflow, Zap } from "lucide-react";
import "./TodoGreenPages.css";

const ProviderList = ({ title, icon: Icon, items = [], testing, onTest }) => (
  <section className="tdg-panel">
    <div className="tdg-section-head"><div><span className="tdg-kicker">INTEGRAÇÕES</span><h2>{title}</h2></div><Icon size={22} /></div>
    <div className="tdg-access-list">
      {items.map((item) => (
        <div className="tdg-access-row" key={item.id}>
          <span>{item.configured ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}<strong>{item.name || item.id}</strong><small>{item.configured ? "Configurado" : "Pendente de credencial ou endpoint"}</small></span>
          {onTest && <button type="button" disabled={!item.configured || testing === item.id} onClick={() => onTest(item.id)}>{testing === item.id ? "Testando..." : "Testar"}</button>}
        </div>
      ))}
    </div>
  </section>
);

export default function IntegrationsPage({ authHeaders, setToast }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/todogreen/integrations", { headers: authHeaders?.() || {} });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as integrações.");
      setStatus(data);
    } catch (error) {
      setToast?.(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const test = async (provider) => {
    setTesting(provider);
    try {
      const response = await fetch("/api/todogreen/integrations", {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "O provedor não respondeu.");
      setToast?.(`${data.test.provider} respondeu em ${data.test.latencyMs} ms.`);
    } catch (error) {
      setToast?.(error.message);
    } finally {
      setTesting("");
    }
  };
  if (loading && !status) return <section className="tdg-panel" aria-busy="true">Carregando integrações...</section>;
  const searchItems = (status?.search?.providers || []).map((item) => ({ ...item, name: item.id === "searxng" ? "SearXNG" : item.id }));
  return (
    <div className="tdg-page">
      <header className="tdg-page-title"><div><span>CONFIABILIDADE</span><h2>Integrações de IA, busca e automação</h2><p>A Semente usa uma cascata de provedores gratuitos. Se um falhar, o próximo configurado assume. Esta tela mostra configuração sem expor nenhuma chave.</p></div><button className="tdg-action" type="button" onClick={load}><RefreshCw size={16} />Atualizar</button></header>
      <ProviderList title="Cascata de IA" icon={Zap} items={status?.ai} testing={testing} onTest={test} />
      <ProviderList title="Busca web" icon={Search} items={searchItems} />
      <ProviderList title="Automação autohospedada" icon={Workflow} items={status?.automation} />
      <section className="tdg-panel"><h2>Fora da vertical</h2><p>Whisper e geração de imagens permanecem desligados porque não fazem parte da jornada comercial, logística ou ESG.</p></section>
    </div>
  );
}
