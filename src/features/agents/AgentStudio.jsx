import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ClipboardList,
  Play,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  AGENT_SCHEDULES,
  AUTONOMY_LEVELS,
  approvalReason,
  approveStep,
  buildPlanPrompt,
  canContinue,
  checkAcceptance,
  completeStep,
  deriveStatus,
  describeStep,
  failStep,
  findTool,
  isExternalAction,
  logDecision,
  makeAgent,
  makeRun,
  needsApproval,
  nextStep,
  parsePlan,
  pendingApprovals,
  rejectStep,
  resumeRun,
  runBudget,
  RUN_STATUS,
} from "./agentDomain.js";

const newId = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const hoje = () => new Date().toISOString().slice(0, 10);

export default function AgentStudio({ db, update, business, setToast }) {
  const [aba, setAba] = useState("agentes");
  const [selecionado, setSelecionado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [novo, setNovo] = useState({
    name: "",
    goal: "",
    autonomy: "planejar",
    maxSteps: 8,
    schedule: "manual",
    acceptance: "",
  });

  const doNegocio = (lista) =>
    (lista || []).filter(
      (x) => !business || !x.businessId || x.businessId === business.id,
    );

  const agentes = useMemo(() => doNegocio(db.agents), [db.agents, business]);
  const execucoes = useMemo(() => doNegocio(db.agentRuns), [db.agentRuns, business]);
  const agente = useMemo(
    () => agentes.find((a) => a.id === selecionado) || null,
    [agentes, selecionado],
  );
  const execucao = useMemo(
    () =>
      execucoes
        .filter((r) => r.agentId === selecionado)
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0] || null,
    [execucoes, selecionado],
  );
  const aprovacoes = useMemo(
    () => pendingApprovals(execucoes, agentes),
    [execucoes, agentes],
  );

  const salvarExecucao = (proxima, extra = {}) =>
    update({
      ...db,
      agentRuns: (db.agentRuns || []).some((r) => r.id === proxima.id)
        ? (db.agentRuns || []).map((r) => (r.id === proxima.id ? proxima : r))
        : [...(db.agentRuns || []), proxima],
      ...extra,
    });

  const criarAgente = () => {
    if (!novo.name.trim() || !novo.goal.trim()) {
      setToast?.("Dê um nome e diga o objetivo do agente.");
      return;
    }
    const a = {
      ...makeAgent(newId("ag"), {
        ...novo,
        acceptance: novo.acceptance.split("\n"),
        businessId: business?.id || "",
      }),
      schedule: novo.schedule,
    };
    update({ ...db, agents: [...(db.agents || []), a] });
    setSelecionado(a.id);
    setNovo({
      name: "",
      goal: "",
      autonomy: "planejar",
      maxSteps: 8,
      schedule: "manual",
      acceptance: "",
    });
  };

  const apagarAgente = (id) => {
    if (!window.confirm("Apagar este agente e o histórico dele?")) return;
    update({
      ...db,
      agents: (db.agents || []).filter((a) => a.id !== id),
      agentRuns: (db.agentRuns || []).filter((r) => r.agentId !== id),
    });
    if (selecionado === id) setSelecionado("");
  };

  // Contexto real do workspace, para a IA não planejar no vácuo.
  const contexto = () => {
    const partes = [];
    if (business?.name) partes.push(`Negócio: ${business.name}`);
    const tarefas = (db.tasks || []).filter((t) => t.status !== "Concluído");
    if (tarefas.length) partes.push(`${tarefas.length} tarefa(s) em aberto`);
    const contas = (db.bills || []).filter((b) => b.status !== "pago");
    if (contas.length) partes.push(`${contas.length} conta(s) em aberto`);
    if (agente?.memory?.length)
      partes.push(
        `O que já aprendi antes: ${agente.memory.map((m) => m.text).join("; ")}`,
      );
    return partes.join("\n");
  };

  const planejar = async () => {
    if (!agente) return;
    setOcupado(true);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: buildPlanPrompt(agente, contexto()) }),
      });
      const dados = await r.json();
      const texto = dados?.text || dados?.reply || dados?.result || "";
      if (!r.ok || !texto) {
        setToast?.(dados?.error || "A IA não conseguiu montar o plano agora.");
        return;
      }
      const passos = parsePlan(texto);
      if (!passos.length) {
        setToast?.("A IA respondeu, mas não veio um plano em passos. Tente reescrever o objetivo.");
        return;
      }
      let nova = makeRun(newId("run"), {
        agentId: agente.id,
        goal: agente.goal,
        steps: passos,
        businessId: business?.id || "",
      });
      nova = logDecision(nova, `Montei um plano de ${passos.length} passo(s).`);
      nova = { ...nova, status: deriveStatus(nova, agente) };
      salvarExecucao(nova);
      setAba("execucao");
    } catch {
      setToast?.("Não foi possível falar com a IA agora.");
    } finally {
      setOcupado(false);
    }
  };

  // Executa um passo de verdade. Recebe e devolve o banco em vez de gravar
  // direto: gravar dentro do laço faria cada passo partir de uma cópia velha,
  // e a gravação final apagaria o que os passos anteriores criaram — o agente
  // dizia "criei a tarefa" e a tarefa sumia. Uma gravação só, no fim.
  const executarPasso = (dbAtual, run, passo) => {
    const ferramenta = findTool(passo.toolId);
    if (!ferramenta) return { erro: "essa ferramenta não existe no app" };
    const a = passo.args || {};

    switch (passo.toolId) {
      case "buscar_workspace": {
        const termo = String(a.termo || "").toLowerCase();
        const achados = (dbAtual.tasks || []).filter((t) =>
          String(t.title || "").toLowerCase().includes(termo),
        );
        return { resultado: `achei ${achados.length} item(ns) com "${a.termo || ""}"` };
      }
      case "ler_financeiro": {
        const abertas = (dbAtual.bills || []).filter((b) => b.status !== "pago");
        return { resultado: `${abertas.length} conta(s) em aberto` };
      }
      case "ler_agenda": {
        const proximos = (dbAtual.appointments || []).filter((c) => (c.date || "") >= hoje());
        return { resultado: `${proximos.length} compromisso(s) daqui para frente` };
      }
      case "ler_crm": {
        return {
          resultado: `${(dbAtual.opportunities || []).length} oportunidade(s) e ${(dbAtual.contacts || []).length} contato(s)`,
        };
      }
      case "resumir":
        return {
          resultado:
            run.steps
              .filter((s) => s.status === "feito" && s.result)
              .map((s) => s.result)
              .join("; ") || "não havia nada lido para resumir",
        };
      case "criar_tarefa": {
        const t = {
          id: newId("t"),
          title: a.titulo || passo.title,
          status: "pendente",
          due: a.prazo || "",
          notes: `Criada pelo agente "${agente?.name || ""}".`,
          businessId: business?.id || "",
        };
        return {
          resultado: `criei a tarefa "${t.title}"`,
          db: { ...dbAtual, tasks: [...(dbAtual.tasks || []), t] },
        };
      }
      case "criar_nota": {
        const n = {
          id: newId("nt"),
          title: a.titulo || passo.title,
          content: a.texto || "",
          kind: "nota",
          date: "",
          tags: [],
          businessId: business?.id || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return {
          resultado: `criei a nota "${n.title}"`,
          db: { ...dbAtual, notes: [...(dbAtual.notes || []), n] },
        };
      }
      case "criar_documento": {
        const d = {
          id: newId("doc"),
          title: a.titulo || passo.title,
          content: a.texto || "",
          businessId: business?.id || "",
          updatedAt: new Date().toISOString(),
        };
        return {
          resultado: `escrevi o documento "${d.title}"`,
          db: { ...dbAtual, documents: [...(dbAtual.documents || []), d] },
        };
      }
      case "agendar_compromisso": {
        const c = {
          id: newId("ap"),
          title: a.titulo || passo.title,
          date: a.data || "",
          time: a.hora || "",
          businessId: business?.id || "",
        };
        return {
          resultado: `marquei "${c.title}"`,
          db: { ...dbAtual, appointments: [...(dbAtual.appointments || []), c] },
        };
      }
      case "registrar_lancamento": {
        const valor = Number(String(a.valor || "").replace(/[^\d,.-]/g, "").replace(",", "."));
        if (!Number.isFinite(valor) || valor === 0)
          return { erro: "o valor do lançamento não veio em número" };
        const l = {
          id: newId("tx"),
          type: a.tipo === "receita" ? "Receita" : "Despesa",
          description: a.descricao || passo.title,
          value: Math.abs(valor),
          date: a.data || hoje(),
          category: a.categoria || "Outros",
          businessId: business?.id || "",
        };
        return {
          resultado: `lancei ${l.description} de R$ ${l.value}`,
          db: { ...dbAtual, transactions: [...(dbAtual.transactions || []), l] },
        };
      }
      case "rascunhar_email": {
        const e = {
          id: newId("em"),
          to: a.para || "",
          subject: a.assunto || passo.title,
          body: a.texto || "",
          status: "rascunho",
          businessId: business?.id || "",
        };
        return {
          resultado: `rascunhei o e-mail para ${e.to || "—"}`,
          db: { ...dbAtual, emailDrafts: [...(dbAtual.emailDrafts || []), e] },
        };
      }
      case "enviar_email":
      case "enviar_whatsapp":
      case "publicar_site":
        // Envio de verdade depende de credencial que ainda não existe no cofre
        // (ver PENDENCIAS_DA_TITULAR.md). Em vez de fingir que enviou, o passo
        // para e diz exatamente o que falta — mentir aqui seria pior que falhar.
        return {
          erro:
            "ainda não dá para enviar: falta conectar a conta de envio (está nas pendências da titular)",
        };
      default:
        return { erro: "não sei executar esse passo" };
    }
  };

  const rodar = () => {
    if (!agente || !execucao) return;
    let run = execucao;
    // O banco vai sendo carregado de passo em passo e só é gravado no fim,
    // junto com a execução. Assim o que o agente criou não é perdido pela
    // gravação seguinte, e um passo enxerga o que o anterior fez.
    let trabalho = db;
    setOcupado(true);
    try {
      for (let i = 0; i < 30; i += 1) {
        const pode = canContinue(run, agente);
        if (!pode.ok) {
          run = logDecision(run, `Parei: ${pode.reason}.`, "aviso");
          break;
        }
        const passo = nextStep(run);
        if (passo.status === "pendente" && needsApproval(passo, agente)) {
          run = logDecision(
            run,
            `Parei no passo "${passo.title}" para você aprovar: ${approvalReason(passo, agente)}.`,
            "aprovacao",
          );
          break;
        }
        const saida = executarPasso(trabalho, run, passo);
        if (saida.erro) {
          run = failStep(run, passo.id, saida.erro);
          run = logDecision(run, `"${passo.title}" falhou: ${saida.erro}.`, "erro");
        } else {
          if (saida.db) trabalho = saida.db;
          run = completeStep(run, passo.id, saida.resultado);
          run = logDecision(
            run,
            `${isExternalAction(passo) ? "ENVIEI PARA FORA — " : ""}${passo.title}: ${saida.resultado}`,
            isExternalAction(passo) ? "externo" : "info",
          );
        }
      }
      run = { ...run, status: deriveStatus(run, agente) };
      if (["concluido", "falhou"].includes(run.status))
        run = { ...run, finishedAt: new Date().toISOString() };

      const anteriores = trabalho.agentRuns || [];
      update({
        ...trabalho,
        agentRuns: anteriores.some((r) => r.id === run.id)
          ? anteriores.map((r) => (r.id === run.id ? run : r))
          : [...anteriores, run],
      });
    } finally {
      setOcupado(false);
    }
  };

  const aprovar = (runId, stepId) => {
    const run = execucoes.find((r) => r.id === runId);
    if (!run) return;
    const a = agentes.find((x) => x.id === run.agentId);
    let proxima = approveStep(run, stepId);
    proxima = logDecision(proxima, "Você aprovou este passo.", "aprovacao");
    salvarExecucao({ ...proxima, status: deriveStatus(proxima, a) });
  };

  const recusar = (runId, stepId) => {
    const run = execucoes.find((r) => r.id === runId);
    if (!run) return;
    const a = agentes.find((x) => x.id === run.agentId);
    let proxima = rejectStep(run, stepId);
    proxima = logDecision(
      proxima,
      "Você recusou este passo. Quem dependia dele foi pulado.",
      "aprovacao",
    );
    salvarExecucao({ ...proxima, status: deriveStatus(proxima, a) });
  };

  const cancelar = () => {
    if (!execucao) return;
    salvarExecucao({ ...execucao, status: "cancelado", finishedAt: new Date().toISOString() });
  };

  const retomar = () => {
    if (!execucao || !agente) return;
    salvarExecucao(resumeRun(execucao, agente));
    setToast?.("Retomei de onde parou. Passo já feito não é refeito.");
  };

  const conferencia = useMemo(
    () => (execucao && agente ? checkAcceptance(execucao, agente) : null),
    [execucao, agente],
  );
  const orcamento = useMemo(
    () => (execucao && agente ? runBudget(execucao, agente) : null),
    [execucao, agente],
  );

  const nivelEscolhido = AUTONOMY_LEVELS.find((n) => n.id === novo.autonomy);

  return (
    <section className="section ag">
      <header className="section-head">
        <div>
          <h2>Agentes</h2>
          <p className="muted">
            Você diz o objetivo, a IA monta o passo a passo e executa. Você decide
            quanto ela pode fazer sozinha.
          </p>
        </div>
      </header>

      {/* Aviso fixo, não some e não fecha: quem lê isso antes de soltar um
          agente decide melhor o quanto de autonomia quer dar. */}
      <p className="ag-disclaimer">
        <AlertTriangle size={16} />
        <span>
          <strong>A IA pode errar.</strong> Ela entende mal um pedido, inventa
          dado que não existe e às vezes faz uma coisa parecida com a que você
          pediu, mas não a certa. Confira o que ela fez antes de considerar
          pronto — principalmente lançamento de dinheiro e mensagem enviada em
          seu nome, que não dá para desfazer.
        </span>
      </p>

      <div className="ag-tabs" role="tablist">
        {[
          ["agentes", "Meus agentes", Bot],
          ["execucao", "Execução", Play],
          ["aprovacoes", `Aprovações${aprovacoes.length ? ` (${aprovacoes.length})` : ""}`, ClipboardList],
        ].map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            className={aba === id ? "active" : ""}
            onClick={() => setAba(id)}
          >
            <Icone size={15} /> {rotulo}
          </button>
        ))}
      </div>

      {aba === "agentes" && (
        <>
          <div className="ag-new">
            <h3>Novo agente</h3>
            <div className="ag-form">
              <label>
                Nome
                <input
                  aria-label="Nome do agente"
                  value={novo.name}
                  onChange={(e) => setNovo((n) => ({ ...n, name: e.target.value }))}
                  placeholder="Assistente de cobrança"
                />
              </label>
              <label className="wide">
                O que ele deve fazer
                <input
                  aria-label="Objetivo do agente"
                  value={novo.goal}
                  onChange={(e) => setNovo((n) => ({ ...n, goal: e.target.value }))}
                  placeholder="Ver quem está devendo e preparar a cobrança"
                />
              </label>
              <label>
                Quanto ele pode fazer sozinho
                <select
                  aria-label="Nível de autonomia"
                  value={novo.autonomy}
                  onChange={(e) => setNovo((n) => ({ ...n, autonomy: e.target.value }))}
                >
                  {AUTONOMY_LEVELS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Máximo de passos
                <input
                  aria-label="Máximo de passos"
                  type="number"
                  min="1"
                  max="30"
                  value={novo.maxSteps}
                  onChange={(e) =>
                    setNovo((n) => ({ ...n, maxSteps: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                Quando rodar
                <select
                  aria-label="Quando rodar"
                  value={novo.schedule}
                  onChange={(e) => setNovo((n) => ({ ...n, schedule: e.target.value }))}
                >
                  {AGENT_SCHEDULES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Só está pronto quando (um por linha)
                <textarea
                  aria-label="Critérios de aceite"
                  rows={2}
                  value={novo.acceptance}
                  onChange={(e) =>
                    setNovo((n) => ({ ...n, acceptance: e.target.value }))
                  }
                  placeholder={"A lista de devedores estiver pronta\nCada cobrança tiver valor e prazo"}
                />
              </label>
            </div>

            {nivelEscolhido && (
              <p className={`ag-hint${nivelEscolhido.warn ? " warn" : ""}`}>
                {nivelEscolhido.warn && <AlertTriangle size={15} />}
                {nivelEscolhido.hint}
              </p>
            )}

            <button type="button" className="btn primary" onClick={criarAgente}>
              <Plus size={15} /> Criar agente
            </button>
          </div>

          {!agentes.length && (
            <p className="muted">Nenhum agente ainda. Crie o primeiro acima.</p>
          )}

          <ul className="ag-list">
            {agentes.map((a) => {
              const nivel = AUTONOMY_LEVELS.find((n) => n.id === a.autonomy);
              return (
                <li key={a.id} className={a.id === selecionado ? "active" : ""}>
                  <button
                    type="button"
                    className="ag-pick"
                    onClick={() => {
                      setSelecionado(a.id);
                      setAba("execucao");
                    }}
                  >
                    <strong>{a.name}</strong>
                    <span className="muted">{a.goal}</span>
                    <span className={`ag-level${nivel?.warn ? " warn" : ""}`}>
                      {nivel?.label || "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn tiny"
                    aria-label={`Apagar ${a.name}`}
                    onClick={() => apagarAgente(a.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {aba === "execucao" && (
        <>
          {!agente && <p className="muted">Escolha um agente na aba anterior.</p>}
          {agente && (
            <>
              <div className="ag-run-head">
                <div>
                  <h3>{agente.name}</h3>
                  <p className="muted">{agente.goal}</p>
                </div>
                <div className="ag-run-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={ocupado}
                    onClick={planejar}
                  >
                    {ocupado ? "Pensando..." : "Montar plano"}
                  </button>
                  {execucao && (
                    <>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={ocupado}
                        onClick={rodar}
                      >
                        <Play size={15} /> Executar
                      </button>
                      <button type="button" className="btn" onClick={retomar}>
                        Retomar
                      </button>
                      <button type="button" className="btn" onClick={cancelar}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!execucao && (
                <p className="muted">
                  Ainda não há plano. Clique em “Montar plano” e a IA escreve o
                  passo a passo antes de fazer qualquer coisa.
                </p>
              )}

              {execucao && (
                <>
                  <p className="ag-status">
                    <strong>{RUN_STATUS[execucao.status] || execucao.status}</strong>
                    {orcamento && (
                      <span className="muted">
                        {" "}
                        · {orcamento.used} de {orcamento.limit} passos usados
                      </span>
                    )}
                  </p>

                  <ol className="ag-steps">
                    {execucao.steps.map((s) => {
                      // Só o passo da vez pede aprovação. Aprovar um passo cuja
                      // dependência ainda nem rodou seria decidir no escuro:
                      // ele pode nem chegar a existir se o anterior for recusado.
                      const daVez = nextStep(execucao)?.id === s.id;
                      const precisa =
                        daVez && s.status === "pendente" && needsApproval(s, agente);
                      return (
                        <li key={s.id} className={`st-${s.status}`}>
                          <div className="ag-step-main">
                            <strong>{s.title}</strong>
                            <span className="muted">{describeStep(s)}</span>
                            {s.result && <span className="ag-result">{s.result}</span>}
                            {s.error && <span className="ag-error">{s.error}</span>}
                          </div>
                          <div className="ag-step-side">
                            {isExternalAction(s) && (
                              <span className="ag-ext">
                                <Send size={12} /> sai para fora
                              </span>
                            )}
                            {precisa && (
                              <>
                                <span className="muted ag-why">
                                  {approvalReason(s, agente)}
                                </span>
                                <button
                                  type="button"
                                  className="btn tiny"
                                  onClick={() => aprovar(execucao.id, s.id)}
                                >
                                  <Check size={13} /> Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="btn tiny"
                                  onClick={() => recusar(execucao.id, s.id)}
                                >
                                  <X size={13} /> Recusar
                                </button>
                              </>
                            )}
                            {!precisa && <span className="ag-badge">{s.status}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {conferencia?.checked && (
                    <section className="ag-check">
                      <h4>Conferência dos critérios</h4>
                      <ul>
                        {conferencia.items.map((i, k) => (
                          <li key={k}>
                            <strong>{i.criterion}</strong> — {i.evidence}
                          </li>
                        ))}
                      </ul>
                      <p className="muted">{conferencia.note}</p>
                    </section>
                  )}

                  {execucao.log?.length > 0 && (
                    <section className="ag-log">
                      <h4>O que ela decidiu, passo a passo</h4>
                      <ul>
                        {execucao.log.map((l, k) => (
                          <li key={k} className={`lg-${l.type}`}>
                            <span className="muted">
                              {new Date(l.at).toLocaleString("pt-BR")}
                            </span>{" "}
                            {l.text}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {aba === "aprovacoes" && (
        <>
          {!aprovacoes.length && (
            <p className="muted">Nada esperando você agora.</p>
          )}
          <ul className="ag-approvals">
            {aprovacoes.map(({ run, step, agent, reason }) => (
              <li key={`${run.id}-${step.id}`}>
                <div>
                  <strong>{agent?.name}</strong> quer: {describeStep(step)}
                  <p className="muted">{reason}</p>
                </div>
                <div className="ag-approve-actions">
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => aprovar(run.id, step.id)}
                  >
                    <Check size={13} /> Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => recusar(run.id, step.id)}
                  >
                    <X size={13} /> Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
