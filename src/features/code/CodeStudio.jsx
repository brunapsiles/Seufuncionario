import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Code2,
  Copy,
  Download,
  FileCode2,
  Play,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import {
  LANGUAGES,
  MAX_PROJECT_CHARS,
  SANDBOX,
  TEMPLATES,
  appendLog,
  buildDocument,
  canSaveProject,
  describeIssues,
  duplicateProject,
  exportHtml,
  exportName,
  makeProject,
  parseConsoleMessage,
  projectSize,
  removeProject,
  renameProject,
  templateById,
  upsertProject,
} from "./codeDomain.js";

const baixarArquivo = (conteudo, nome) => {
  const url = URL.createObjectURL(
    new Blob([conteudo], { type: "text/html;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function CodeStudio({ db, update, business, setToast }) {
  const projetos = useMemo(() => {
    const todos = db?.codeProjects || [];
    return todos.filter(
      (p) => !business?.id || !p?.businessId || p.businessId === business.id,
    );
  }, [db, business]);

  const [abertoId, setAbertoId] = useState(null);
  const [rascunho, setRascunho] = useState(() =>
    makeProject(templateById("cartao")),
  );
  const [aba, setAba] = useState("html");
  const [documento, setDocumento] = useState(() =>
    buildDocument(makeProject(templateById("cartao"))),
  );
  const [logs, setLogs] = useState([]);
  const [estreito, setEstreito] = useState(false);
  const [erro, setErro] = useState("");
  const iframeRef = useRef(null);

  const avisos = useMemo(() => describeIssues(rascunho), [rascunho]);
  const tamanho = projectSize(rascunho);

  // A prévia não tem origem própria — o navegador dá a ela a origem opaca
  // "null" —, então conferir `event.origin` não protegeria nada. O que
  // identifica a nossa prévia é a IDENTIDADE da janela.
  useEffect(() => {
    const aoReceber = (evento) => {
      if (evento.source !== iframeRef.current?.contentWindow) return;
      const entrada = parseConsoleMessage(evento.data);
      if (entrada) setLogs((atuais) => appendLog(atuais, entrada));
    };
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
  }, []);

  const rodar = useCallback(() => {
    setLogs([]);
    setDocumento(buildDocument(rascunho));
  }, [rascunho]);

  // O documento nasce montado (veja o useState acima) em vez de ser gerado num
  // efeito: a tela não pisca vazia, e depois quem manda rodar é a pessoa —
  // recarregar a cada tecla apagaria o que ela tivesse digitado no formulário
  // da prévia.

  const alterar = (campo, valor) => {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
    setErro("");
  };

  const abrir = (projeto) => {
    setAbertoId(projeto.id);
    setRascunho(projeto);
    setLogs([]);
    setDocumento(buildDocument(projeto));
    setErro("");
  };

  const novo = (templateId) => {
    const p = makeProject(templateById(templateId));
    setAbertoId(null);
    setRascunho(p);
    setLogs([]);
    setDocumento(buildDocument(p));
    setErro("");
  };

  const guardar = () => {
    if (!canSaveProject(rascunho)) {
      setErro(
        `O projeto tem ${tamanho.toLocaleString("pt-BR")} caracteres e o limite para guardar é ${MAX_PROJECT_CHARS.toLocaleString("pt-BR")}. Baixe o arquivo em vez de guardar.`,
      );
      return;
    }
    const projeto = {
      ...rascunho,
      id: abertoId || rascunho.id,
      businessId: business?.id || null,
      ownerId: db?.user?.id || null,
      updatedAt: new Date().toISOString(),
    };
    update((atual) => ({
      ...atual,
      codeProjects: upsertProject(atual.codeProjects || [], projeto),
    }));
    setAbertoId(projeto.id);
    setToast?.("Projeto guardado.");
  };

  const apagar = (id) => {
    update((atual) => ({
      ...atual,
      codeProjects: removeProject(atual.codeProjects || [], id),
    }));
    if (abertoId === id) setAbertoId(null);
    setToast?.("Projeto apagado.");
  };

  const duplicar = (projeto) => {
    const copia = {
      ...duplicateProject(projeto),
      businessId: business?.id || null,
      ownerId: db?.user?.id || null,
    };
    update((atual) => ({
      ...atual,
      codeProjects: upsertProject(atual.codeProjects || [], copia),
    }));
    setToast?.("Cópia criada.");
  };

  return (
    <PageTitle
      eyebrow="EDITOR DE CÓDIGO"
      title="Escreva e veja acontecer na hora"
      text="Monte uma página, um formulário ou um cartão e veja o resultado ao lado. Roda no seu aparelho, sem custo, e você baixa o arquivo pronto para publicar onde quiser."
      action={
        <Button icon={Play} onClick={rodar}>
          Rodar
        </Button>
      }
    >
      <div className="cs">
        <aside className="cs-lista">
          <div className="cs-lista-topo">
            <h3>Começar de</h3>
            <div className="cs-chips">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn tiny"
                  onClick={() => novo(t.id)}
                >
                  <Plus size={12} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <h3>Meus projetos</h3>
          {!projetos.length ? (
            <p className="muted">
              Nada guardado ainda. Escreva e clique em “Guardar”.
            </p>
          ) : (
            <ul className="cs-projetos">
              {projetos.map((p) => (
                <li key={p.id} className={p.id === abertoId ? "ativo" : ""}>
                  <button
                    type="button"
                    className="cs-abrir"
                    onClick={() => abrir(p)}
                  >
                    <FileCode2 size={14} />
                    <span>{p.name}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Duplicar ${p.name}`}
                    onClick={() => duplicar(p)}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Apagar ${p.name}`}
                    onClick={() => apagar(p.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="cs-editor">
          <div className="cs-editor-topo">
            <Field label="Nome do projeto">
              <input
                value={rascunho.name}
                onChange={(e) =>
                  setRascunho(renameProject(rascunho, e.target.value))
                }
              />
            </Field>
            <div className="cs-acoes">
              <Button icon={Save} variant="secondary" onClick={guardar}>
                Guardar
              </Button>
              <Button
                icon={Download}
                variant="secondary"
                onClick={() =>
                  baixarArquivo(exportHtml(rascunho), exportName(rascunho.name))
                }
              >
                Baixar .html
              </Button>
            </div>
          </div>

          {erro && <div className="ask-error">{erro}</div>}

          <div className="cs-abas">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                className={aba === l.id ? "active" : ""}
                onClick={() => setAba(l.id)}
                title={l.hint}
              >
                <Code2 size={14} /> {l.label}
              </button>
            ))}
          </div>

          <textarea
            className="cs-codigo"
            aria-label={`Código ${aba.toUpperCase()}`}
            spellCheck={false}
            value={rascunho[aba] || ""}
            onChange={(e) => alterar(aba, e.target.value)}
            placeholder={LANGUAGES.find((l) => l.id === aba)?.hint}
          />

          {avisos.length > 0 && (
            <ul className="cs-avisos">
              {avisos.map((a) => (
                <li key={`${a.onde}-${a.texto}`}>
                  <AlertTriangle size={14} />
                  <span>
                    <b>{a.onde}:</b> {a.texto}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cs-previa">
          <div className="cs-previa-topo">
            <h3>Prévia</h3>
            <button
              type="button"
              className={`btn tiny${estreito ? " ativo" : ""}`}
              onClick={() => setEstreito(!estreito)}
            >
              <Smartphone size={13} /> Ver como celular
            </button>
          </div>
          <div className={`cs-palco${estreito ? " estreito" : ""}`}>
            <iframe
              ref={iframeRef}
              title="Prévia do código"
              // Sem `allow-same-origin`, e é de propósito: com ele o código
              // escrito aqui passaria a rodar na origem do app e conseguiria
              // ler o token de login no localStorage. Ver codeDomain.js.
              sandbox={SANDBOX}
              srcDoc={documento}
            />
          </div>

          <div className="cs-console">
            <h4>Console</h4>
            {!logs.length ? (
              <p className="muted">
                O que você escrever com console.log() aparece aqui. Erros
                também.
              </p>
            ) : (
              <ul>
                {logs.map((l) => (
                  <li key={l.id} className={`cs-log-${l.nivel}`}>
                    {l.texto}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {!projetos.length && !db?.codeProjects?.length && (
        <Empty
          icon={Code2}
          title="Ainda dá para usar sem saber programar"
          text="Escolha um dos pontos de partida acima, troque o texto e clique em Rodar. O que aparecer na prévia é exatamente o que vai aparecer para o seu cliente."
        />
      )}
    </PageTitle>
  );
}
