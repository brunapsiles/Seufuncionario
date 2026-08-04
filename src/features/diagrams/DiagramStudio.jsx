import { useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  Download,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  SHAPE_CATEGORIES,
  alignNodes,
  distributeNodes,
  fromCsv,
  makeDiagram,
  makeEdge,
  makeNode,
  orgChartFromRows,
  orthogonalRoute,
  parseMermaid,
  routeToPath,
  shapeSpec,
  shapesByCategory,
  snapToGrid,
  statusColor,
  toCsv,
  toMermaid,
  toSvg,
  validateDiagram,
} from "./diagramDomain.js";

const newId = () => `d-${Math.random().toString(36).slice(2, 10)}`;
const EMPTY_ARRAY = [];

const baixar = (nome, conteudo, tipo) => {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default function DiagramStudio({ db, update, business, setToast }) {
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [categoria, setCategoria] = useState("fluxo");
  const [selecao, setSelecao] = useState([]);
  const [ligando, setLigando] = useState(null);
  const [importar, setImportar] = useState(null);
  const [mostrarValidacao, setMostrarValidacao] = useState(false);
  const arraste = useRef(null);

  const diagramas = useMemo(
    () =>
      (db.diagrams || []).filter(
        (d) => !business || d.businessId === business.id,
      ),
    [db.diagrams, business],
  );
  const diagrama =
    diagramas.find((d) => d.id === selecionadoId) || diagramas[0] || null;
  const nodes = diagrama?.nodes || EMPTY_ARRAY;
  const edges = diagrama?.edges || EMPTY_ARRAY;
  const validacao = useMemo(() => validateDiagram(nodes, edges), [nodes, edges]);
  const bases = (db.databases || []).filter(
    (b) => !business || b.businessId === business.id,
  );

  const patch = (campos) =>
    update((prev) => ({
      ...prev,
      diagrams: (prev.diagrams || []).map((d) =>
        d.id === diagrama.id ? { ...d, ...campos } : d,
      ),
    }));

  const criar = () => {
    const d = makeDiagram(newId(), {
      businessId: business?.id || null,
      ownerId: db.user?.id || null,
    });
    update((prev) => ({ ...prev, diagrams: [d, ...(prev.diagrams || [])] }));
    setSelecionadoId(d.id);
  };

  const excluir = (id) => {
    if (!window.confirm("Excluir este diagrama?")) return;
    update((prev) => ({
      ...prev,
      diagrams: (prev.diagrams || []).filter((d) => d.id !== id),
    }));
    setSelecionadoId(null);
  };

  const adicionar = (shapeId) => {
    const n = makeNode(shapeId, {
      id: newId(),
      x: 60 + (nodes.length % 5) * 200,
      y: 60 + Math.floor(nodes.length / 5) * 160,
    });
    patch({ nodes: [...nodes, n] });
    setSelecao([n.id]);
  };

  const excluirNo = (id) => {
    patch({
      nodes: nodes.filter((n) => n.id !== id),
      // Conector que perde uma ponta é removido junto, para não sobrar inválido.
      edges: edges.filter((e) => e.from !== id && e.to !== id),
    });
    setSelecao((s) => s.filter((x) => x !== id));
  };

  const clicarNo = (event, node) => {
    if (ligando) {
      if (ligando !== node.id) {
        const jaExiste = edges.some(
          (e) => e.from === ligando && e.to === node.id,
        );
        if (!jaExiste)
          patch({
            edges: [
              ...edges,
              makeEdge({ id: newId(), from: ligando, to: node.id }),
            ],
          });
      }
      setLigando(null);
      return;
    }
    if (event.shiftKey)
      setSelecao((s) =>
        s.includes(node.id) ? s.filter((x) => x !== node.id) : [...s, node.id],
      );
    else setSelecao([node.id]);
  };

  const iniciarArraste = (event, node) => {
    arraste.current = { id: node.id, x: event.clientX, y: event.clientY };
  };
  const durante = (event) => {
    const atual = arraste.current;
    if (!atual) return;
    const dx = event.clientX - atual.x;
    const dy = event.clientY - atual.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    arraste.current = { ...atual, x: event.clientX, y: event.clientY };
    patch({
      nodes: nodes.map((n) =>
        n.id === atual.id
          ? { ...n, x: snapToGrid(n.x + dx), y: snapToGrid(n.y + dy) }
          : n,
      ),
    });
  };
  const encerrar = () => {
    arraste.current = null;
  };

  const alinhar = (mode) => {
    if (selecao.length < 2) {
      setToast("Selecione duas ou mais formas (com Shift) para alinhar.");
      return;
    }
    patch({ nodes: alignNodes(nodes, selecao, mode) });
  };
  const distribuir = (axis) => {
    if (selecao.length < 3) {
      setToast("Selecione três ou mais formas para distribuir.");
      return;
    }
    patch({ nodes: distributeNodes(nodes, selecao, axis) });
  };

  const gerarOrganograma = (baseId) => {
    const base = bases.find((b) => b.id === baseId);
    if (!base) return;
    const campos = base.fields || [];
    const nomeCampo = (i) => campos[i]?.name || "";
    const linhas = (base.rows || []).map((row) => {
      const obj = {};
      for (const f of campos) obj[f.name] = row.cells?.[f.id] ?? "";
      obj.__id = row.id;
      return obj;
    });
    const { nodes: n, edges: e } = orgChartFromRows(
      linhas,
      { idField: nomeCampo(0), nameField: nomeCampo(0), parentField: nomeCampo(1) },
      () => newId(),
    );
    if (n.length === 0) {
      setToast("A base escolhida não tem registros.");
      return;
    }
    patch({ nodes: n, edges: e, name: `Organograma — ${base.name}` });
    setToast(`Organograma gerado com ${n.length} formas`);
  };

  const exportar = (formato) => {
    const nome = (diagrama.name || "diagrama").replace(/[^\w-]+/g, "-");
    if (formato === "svg") baixar(`${nome}.svg`, toSvg(nodes, edges), "image/svg+xml");
    else if (formato === "mermaid")
      baixar(`${nome}.mmd`, toMermaid(nodes, edges), "text/plain;charset=utf-8");
    else if (formato === "csv")
      baixar(`${nome}.csv`, toCsv(nodes, edges), "text/csv;charset=utf-8");
    setToast(`Exportado em ${formato.toUpperCase()}`);
  };

  const aplicarImportacao = () => {
    const texto = importar.texto || "";
    const resultado =
      importar.formato === "csv" ? fromCsv(texto) : parseMermaid(texto);
    if (resultado.nodes.length === 0) {
      setToast("Não encontrei formas nesse conteúdo.");
      return;
    }
    patch({ nodes: resultado.nodes, edges: resultado.edges });
    setImportar(null);
    setToast(`${resultado.nodes.length} formas importadas`);
  };

  if (!diagrama)
    return (
      <section className="dgm">
        <header className="dgm-head">
          <div>
            <h2>Diagramas</h2>
            <p>
              Fluxograma, BPMN, UML, organograma, rede e processo industrial. Os
              conectores grudam nas formas e o diagrama é conferido por regras.
            </p>
          </div>
          <button className="btn" onClick={criar}>
            <Plus size={16} /> Novo diagrama
          </button>
        </header>
        <div className="dgm-empty">
          <h3>Nenhum diagrama ainda</h3>
          <p>
            Crie um diagrama em branco, importe de Mermaid ou CSV, ou gere um
            organograma a partir de uma base de dados.
          </p>
        </div>
      </section>
    );

  return (
    <section className="dgm">
      <header className="dgm-head">
        <div className="dgm-picker">
          <select
            aria-label="Diagrama"
            value={diagrama.id}
            onChange={(e) => {
              setSelecionadoId(e.target.value);
              setSelecao([]);
            }}
          >
            {diagramas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Nome do diagrama"
            value={diagrama.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <button className="btn ghost sm" onClick={criar}>
            <Plus size={14} /> Novo
          </button>
          <button
            className="btn ghost sm danger"
            onClick={() => excluir(diagrama.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <div className="dgm-shapes">
        <select
          aria-label="Categoria de formas"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          {SHAPE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {shapesByCategory(categoria).map((s) => (
          <button key={s.id} onClick={() => adicionar(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="dgm-tools">
        <button
          className={`btn ghost sm ${ligando ? "active" : ""}`}
          onClick={() => setLigando(ligando ? null : "aguardando")}
        >
          <Link2 size={14} />
          {ligando ? "Escolha a forma de origem" : "Conectar formas"}
        </button>
        <span className="dgm-sep" />
        <AlignLeft size={14} />
        {[
          ["esquerda", "Esq."],
          ["centro-h", "Centro"],
          ["direita", "Dir."],
          ["topo", "Topo"],
          ["base", "Base"],
        ].map(([mode, label]) => (
          <button key={mode} className="btn ghost sm" onClick={() => alinhar(mode)}>
            {label}
          </button>
        ))}
        <button className="btn ghost sm" onClick={() => distribuir("h")}>
          Distribuir
        </button>
        <span className="dgm-sep" />
        <button
          className={`btn ghost sm ${validacao.ok ? "" : "danger"}`}
          onClick={() => setMostrarValidacao((v) => !v)}
        >
          <ShieldCheck size={14} />
          {validacao.ok
            ? "Diagrama válido"
            : `${validacao.errors} erro(s), ${validacao.warnings} aviso(s)`}
        </button>
        <span className="dgm-sep" />
        <button className="btn ghost sm" onClick={() => exportar("svg")}>
          <Download size={14} /> SVG
        </button>
        <button className="btn ghost sm" onClick={() => exportar("mermaid")}>
          Mermaid
        </button>
        <button className="btn ghost sm" onClick={() => exportar("csv")}>
          CSV
        </button>
        <button
          className="btn ghost sm"
          onClick={() => setImportar({ formato: "mermaid", texto: "" })}
        >
          <Upload size={14} /> Importar
        </button>
        {bases.length > 0 && (
          <select
            aria-label="Gerar organograma de uma base"
            value=""
            onChange={(e) => e.target.value && gerarOrganograma(e.target.value)}
          >
            <option value="">Organograma de uma base...</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {mostrarValidacao && (
        <div className={`dgm-validation ${validacao.ok ? "ok" : ""}`}>
          {validacao.ok ? (
            <p>Nenhum problema encontrado: sem órfãos, sem ciclos, sem conector inválido.</p>
          ) : (
            <ul>
              {validacao.items.map((item, i) => (
                <li key={`${item.rule}-${i}`} className={item.severity}>
                  <strong>{item.severity === "erro" ? "Erro" : "Aviso"}</strong>
                  {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="dgm-canvas"
        role="button"
        tabIndex={0}
        aria-label="Editor visual de diagrama"
        onKeyDown={(event) => {
          if (event.key === "Escape") setSelecao([]);
        }}
        onMouseMove={durante}
        onMouseUp={encerrar}
        onMouseLeave={encerrar}
      >
        <svg className="dgm-edges" aria-hidden="true">
          {edges.map((e) => {
            const de = nodes.find((n) => n.id === e.from);
            const para = nodes.find((n) => n.id === e.to);
            if (!de || !para) return null;
            return (
              <g key={e.id}>
                <path
                  d={routeToPath(orthogonalRoute(de, para))}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => {
          const spec = shapeSpec(n.shape);
          const cor = statusColor(n.statusValue);
          return (
            <div
              key={n.id}
              className={`dgm-node kind-${spec.kind} ${
                selecao.includes(n.id) ? "sel" : ""
              } ${ligando === n.id ? "origem" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Selecionar ${spec.label}`}
              style={{
                left: n.x,
                top: n.y,
                width: n.w,
                height: n.h,
                background: cor || undefined,
              }}
              onMouseDown={(e) => iniciarArraste(e, n)}
              onClick={(e) =>
                ligando === "aguardando" ? setLigando(n.id) : clicarNo(e, n)
              }
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (ligando === "aguardando") setLigando(n.id);
                else clicarNo(e, n);
              }}
            >
              <textarea
                aria-label={`Texto de ${spec.label}`}
                value={n.text}
                placeholder={spec.label}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  patch({
                    nodes: nodes.map((x) =>
                      x.id === n.id ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
              />
            </div>
          );
        })}
      </div>

      {selecao.length === 1 && (
        <div className="dgm-inspector">
          <strong>{shapeSpec(nodes.find((n) => n.id === selecao[0])?.shape).label}</strong>
          <label>
            Situação (pinta a forma)
            <input
              value={nodes.find((n) => n.id === selecao[0])?.statusValue || ""}
              placeholder="ok, atenção, atrasado..."
              onChange={(e) =>
                patch({
                  nodes: nodes.map((x) =>
                    x.id === selecao[0] ? { ...x, statusValue: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
          <button
            className="btn ghost sm danger"
            onClick={() => excluirNo(selecao[0])}
          >
            <Trash2 size={13} /> Excluir forma
          </button>
        </div>
      )}

      {importar && (
        <Modal title="Importar diagrama" onClose={() => setImportar(null)}>
          <div className="modal-body">
            <label className="dgm-field">
              Formato
              <select
                value={importar.formato}
                onChange={(e) =>
                  setImportar({ ...importar, formato: e.target.value })
                }
              >
                <option value="mermaid">Mermaid</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label className="dgm-field">
              Cole o conteúdo
              <textarea
                rows={9}
                placeholder={
                  importar.formato === "csv"
                    ? "tipo;id;forma;texto;x;y;de;para;rotulo"
                    : "flowchart TD\n  A[Pedido] --> B{Tem estoque?}"
                }
                value={importar.texto}
                onChange={(e) =>
                  setImportar({ ...importar, texto: e.target.value })
                }
              />
            </label>
            <p className="dgm-hint">
              Isso substitui o conteúdo atual do diagrama. VSDX do Visio e
              arquivos do Draw.io não são lidos: são formatos proprietários
              compactados, e prefiro não entregar um leitor que falha em silêncio.
            </p>
            <footer className="modal-foot">
              <button className="btn ghost" onClick={() => setImportar(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={aplicarImportacao}>
                Importar
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </section>
  );
}
