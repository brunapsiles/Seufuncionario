import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  GOAL_CYCLES,
  KEY_RESULT_TYPES,
  appendProgressPoint,
  cycleRange,
  goalStatus,
  goalsSummary,
  keyResultLabel,
  keyResultProgress,
  makeKeyResult,
  makeObjective,
  objectiveProgress,
  resolveAutoProgress,
} from "./goalsDomain.js";

const pct = (value) => `${Math.round(value * 100)}%`;
const newId = () => `g-${Math.random().toString(36).slice(2, 10)}`;
const hoje = () => new Date().toISOString().slice(0, 10);

const STATUS_ICON = {
  concluida: BadgeCheck,
  "no-prazo": TrendingUp,
  atencao: AlertTriangle,
  risco: AlertTriangle,
  encerrada: X,
};

// Mini gráfico do histórico de progresso, em SVG puro (sem biblioteca).
function ProgressSpark({ history }) {
  const points = (history || []).slice(-20);
  if (points.length < 2) return null;
  const width = 160;
  const height = 36;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - p.progress * height}`)
    .join(" ");
  return (
    <svg
      className="goal-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Evolução do progresso"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function KeyResultRow({ kr, onChange, onRemove, projectOptions }) {
  const progresso = keyResultProgress(kr);
  const automatico = kr.type === "tarefas";
  return (
    <div className="kr-row">
      <div className="kr-main">
        <input
          className="kr-title"
          placeholder="Resultado-chave (ex.: fechar 10 contratos)"
          value={kr.title}
          onChange={(e) => onChange({ ...kr, title: e.target.value })}
        />
        <select
          aria-label="Tipo do resultado-chave"
          value={kr.type}
          onChange={(e) => onChange({ ...kr, type: e.target.value })}
        >
          {KEY_RESULT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kr-values">
        {kr.type === "numero" && (
          <>
            <label>
              De
              <input
                type="number"
                value={kr.start}
                onChange={(e) => onChange({ ...kr, start: e.target.value })}
              />
            </label>
            <label>
              Até
              <input
                type="number"
                value={kr.target}
                onChange={(e) => onChange({ ...kr, target: e.target.value })}
              />
            </label>
            <label>
              Hoje
              <input
                type="number"
                value={kr.current}
                onChange={(e) => onChange({ ...kr, current: e.target.value })}
              />
            </label>
            <label>
              Unidade
              <input
                placeholder="clientes, R$..."
                value={kr.unit}
                onChange={(e) => onChange({ ...kr, unit: e.target.value })}
              />
            </label>
          </>
        )}
        {kr.type === "percentual" && (
          <label>
            Progresso (%)
            <input
              type="number"
              min="0"
              max="100"
              value={kr.current}
              onChange={(e) => onChange({ ...kr, current: e.target.value })}
            />
          </label>
        )}
        {kr.type === "marco" && (
          <label className="kr-check">
            <input
              type="checkbox"
              checked={!!kr.done}
              onChange={(e) => onChange({ ...kr, done: e.target.checked })}
            />
            Marco concluído
          </label>
        )}
        {automatico && (
          <label>
            Projeto ligado
            <select
              value={kr.linkedProject || ""}
              onChange={(e) => onChange({ ...kr, linkedProject: e.target.value })}
            >
              <option value="">Escolha um projeto</option>
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Peso
          <input
            type="number"
            min="0"
            step="0.5"
            value={kr.weight}
            onChange={(e) => onChange({ ...kr, weight: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn ghost sm danger"
          onClick={onRemove}
          title="Remover resultado-chave"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="kr-progress">
        <div className="kr-bar">
          <span style={{ width: pct(progresso) }} />
        </div>
        <small>
          {keyResultLabel(kr)} · {pct(progresso)}
          {automatico && " (automático)"}
        </small>
      </div>
    </div>
  );
}

export default function Goals({ db, update, business, setToast }) {
  const [modal, setModal] = useState(null);
  const [cycleFilter, setCycleFilter] = useState("todos");

  const tasks = useMemo(
    () => (db.tasks || []).filter((t) => !business || t.businessId === business.id),
    [db.tasks, business],
  );
  const projectOptions = useMemo(
    () => [
      ...new Set([
        ...(db.projects || []).map((p) => p.name),
        ...tasks.map((t) => t.project).filter(Boolean),
      ]),
    ],
    [db.projects, tasks],
  );

  const objetivos = useMemo(() => {
    const lista = (db.objectives || []).filter(
      (o) => !business || o.businessId === business.id,
    );
    const resolvidos = lista.map((o) => resolveAutoProgress(o, { tasks }));
    return cycleFilter === "todos"
      ? resolvidos
      : resolvidos.filter((o) => o.cycle === cycleFilter);
  }, [db.objectives, business, tasks, cycleFilter]);

  const resumo = goalsSummary(objetivos, hoje());

  const persist = (objective) =>
    update((prev) => ({
      ...prev,
      objectives: (prev.objectives || []).some((o) => o.id === objective.id)
        ? (prev.objectives || []).map((o) =>
            o.id === objective.id ? objective : o,
          )
        : [objective, ...(prev.objectives || [])],
    }));

  const salvar = (objective) => {
    if (!objective.title.trim()) return;
    // O histórico usa o objetivo com o progresso automático já resolvido,
    // mas guardamos o objetivo original para não gravar contagens derivadas.
    const resolvido = resolveAutoProgress(objective, { tasks });
    const comHistorico = appendProgressPoint(resolvido, new Date().toISOString());
    persist({ ...objective, history: comHistorico.history });
    setModal(null);
    setToast("Meta salva");
  };

  const excluir = (id) => {
    if (!window.confirm("Excluir esta meta e seus resultados-chave?")) return;
    update((prev) => ({
      ...prev,
      objectives: (prev.objectives || []).filter((o) => o.id !== id),
    }));
    setToast("Meta excluída");
  };

  const abrirNova = () =>
    setModal({
      ...makeObjective(newId(), {
        businessId: business?.id || null,
        ownerId: db.user?.id || null,
      }),
      keyResults: [makeKeyResult(newId())],
    });

  return (
    <section className="goals">
      <header className="goals-head">
        <div>
          <h2>
            <Target size={20} /> Metas e OKRs
          </h2>
          <p>
            Defina objetivos com resultados-chave mensuráveis. O progresso é
            calculado sozinho e comparado com o tempo já decorrido do ciclo.
          </p>
        </div>
        <button className="btn" onClick={abrirNova}>
          <Plus size={16} /> Nova meta
        </button>
      </header>

      <div className="goals-toolbar">
        <span className="goals-filter-label" aria-hidden="true">
          Ciclo:
        </span>
        <select
          aria-label="Filtrar por ciclo"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
        >
          <option value="todos">Todos os ciclos</option>
          {GOAL_CYCLES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {objetivos.length > 0 && (
        <div className="goals-summary">
          <article>
            <strong>{resumo.total}</strong>
            <small>metas</small>
          </article>
          <article>
            <strong>{pct(resumo.progressoMedio)}</strong>
            <small>progresso médio</small>
          </article>
          <article className="ok">
            <strong>{resumo.concluidas + resumo.noPrazo}</strong>
            <small>no ritmo ou concluídas</small>
          </article>
          <article className="warn">
            <strong>{resumo.atencao + resumo.risco}</strong>
            <small>precisam de atenção</small>
          </article>
        </div>
      )}

      {objetivos.length === 0 ? (
        <div className="goals-empty">
          <Target size={30} />
          <h3>Nenhuma meta ainda</h3>
          <p>
            Uma boa meta tem um objetivo claro e de dois a quatro resultados-chave
            que dá para medir. Exemplo: “Faturar com previsibilidade” com
            “fechar 10 contratos” e “manter 3 clientes recorrentes”.
          </p>
          <button className="btn" onClick={abrirNova}>
            <Plus size={16} /> Criar a primeira meta
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {objetivos.map((obj) => {
            const status = goalStatus(obj, hoje());
            const range = cycleRange(obj.cycle, obj.reference);
            const Icon = STATUS_ICON[status.state] || TrendingUp;
            return (
              <article key={obj.id} className={`goal-card ${status.state}`}>
                <header>
                  <h3>{obj.title}</h3>
                  <span className={`goal-status ${status.state}`}>
                    <Icon size={13} /> {status.label}
                  </span>
                </header>
                {obj.description && <p className="goal-desc">{obj.description}</p>}
                <small className="goal-cycle">{range.label}</small>
                <div className="goal-bar">
                  <span style={{ width: pct(status.progress) }} />
                  <i
                    className="goal-expected"
                    style={{ left: pct(status.elapsed) }}
                    title="Onde a meta deveria estar hoje"
                  />
                </div>
                <div className="goal-numbers">
                  <strong>{pct(status.progress)}</strong>
                  <small>tempo decorrido: {pct(status.elapsed)}</small>
                </div>
                <ProgressSpark history={obj.history} />
                <ul className="goal-krs">
                  {(obj.keyResults || []).map((kr) => (
                    <li key={kr.id}>
                      <span>{kr.title || "Resultado-chave sem título"}</span>
                      <small>{keyResultLabel(kr)}</small>
                    </li>
                  ))}
                  {(obj.keyResults || []).length === 0 && (
                    <li className="goal-kr-empty">Sem resultados-chave ainda</li>
                  )}
                </ul>
                <footer>
                  <button
                    className="btn ghost sm"
                    onClick={() =>
                      setModal(
                        (db.objectives || []).find((o) => o.id === obj.id) || obj,
                      )
                    }
                  >
                    Editar
                  </button>
                  <button
                    className="btn ghost sm danger"
                    onClick={() => excluir(obj.id)}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.title ? "Editar meta" : "Nova meta"}
          onClose={() => setModal(null)}
          wide
        >
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              salvar(modal);
            }}
          >
            <label className="goal-field">
              Objetivo
              <input
                required
                autoFocus
                placeholder="O que você quer alcançar?"
                value={modal.title}
                onChange={(e) => setModal({ ...modal, title: e.target.value })}
              />
            </label>
            <label className="goal-field">
              Por que essa meta importa (opcional)
              <textarea
                rows={2}
                value={modal.description}
                onChange={(e) =>
                  setModal({ ...modal, description: e.target.value })
                }
              />
            </label>
            <div className="goal-field-row">
              <label className="goal-field">
                Ciclo
                <select
                  value={modal.cycle}
                  onChange={(e) => setModal({ ...modal, cycle: e.target.value })}
                >
                  {GOAL_CYCLES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="goal-field">
                Data de referência
                <input
                  type="date"
                  value={modal.reference}
                  onChange={(e) =>
                    setModal({ ...modal, reference: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="goal-range-hint">
              Período: {cycleRange(modal.cycle, modal.reference).label}
            </p>

            <div className="goal-krs-edit">
              <h4>Resultados-chave</h4>
              {(modal.keyResults || []).map((kr, index) => (
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  projectOptions={projectOptions}
                  onChange={(next) =>
                    setModal({
                      ...modal,
                      keyResults: modal.keyResults.map((k, i) =>
                        i === index ? next : k,
                      ),
                    })
                  }
                  onRemove={() =>
                    setModal({
                      ...modal,
                      keyResults: modal.keyResults.filter((_, i) => i !== index),
                    })
                  }
                />
              ))}
              <button
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  setModal({
                    ...modal,
                    keyResults: [...(modal.keyResults || []), makeKeyResult(newId())],
                  })
                }
              >
                <Plus size={14} /> Adicionar resultado-chave
              </button>
            </div>

            <p className="goal-preview">
              Progresso desta meta:{" "}
              <strong>
                {pct(objectiveProgress(resolveAutoProgress(modal, { tasks })))}
              </strong>
            </p>

            <footer className="modal-foot">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="btn" type="submit">
                Salvar meta
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </section>
  );
}
