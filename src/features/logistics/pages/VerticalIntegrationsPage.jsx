import { useEffect, useMemo, useState } from "react";
import { Bot, CalendarDays, CheckCircle2, Globe2, Image, MessageCircle, Mic, MousePointerClick, Route, ShieldCheck, Workflow } from "lucide-react";
import "./VerticalIntegrationsPage.css";

const get = async (path, authHeaders) => {
  const response = await fetch(path, { headers: authHeaders?.() || {} });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar a integração.");
  return payload;
};

export default function VerticalIntegrationsPage({ authHeaders, clients = [], onNavigate }) {
  const [status, setStatus] = useState(null);
  const [tracker, setTracker] = useState(null);
  const [vertical, setVertical] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      get("/api/status", authHeaders),
      get("/api/todogreen/tracker", authHeaders),
      get("/api/todogreen/integrations", authHeaders),
    ]).then(([statusResult, trackerResult, verticalResult]) => {
      if (!active) return;
      if (statusResult.status === "fulfilled") setStatus(statusResult.value);
      if (trackerResult.status === "fulfilled") setTracker(trackerResult.value);
      if (verticalResult.status === "fulfilled") setVertical(verticalResult.value);
      const failure = [statusResult, trackerResult, verticalResult].find((result) => result.status === "rejected");
      setError(failure?.reason?.message || "");
    });
    return () => { active = false; };
  }, [authHeaders]);
  const channels = useMemo(() => clients.reduce((total, client) => total + (client.crm?.contacts || []).filter((contact) => contact.phone || contact.email || contact.linkedinUrl).length, 0), [clients]);
  const portals = useMemo(() => clients.filter((client) => client.portalEnabled).length, [clients]);
  const webReady = Boolean(status?.capabilities?.webSearch?.configured);
  const trackerReady = ["ready", "active"].includes(tracker?.integration?.status);
  const aiProviders = vertical?.ai?.providers || [];
  const aiReady = aiProviders.some((provider) => provider.configured);
  const aiConfigured = aiProviders.filter((provider) => provider.configured).length;
  const automationReady = (vertical?.automations || []).filter((item) => item.configured).length;

  const cards = [
    { icon: Globe2, title: "Pesquisa e enriquecimento", state: webReady ? "Operacional" : "Pendente", ok: webReady, detail: webReady ? "Pesquisa web disponível para empresa, contatos, ESG, notícias e RFQs." : "Nenhum provedor de pesquisa respondeu como configurado.", action: "Abrir CRM", route: "/todogreen/clientes" },
    { icon: MessageCircle, title: "Canais comerciais", state: `${channels} contato(s) com canal`, ok: channels > 0, detail: "WhatsApp, Gmail, Outlook e LinkedIn ligados às pessoas cadastradas no CRM, com histórico compartilhado.", action: "Abrir comunicação", route: "/todogreen/comunicacoes" },
    { icon: Route, title: "TMS Tracker", state: trackerReady ? "Conectado" : "A configurar", ok: trackerReady, detail: trackerReady ? `${tracker?.summary?.linkedVehicles || 0} veículo(s) conectado(s).` : "A estrutura está pronta, mas URL, endpoint ou segredo ainda precisam ser concluídos.", action: "Configurar Tracker", route: "/todogreen/rastreamento" },
    { icon: CalendarDays, title: "Agenda comercial", state: "Disponível", ok: true, detail: "Prazos, tarefas e reuniões da Central podem ser vistos em calendário e exportados em formato ICS.", action: "Abrir agenda", route: "/todogreen/central-trabalho" },
    { icon: ShieldCheck, title: "Portal do cliente", state: `${portals} portal(is) liberado(s)`, ok: portals > 0, detail: "A visualização administrativa continua separando os dados internos do que cada cliente pode enxergar.", action: "Abrir clientes", route: "/todogreen/clientes" },
    { icon: Bot, title: "Cascata de IA", state: aiReady ? `${aiConfigured} de ${aiProviders.length} configurados` : "Pendente", ok: aiReady, detail: "Gemini, Groq, SambaNova, Cerebras, Mistral, OpenRouter, GitHub Models, Hugging Face e Workers AI entram em sequência quando o anterior falha. O contexto usado é exclusivo da To Do Green.", action: "Abrir Semente", route: "/todogreen/clientes" },
    { icon: Mic, title: "Transcrição com Whisper", state: vertical?.media?.whisper ? "Operacional" : "Pendente", ok: Boolean(vertical?.media?.whisper), detail: "Áudios enviados no Semente são transcritos pelo Workers AI e voltam para revisão antes do uso.", action: "Usar Semente", route: "/todogreen/clientes" },
    { icon: Image, title: "Geração de imagens", state: vertical?.media?.imageGeneration ? "Operacional" : "Pendente", ok: Boolean(vertical?.media?.imageGeneration), detail: "Criação de material visual da To Do Green pelo Workers AI, sem fallback pago automático.", action: "Usar Semente", route: "/todogreen/clientes" },
    { icon: Workflow, title: "Automação self-hosted", state: `${automationReady} de 8 conectado(s)`, ok: automationReady > 0, detail: "Conectores previstos para n8n, Node-RED, Activepieces, Windmill, Temporal, Airflow, Kestra e Huginn. Cada serviço precisa estar hospedado e ter URL própria.", action: "Abrir Central", route: "/todogreen/central-trabalho" },
    { icon: MousePointerClick, title: "Navegador hands-on", state: vertical?.browser?.runtimeConfigured ? "Conectado" : "Somente testes", ok: Boolean(vertical?.browser?.runtimeConfigured), detail: vertical?.browser?.runtimeConfigured ? "Executor de navegador disponível para rotinas autorizadas." : "Playwright valida a aplicação nos testes. Controle de navegador em produção exige um executor separado; Puppeteer, Selenium e Playwright não rodam dentro do Worker comum.", action: "Ver integrações", route: "/todogreen/integracoes" },
  ];

  return <section className="tdg-panel tdg-integrations-page">
    <header className="tdg-page-title"><div><span>CONEXÕES DA VERTICAL</span><h2>Integrações</h2><p>O que está conectado à To Do Green, o que funciona sem API paga e o que ainda depende de configuração externa.</p></div></header>
    {error && <div className="tdg-alert">{error}</div>}
    <div className="tdg-integrations-grid">{cards.map(({ icon: Icon, ...card }) => <article className={card.ok ? "ok" : "pending"} key={card.title}><header><Icon size={20} /><span>{card.ok && <CheckCircle2 size={13} />}{card.state}</span></header><strong>{card.title}</strong><p>{card.detail}</p><button type="button" onClick={() => onNavigate?.(card.route)}>{card.action}</button></article>)}</div>
    {aiProviders.length > 0 && <div className="tdg-integrations-policy"><strong>Provedores da cascata</strong><div className="tdg-provider-list">{aiProviders.map((provider) => <span className={provider.configured ? "ok" : "pending"} key={provider.id}>{provider.name}: {provider.configured ? "configurado" : "sem chave"}</span>)}</div></div>}
    <div className="tdg-integrations-policy"><strong>Canais gratuitos e registros confirmados</strong><p>A vertical usa links gratuitos para WhatsApp e compositores de e-mail. Uma mensagem só entra no histórico como enviada quando houver confirmação ou registro explícito.</p></div>
  </section>;
}
