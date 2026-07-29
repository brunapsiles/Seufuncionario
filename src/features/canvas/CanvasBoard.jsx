import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Maximize2,
  Plus,
  Sparkles,
  ThumbsUp,
  Timer,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  BOARD_AI_MODES,
  BOARD_TEMPLATES,
  CANVAS_ELEMENT_TYPES,
  POSTIT_COLORS,
  applyTemplate,
  boardToTasks,
  buildBoardAiPrompt,
  clusterByProximity,
  fitView,
  formatSeconds,
  makeBoard,
  makeCanvasElement,
  makeView,
  moveElement,
  panBy,
  parseBoardGroups,
  screenToCanvas,
  timerState,
  toggleVote,
  topVoted,
  zoomAt,
} from "./canvasDomain.js";

const newId = () => `c-${Math.random().toString(36).slice(2, 10)}`;

export default function CanvasBoard({ db, update, business, setToast }) {
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [selecionadoEl, setSelecionadoEl] = useState(null);
  const [agora, setAgora] = useState(() => new Date().toISOString());
  const [aiModal, setAiModal] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const areaRef = useRef(null);
  const arraste = useRef(null);

  const quadros = useMemo(
    () =>
      (db.boards || []).filter((b) => !business || b.businessId === business.id),
    [db.boards, business],
  );
  const quadro = quadros.find((b) => b.id === selecionadoId) || quadros[0] || null;
  const elementos = quadro?.elements || [];
  const view = quadro?.view || makeView();
  const selecionado = elementos.find((e) => e.id === selecionadoEl) || null;
  const cronometro = timerState(quadro?.timerStartedAt, quadro?.timerSeconds, agora);
  const maisVotados = topVoted(elementos, 3);

  // O cronômetro precisa de um relógio que ande; a lógica em si é pura.
  useEffect(() => {
    if (!cronometro.running) return undefined;
    const id = setInterval(() => setAgora(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, [cronometro.running]);

  const patch = (campos) =>
    update((prev) => ({
      ...prev,
      boards: (prev.boards || []).map((b) =>
        b.id === quadro.id ? { ...b, ...campos } : b,
      ),
    }));
  const patchElementos = (mapper) =>
    patch({ elements: (quadro.elements || []).map(mapper) });

  const criarQuadro = (template) => {
    const board = makeBoard(newId(), {
      businessId: business?.id || null,
      ownerId: db.user?.id || null,
      name: template ? template.name : "Quadro sem nome",
    });
    if (template) board.elements = applyTemplate(template, newId);
    update((prev) => ({ ...prev, boards: [board, ...(prev.boards || [])] }));
    setSelecionadoId(board.id);
    setToast(template ? `Quadro "${template.name}" criado` : "Quadro criado");
  };

  const excluirQuadro = (id) => {
    if (!window.confirm("Excluir este quadro e tudo o que está nele?")) return;
    update((prev) => ({
      ...prev,
      boards: (prev.boards || []).filter((b) => b.id !== id),
    }));
    setSelecionadoId(null);
    setToast("Quadro excluído");
  };

  const adicionar = (type) => {
    const centroTela = {
      x: (areaRef.current?.clientWidth || 800) / 2,
      y: (areaRef.current?.clientHeight || 600) / 2,
    };
    const ponto = screenToCanvas(centroTela, view);
    const el = makeCanvasElement(type, {
      id: newId(),
      x: Math.round(ponto.x - 80),
      y: Math.round(ponto.y - 60),
    });
    patch({ elements: [...elementos, el] });
    setSelecionadoEl(el.id);
  };

  const excluirElemento = (id) => {
    patch({ elements: elementos.filter((e) => e.id !== id) });
    if (selecionadoEl === id) setSelecionadoEl(null);
  };

  // Pan no fundo, arraste no elemento.
  const iniciarArraste = (event, elemento) => {
    if (elemento?.locked) return;
    arraste.current = {
      id: elemento?.id || null,
      x: event.clientX,
      y: event.clientY,
    };
    if (elemento) setSelecionadoEl(elemento.id);
  };
  const durante = (event) => {
    const atual = arraste.current;
    if (!atual) return;
    const dx = event.clientX - atual.x;
    const dy = event.clientY - atual.y;
    if (dx === 0 && dy === 0) return;
    arraste.current = { ...atual, x: event.clientX, y: event.clientY };
    if (!atual.id) {
      patch({ view: panBy(view, dx, dy) });
      return;
    }
    const zoom = view.zoom || 1;
    patchElementos((el) =>
      el.id === atual.id ? moveElement(el, dx / zoom, dy / zoom) : el,
    );
  };
  const encerrarArraste = () => {
    arraste.current = null;
  };

  const aoRolar = (event) => {
    if (!quadro) return;
    event.preventDefault();
    const caixa = areaRef.current?.getBoundingClientRect();
    const ponto = {
      x: event.clientX - (caixa?.left || 0),
      y: event.clientY - (caixa?.top || 0),
    };
    patch({ view: zoomAt(view, ponto, event.deltaY < 0 ? 1.12 : 1 / 1.12) });
  };

  const enquadrar = () =>
    patch({
      view: fitView(elementos, {
        width: areaRef.current?.clientWidth || 800,
        height: areaRef.current?.clientHeight || 600,
      }),
    });

  const zoomBotao = (fator) =>
    patch({
      view: zoomAt(
        view,
        {
          x: (areaRef.current?.clientWidth || 800) / 2,
          y: (areaRef.current?.clientHeight || 600) / 2,
        },
        fator,
      ),
    });

  // Facilitação: agrupar post-its próximos, arrumando cada grupo em coluna.
  const agruparPostits = () => {
    const grupos = clusterByProximity(elementos, 220);
    if (grupos.length === 0) {
      setToast("Nenhum post-it para agrupar.");
      return;
    }
    const posicoes = new Map();
    grupos.forEach((grupo, coluna) => {
      grupo.forEach((el, linha) => {
        posicoes.set(el.id, { x: coluna * 200, y: linha * 140 });
      });
    });
    patchElementos((el) =>
      posicoes.has(el.id) ? { ...el, ...posicoes.get(el.id) } : el,
    );
    setToast(
      `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"} organizados`,
    );
  };

  const iniciarCronometro = (segundos) =>
    patch({ timerStartedAt: new Date().toISOString(), timerSeconds: segundos });
  const pararCronometro = () => patch({ timerStartedAt: "", timerSeconds: 0 });

  const votar = (id) =>
    patchElementos((el) =>
      el.id === id ? toggleVote(el, db.user?.id || "eu") : el,
    );

  const criarTarefas = () => {
    const tarefas = boardToTasks(elementos, { frameName: quadro?.name });
    if (tarefas.length === 0) {
      setToast("Escreva algo nos post-its antes de criar tarefas.");
      return;
    }
    update((prev) => ({
      ...prev,
      tasks: [
        ...tarefas.map((t) => ({
          id: newId(),
          title: t.title,
          status: "pendente",
          due: "",
          notes: t.votes > 0 ? `${t.notes} · ${t.votes} voto(s)` : t.notes,
          businessId: business?.id || null,
          ownerId: db.user?.id || null,
          boardId: quadro.id,
        })),
        ...(prev.tasks || []),
      ],
    }));
    setToast(
      `${tarefas.length} ${tarefas.length === 1 ? "tarefa criada" : "tarefas criadas"}`,
    );
  };

  const rodarIa = async (mode) => {
    setOcupado(true);
    try {
      const resposta = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: buildBoardAiPrompt(mode, elementos, quadro),
        }),
      });
      const dados = await resposta.json();
      const texto = dados?.text || dados?.reply || dados?.result || "";
      if (!resposta.ok || !texto) {
        setToast(dados?.error || "A IA não conseguiu responder agora.");
        return;
      }
      setAiModal({
        mode,
        texto,
        grupos: mode === "agrupar" ? parseBoardGroups(texto) : [],
      });
    } catch {
      setToast("Não foi possível falar com a IA agora.");
    } finally {
      setOcupado(false);
    }
  };

  if (quadros.length === 0)
    return (
      <section className="cvs">
        <header className="cvs-head">
          <div>
            <h2>Quadro visual</h2>
            <p>
              Um espaço sem fim para pensar: post-its, formas, setas e áreas. Dá
              para votar, cronometrar, agrupar por tema e virar tarefa.
            </p>
          </div>
        </header>
        <div className="cvs-empty">
          <h3>Nenhum quadro ainda</h3>
          <p>Comece de um modelo pronto ou de um quadro em branco.</p>
          <div className="cvs-templates">
            {BOARD_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => criarQuadro(t)}>
                <strong>{t.name}</strong>
                <small>{t.description}</small>
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => criarQuadro(null)}>
            <Plus size={16} /> Quadro em branco
          </button>
        </div>
      </section>
    );

  return (
    <section className="cvs">
      <header className="cvs-head">
        <div className="cvs-boards">
          <select
            aria-label="Quadro"
            value={quadro.id}
            onChange={(e) => {
              setSelecionadoId(e.target.value);
              setSelecionadoEl(null);
            }}
          >
            {quadros.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Nome do quadro"
            value={quadro.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <button className="btn ghost sm" onClick={() => criarQuadro(null)}>
            <Plus size={14} /> Novo
          </button>
          <button
            className="btn ghost sm danger"
            onClick={() => excluirQuadro(quadro.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <div className="cvs-toolbar">
        {CANVAS_ELEMENT_TYPES.map((t) => (
          <button key={t.id} onClick={() => adicionar(t.id)}>
            {t.label}
          </button>
        ))}
        <span className="cvs-sep" />
        <button onClick={() => zoomBotao(1.2)} aria-label="Aproximar">
          <ZoomIn size={15} />
        </button>
        <button onClick={() => zoomBotao(1 / 1.2)} aria-label="Afastar">
          <ZoomOut size={15} />
        </button>
        <button onClick={enquadrar} aria-label="Enquadrar tudo">
          <Maximize2 size={15} />
        </button>
        <small className="cvs-zoom">{Math.round((view.zoom || 1) * 100)}%</small>
      </div>

      <div className="cvs-facil">
        <button className="btn ghost sm" onClick={agruparPostits}>
          Agrupar post-its
        </button>
        <button
          className="btn ghost sm"
          onClick={() => patch({ votingOpen: !quadro.votingOpen })}
        >
          <ThumbsUp size={14} />
          {quadro.votingOpen ? "Encerrar votação" : "Abrir votação"}
        </button>
        {cronometro.running ? (
          <button className="btn ghost sm" onClick={pararCronometro}>
            <Timer size={14} /> {formatSeconds(cronometro.remaining)}
          </button>
        ) : (
          <>
            <button className="btn ghost sm" onClick={() => iniciarCronometro(300)}>
              <Timer size={14} /> 5 min
            </button>
            <button className="btn ghost sm" onClick={() => iniciarCronometro(600)}>
              10 min
            </button>
          </>
        )}
        {cronometro.expired && quadro.timerSeconds > 0 && (
          <strong className="cvs-timer-end">Tempo encerrado</strong>
        )}
        <span className="cvs-sep" />
        <button className="btn ghost sm" onClick={criarTarefas}>
          <CheckSquare size={14} /> Virar tarefas
        </button>
        {BOARD_AI_MODES.map((m) => (
          <button
            key={m.id}
            className="btn ghost sm"
            disabled={ocupado}
            onClick={() => rodarIa(m.id)}
          >
            <Sparkles size={14} /> {m.label}
          </button>
        ))}
      </div>

      {maisVotados.length > 0 && (
        <div className="cvs-top">
          <strong>Mais votados:</strong>
          {maisVotados.map(({ element, votes }) => (
            <span key={element.id}>
              {element.text || "(sem texto)"} · {votes}
            </span>
          ))}
        </div>
      )}

      <div
        className="cvs-area"
        ref={areaRef}
        onWheel={aoRolar}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || e.target.dataset.bg) {
            setSelecionadoEl(null);
            iniciarArraste(e, null);
          }
        }}
        onMouseMove={durante}
        onMouseUp={encerrarArraste}
        onMouseLeave={encerrarArraste}
      >
        <div className="cvs-bg" data-bg="1" />
        <div
          className="cvs-world"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {elementos.map((el) => (
            <div
              key={el.id}
              className={`cvs-el cvs-${el.type} ${
                selecionadoEl === el.id ? "sel" : ""
              }`}
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.type === "arrow" ? 3 : el.h,
                background: el.color || undefined,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                iniciarArraste(e, el);
              }}
            >
              {el.type === "frame" ? (
                <input
                  className="cvs-frame-title"
                  aria-label="Nome da área"
                  value={el.text}
                  onChange={(e) =>
                    patchElementos((x) =>
                      x.id === el.id ? { ...x, text: e.target.value } : x,
                    )
                  }
                />
              ) : el.type === "arrow" ? null : (
                <textarea
                  aria-label={`Texto do ${el.type}`}
                  value={el.text}
                  placeholder="Escreva aqui"
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    patchElementos((x) =>
                      x.id === el.id ? { ...x, text: e.target.value } : x,
                    )
                  }
                />
              )}
              {quadro.votingOpen && el.type === "postit" && (
                <button
                  className="cvs-vote"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => votar(el.id)}
                  aria-label={`Votar em ${el.text || "post-it"}`}
                >
                  <ThumbsUp size={12} /> {(el.votes || []).length}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {selecionado && (
        <div className="cvs-inspector">
          <strong>{selecionado.type}</strong>
          {selecionado.type === "postit" && (
            <div className="cvs-colors">
              {POSTIT_COLORS.map((cor) => (
                <button
                  key={cor}
                  style={{ background: cor }}
                  aria-label={`Cor ${cor}`}
                  onClick={() =>
                    patchElementos((x) =>
                      x.id === selecionado.id ? { ...x, color: cor } : x,
                    )
                  }
                />
              ))}
            </div>
          )}
          <button
            className="btn ghost sm danger"
            onClick={() => excluirElemento(selecionado.id)}
          >
            <Trash2 size={13} /> Excluir
          </button>
        </div>
      )}

      {aiModal && (
        <Modal
          title={BOARD_AI_MODES.find((m) => m.id === aiModal.mode)?.label || "IA"}
          onClose={() => setAiModal(null)}
        >
          <div className="modal-body">
            {aiModal.grupos.length > 0 ? (
              <div className="cvs-ai-groups">
                {aiModal.grupos.map((g) => (
                  <section key={g.theme}>
                    <h4>{g.theme}</h4>
                    <ul>
                      {g.items.map((item, i) => (
                        <li key={`${g.theme}-${i}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="cvs-ai-text">{aiModal.texto}</p>
            )}
            <footer className="modal-foot">
              <button className="btn" onClick={() => setAiModal(null)}>
                Fechar
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </section>
  );
}
