import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  BadgeCheck,
  Bot,
  ClipboardCheck,
  Code2,
  Copy,
  Download,
  KeyRound,
  Library,
  LoaderCircle,
  Mic2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  OFFICIAL_TEMPLATES,
  appFromPrompt,
  appSchemaToHtml,
  evaluateAiResponse,
  localTemplateAnswer,
  moderateTemplate,
  normalizeAppSchema,
} from "./freeSuiteDomain.js";
import "./freeSuite.css";

const TABS = [
  { id: "avaliador", label: "Avaliar IA", icon: ClipboardCheck },
  { id: "local", label: "IA local", icon: Bot },
  { id: "voz", label: "Voz", icon: Volume2 },
  { id: "apps", label: "Criar app", icon: AppWindow },
  { id: "marketplace", label: "Templates", icon: Library },
  { id: "api", label: "API pública", icon: KeyRound },
];

const DIMENSION_LABELS = {
  relevance: "Aderência",
  completeness: "Completude",
  clarity: "Clareza",
  evidence: "Evidências",
  safety: "Cautela",
};

function downloadText(content, filename, type = "text/plain") {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

async function apiRequest(path, authHeaders, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir.");
  return body;
}

function EvaluationLab() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState("");
  const result = useMemo(
    () => (prompt.trim() && response.trim() ? evaluateAiResponse({ prompt, response, sources }) : null),
    [prompt, response, sources],
  );
  return (
    <div className="fs-two-columns">
      <section className="fs-card">
        <span className="fs-eyebrow">Revisão antes de usar</span>
        <h2>A IA respondeu bem?</h2>
        <label>
          Pedido original
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Cole o que foi pedido à IA"
          />
        </label>
        <label>
          Resposta recebida
          <textarea
            className="fs-tall"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder="Cole a resposta que quer revisar"
          />
        </label>
        <label>
          Fontes apresentadas, uma por linha
          <textarea
            value={sources}
            onChange={(event) => setSources(event.target.value)}
            placeholder="https://..."
          />
        </label>
      </section>
      <section className="fs-card fs-result-card">
        {!result ? (
          <div className="fs-empty">
            <ClipboardCheck />
            <strong>Cole o pedido e a resposta</strong>
            <span>A análise roda localmente e não envia o texto ao servidor.</span>
          </div>
        ) : (
          <>
            <div className="fs-score">
              <strong>{result.score}</strong>
              <span>/ 100 · {result.verdict}</span>
            </div>
            <div className="fs-metrics">
              {Object.entries(result.dimensions).map(([key, value]) => (
                <div key={key}>
                  <span>{DIMENSION_LABELS[key]}</span>
                  <progress value={value} max="100" />
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <h3>Como melhorar</h3>
            {result.suggestions.length ? (
              <ul>
                {result.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            ) : (
              <p>A resposta passou pelos critérios heurísticos desta revisão.</p>
            )}
            <p className="fs-notice">{result.disclaimer}</p>
          </>
        )}
      </section>
    </div>
  );
}

function LocalAiLab({ business }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState(() =>
    window.LanguageModel || window.ai?.languageModel ? "checking" : "fallback",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const api = window.LanguageModel || window.ai?.languageModel;
    if (!api) return;
    Promise.resolve(
      typeof api.availability === "function" ? api.availability() : "available",
    )
      .then((availability) =>
        setStatus(
          ["available", "readily", "after-download"].includes(availability)
            ? availability
            : "fallback",
        ),
      )
      .catch(() => setStatus("fallback"));
  }, []);

  const run = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    const api = window.LanguageModel || window.ai?.languageModel;
    try {
      if (api && status !== "fallback") {
        const session = await api.create({
          initialPrompts: [
            {
              role: "system",
              content:
                "Responda em português do Brasil, com ações práticas. Não invente fatos nem prometa resultados.",
            },
          ],
        });
        setAnswer(await session.prompt(prompt));
        session.destroy?.();
      } else {
        setAnswer(localTemplateAnswer(prompt, business?.name));
      }
    } catch {
      setStatus("fallback");
      setAnswer(localTemplateAnswer(prompt, business?.name));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fs-two-columns">
      <section className="fs-card">
        <div className="fs-status-row">
          <span className={`fs-status ${status === "fallback" ? "fallback" : "ok"}`}>
            {status === "checking"
              ? "Verificando dispositivo"
              : status === "fallback"
                ? "Plano C local ativo"
                : status === "after-download"
                  ? "Modelo disponível após download"
                  : "Modelo do dispositivo disponível"}
          </span>
        </div>
        <h2>Assistente no seu dispositivo</h2>
        <p>
          Tenta usar o modelo nativo do navegador. Se ele não existir, entrega um
          plano estruturado determinístico — sem chave e sem enviar dados.
        </p>
        <label>
          O que você precisa resolver?
          <textarea
            className="fs-tall"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ex.: monte um plano para recuperar clientes inativos"
          />
        </label>
        <button className="fs-primary" onClick={run} disabled={!prompt.trim() || busy}>
          {busy ? <LoaderCircle className="spin" /> : <Bot />}
          Resolver localmente
        </button>
      </section>
      <section className="fs-card">
        <span className="fs-eyebrow">Resposta privada</span>
        <div className="fs-output">
          {answer || "A resposta aparecerá aqui."}
        </div>
      </section>
    </div>
  );
}

function VoiceLab({ setToast }) {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const supported = "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => {
      const next = window.speechSynthesis.getVoices();
      setVoices(next);
      if (!voiceName)
        setVoiceName(
          next.find((voice) => /^pt-BR/i.test(voice.lang))?.name ||
            next[0]?.name ||
            "",
        );
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    };
  }, [supported, voiceName]);

  const play = () => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find((voice) => voice.name === voiceName) || null;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = utterance.voice?.lang || "pt-BR";
    window.speechSynthesis.speak(utterance);
    setToast("Locução iniciada no dispositivo");
  };

  return (
    <div className="fs-two-columns">
      <section className="fs-card">
        <span className={`fs-status ${supported ? "ok" : "fallback"}`}>
          {supported ? "Motor de voz do dispositivo" : "Voz indisponível neste navegador"}
        </span>
        <h2>Locução gratuita</h2>
        <label>
          Roteiro
          <textarea
            className="fs-tall"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Cole o texto do anúncio, vídeo, treinamento ou atendimento"
          />
        </label>
        <label>
          Voz
          <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
            {voices.map((voice) => (
              <option value={voice.name} key={`${voice.name}-${voice.lang}`}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </select>
        </label>
        <div className="fs-range-row">
          <label>
            Velocidade: {rate.toFixed(1)}
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
            />
          </label>
          <label>
            Tom: {pitch.toFixed(1)}
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(event) => setPitch(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="fs-actions">
          <button className="fs-primary" onClick={play} disabled={!supported || !text.trim()}>
            <Play /> Ouvir
          </button>
          <button onClick={() => window.speechSynthesis?.pause()}>
            <Pause /> Pausar
          </button>
          <button onClick={() => window.speechSynthesis?.resume()}>
            <RotateCcw /> Retomar
          </button>
          <button onClick={() => window.speechSynthesis?.cancel()}>
            <Square /> Parar
          </button>
        </div>
      </section>
      <section className="fs-card">
        <Mic2 className="fs-big-icon" />
        <h3>Plano de contingência</h3>
        <ol>
          <li>Voz instalada no navegador ou sistema.</li>
          <li>Outra voz local disponível no mesmo dispositivo.</li>
          <li>Roteiro exportável quando o navegador não possui síntese.</li>
        </ol>
        <button
          onClick={() => downloadText(text, "roteiro-locucao.txt")}
          disabled={!text.trim()}
        >
          <Download /> Baixar roteiro
        </button>
      </section>
    </div>
  );
}

function AppBuilder({ business, authHeaders, ownerId, setToast, initialSchema }) {
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState(() =>
    initialSchema
      ? normalizeAppSchema(initialSchema)
      : appFromPrompt("site de serviços com formulário", business?.name),
  );
  const [apps, setApps] = useState([]);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => appSchemaToHtml(schema), [schema]);

  const loadApps = useCallback(
    () =>
      apiRequest(
        `/api/free-suite/apps?owner=${encodeURIComponent(ownerId || "")}`,
        authHeaders,
      )
        .then((body) => setApps(body.apps || []))
        .catch(() => {}),
    [authHeaders, ownerId],
  );

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const generate = () => {
    if (!prompt.trim()) return;
    setSchema(appFromPrompt(prompt, business?.name));
    setToast("Aplicativo montado com blocos seguros");
  };

  const updateBlock = (id, field, value) =>
    setSchema((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id ? { ...block, [field]: value } : block,
      ),
    }));

  const save = async () => {
    setBusy(true);
    try {
      await apiRequest("/api/free-suite/apps", authHeaders, {
        method: "POST",
        body: JSON.stringify({
          ownerId,
          businessId: business?.id || null,
          name: schema.name,
          schema,
        }),
      });
      await loadApps();
      setToast("Aplicativo salvo no espaço");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fs-builder">
      <section className="fs-card fs-builder-controls">
        <span className="fs-eyebrow">Sem código executável</span>
        <h2>Crie um app pelo pedido</h2>
        <label>
          Descreva o aplicativo
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ex.: crie uma página para minha assistência técnica com benefícios, formulário e FAQ"
          />
        </label>
        <button className="fs-primary" onClick={generate} disabled={!prompt.trim()}>
          <AppWindow /> Montar aplicativo
        </button>
        <label>
          Nome
          <input
            value={schema.name}
            onChange={(event) => setSchema((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <div className="fs-block-list">
          {schema.blocks.map((block) => (
            <article key={block.id}>
              <span>{block.type}</span>
              <input
                value={block.title}
                onChange={(event) => updateBlock(block.id, "title", event.target.value)}
              />
              {block.text !== undefined && (
                <textarea
                  value={block.text}
                  onChange={(event) => updateBlock(block.id, "text", event.target.value)}
                />
              )}
              <button
                className="fs-icon-danger"
                title="Remover bloco"
                onClick={() =>
                  setSchema((current) => ({
                    ...current,
                    blocks: current.blocks.filter((item) => item.id !== block.id),
                  }))
                }
              >
                <Trash2 />
              </button>
            </article>
          ))}
        </div>
        <div className="fs-actions">
          <button className="fs-primary" onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className="spin" /> : <Save />} Salvar
          </button>
          <button
            onClick={() => downloadText(preview, `${schema.name || "aplicativo"}.html`, "text/html")}
          >
            <Download /> Exportar HTML
          </button>
        </div>
        {apps.length > 0 && <small>{apps.length} aplicativo(s) salvo(s) neste espaço.</small>}
      </section>
      <section className="fs-preview-card">
        <div>
          <span>Prévia isolada</span>
          <ShieldCheck />
        </div>
        <iframe
          title="Prévia do aplicativo"
          sandbox=""
          srcDoc={preview}
        />
      </section>
    </div>
  );
}

function Marketplace({
  authHeaders,
  ownerId,
  business,
  setToast,
  onUseTemplate,
}) {
  const [community, setCommunity] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState("CC0-1.0");
  const [schema] = useState(() =>
    appFromPrompt("site de serviços com contato", business?.name),
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      apiRequest(
        `/api/free-suite/marketplace?owner=${encodeURIComponent(ownerId || "")}`,
        authHeaders,
      )
        .then((body) => setCommunity(body.templates || []))
        .catch(() => {}),
    [authHeaders, ownerId],
  );
  useEffect(() => {
    load();
  }, [load]);

  const publish = async () => {
    const moderation = moderateTemplate({ name, description, license, schema });
    if (!moderation.approved) {
      setToast(moderation.reasons[0]);
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/free-suite/marketplace", authHeaders, {
        method: "POST",
        body: JSON.stringify({
          ownerId,
          name,
          description,
          category: "Negócios",
          license,
          schema,
        }),
      });
      setName("");
      setDescription("");
      await load();
      setToast("Template publicado após moderação automática");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const templates = [
    ...OFFICIAL_TEMPLATES,
    ...community.map((item) => ({
      ...item,
      publisherName: item.publisherName || "Comunidade",
    })),
  ];

  return (
    <div className="fs-market">
      <section className="fs-card">
        <span className="fs-eyebrow">Catálogo gratuito</span>
        <h2>Templates reutilizáveis</h2>
        <div className="fs-template-grid">
          {templates.map((template) => (
            <article key={template.id}>
              <div className="fs-template-icon"><AppWindow /></div>
              <span>{template.category} · {template.license}</span>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <small>
                {template.publisherName === "Seu Funcionário" && <BadgeCheck />}
                {template.publisherName}
              </small>
              <button
                className="fs-primary"
                onClick={() => onUseTemplate(template.schema)}
              >
                <Plus /> Usar template
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="fs-card">
        <span className="fs-eyebrow">Compartilhar com segurança</span>
        <h2>Publicar template</h2>
        <p>
          Apenas blocos declarativos são aceitos. Scripts, eventos HTML e
          licenças incompatíveis são bloqueados.
        </p>
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Descrição
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Licença comercial permitida
          <select value={license} onChange={(event) => setLicense(event.target.value)}>
            <option>CC0-1.0</option>
            <option>CC-BY-4.0</option>
            <option>MIT</option>
          </select>
        </label>
        <button className="fs-primary" onClick={publish} disabled={busy || !name.trim()}>
          {busy ? <LoaderCircle className="spin" /> : <Send />} Moderar e publicar
        </button>
      </section>
    </div>
  );
}

function ApiManager({ authHeaders, ownerId, setToast }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("Integração principal");
  const [scope, setScope] = useState("read");
  const [createdKey, setCreatedKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      apiRequest(
        `/api/free-suite/api-keys?owner=${encodeURIComponent(ownerId || "")}`,
        authHeaders,
      )
        .then((body) => setKeys(body.keys || []))
        .catch(() => {}),
    [authHeaders, ownerId],
  );
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const body = await apiRequest("/api/free-suite/api-keys", authHeaders, {
        method: "POST",
        body: JSON.stringify({ ownerId, name, scope }),
      });
      setCreatedKey(body.key);
      await load();
      setToast("Chave criada. Copie agora: ela não será exibida novamente.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    try {
      await apiRequest(`/api/free-suite/api-keys/${encodeURIComponent(id)}`, authHeaders, {
        method: "DELETE",
        body: JSON.stringify({ ownerId }),
      });
      await load();
      setToast("Chave revogada");
    } catch (error) {
      setToast(error.message);
    }
  };

  const example = `curl "${window.location.origin}/api/public/v1/tasks?limit=20" \\
  -H "Authorization: Bearer SUA_CHAVE"`;

  return (
    <div className="fs-two-columns">
      <section className="fs-card">
        <span className="fs-eyebrow">API REST v1</span>
        <h2>Conecte outros sistemas</h2>
        <p>
          A chave acessa apenas o espaço selecionado, possui limite de uso e
          pode ser revogada a qualquer momento.
        </p>
        <label>
          Nome da chave
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Permissão
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="read">Somente leitura</option>
            <option value="read-write">Leitura e criação</option>
          </select>
        </label>
        <button className="fs-primary" onClick={create} disabled={busy || !name.trim()}>
          {busy ? <LoaderCircle className="spin" /> : <KeyRound />} Criar chave
        </button>
        {createdKey && (
          <div className="fs-secret">
            <strong>Copie agora — exibida uma única vez</strong>
            <code>{createdKey}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKey);
                setToast("Chave copiada");
              }}
            >
              <Copy /> Copiar
            </button>
          </div>
        )}
        <div className="fs-key-list">
          {keys.map((key) => (
            <article key={key.id}>
              <div>
                <strong>{key.name}</strong>
                <span>{key.keyPrefix}•••• · {key.scope}</span>
              </div>
              <button title="Revogar chave" onClick={() => revoke(key.id)}>
                <Trash2 />
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="fs-card">
        <Code2 className="fs-big-icon" />
        <h3>Primeira chamada</h3>
        <pre>{example}</pre>
        <h3>Recursos disponíveis</h3>
        <ul>
          <li><code>GET /api/public/v1/me</code></li>
          <li><code>GET /api/public/v1/tasks</code></li>
          <li><code>GET /api/public/v1/contacts</code></li>
          <li><code>GET /api/public/v1/opportunities</code></li>
          <li><code>GET /api/public/v1/transactions</code></li>
          <li><code>POST /api/public/v1/tasks</code> com chave de escrita</li>
          <li><code>POST /api/public/v1/contacts</code> com chave de escrita</li>
        </ul>
        <a className="fs-link-button" href="/api/public/v1/openapi.json" target="_blank" rel="noreferrer">
          <Code2 /> Abrir documentação OpenAPI
        </a>
      </section>
    </div>
  );
}

export default function FreeSuite({
  business,
  setToast,
  authHeaders,
  ownerId,
}) {
  const [tab, setTab] = useState("avaliador");
  const [templateSchema, setTemplateSchema] = useState(null);

  const useTemplate = (schema) => {
    setTemplateSchema(normalizeAppSchema(schema));
    setTab("apps");
    setToast("Template aberto no construtor");
  };

  return (
    <div className="free-suite">
      <header className="fs-header">
        <div>
          <span className="fs-eyebrow">Funciona sem assinatura extra</span>
          <h1>Laboratório gratuito</h1>
          <p>
            Seis ferramentas novas com operação local, contingência e controles
            de segurança para o seu negócio.
          </p>
        </div>
        <div className="fs-free-badge">
          <ShieldCheck />
          <span><strong>R$ 0</strong> por chamada local</span>
        </div>
      </header>
      <nav className="fs-tabs" aria-label="Ferramentas gratuitas">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon /> {label}
          </button>
        ))}
      </nav>
      {tab === "avaliador" && <EvaluationLab />}
      {tab === "local" && <LocalAiLab business={business} />}
      {tab === "voz" && <VoiceLab setToast={setToast} />}
      {tab === "apps" && (
        <AppBuilder
          business={business}
          authHeaders={authHeaders}
          ownerId={ownerId}
          setToast={setToast}
          initialSchema={templateSchema}
        />
      )}
      {tab === "marketplace" && (
        <Marketplace
          authHeaders={authHeaders}
          ownerId={ownerId}
          business={business}
          setToast={setToast}
          onUseTemplate={useTemplate}
        />
      )}
      {tab === "api" && (
        <ApiManager authHeaders={authHeaders} ownerId={ownerId} setToast={setToast} />
      )}
    </div>
  );
}
