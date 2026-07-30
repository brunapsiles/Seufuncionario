// ===== Portfólio: vários projetos juntos, com dependência entre eles =====
// Camada pura, um nível ACIMA do cronograma de um projeto só (scheduleDomain).
// A pergunta que este módulo responde não é "como vai o projeto X", e sim
// "se o projeto X atrasar, o que mais atrasa junto, e quem eu aviso".

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

export const addDays = (date, days) => {
  if (!isDate(date)) return date;
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
};

export const daysBetween = (de, ate) => {
  if (!isDate(de) || !isDate(ate)) return 0;
  return Math.round(
    (Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000,
  );
};

const normalize = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// ---------------------------------------------------------------------------
// Programa: um guarda-chuva sobre vários projetos
// ---------------------------------------------------------------------------

export const makeProgram = (
  id,
  { name = "", goal = "", ownerName = "", projectIds = [], businessId = "" } = {},
) => ({
  id,
  name: String(name || "").trim(),
  goal: String(goal || "").trim(),
  ownerName: String(ownerName || "").trim(),
  projectIds: [...new Set(projectIds.filter(Boolean))],
  businessId,
  createdAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Dependência ENTRE projetos
// ---------------------------------------------------------------------------

// "O projeto B só pode começar depois que A terminar (+ folga de N dias)."
export const makeProjectLink = (
  id,
  { fromId = "", toId = "", lagDays = 0, note = "", businessId = "" } = {},
) => ({
  id,
  fromId,
  toId,
  lagDays: Number.isFinite(Number(lagDays)) ? Math.round(Number(lagDays)) : 0,
  note: String(note || "").trim(),
  businessId,
});

// Ciclo em dependência é erro de cadastro que trava qualquer cálculo de data:
// "A depois de B, B depois de A" não tem solução. Precisa ser achado e mostrado,
// nunca ignorado — e a busca em profundidade abaixo existe justamente para o
// cálculo de datas nunca entrar em laço infinito.
export const detectLinkCycles = (links = []) => {
  const saida = new Map();
  for (const l of links) {
    if (!l.fromId || !l.toId) continue;
    if (!saida.has(l.fromId)) saida.set(l.fromId, []);
    saida.get(l.fromId).push(l.toId);
  }

  const ciclos = [];
  const estado = new Map(); // 0 = não visto, 1 = na pilha, 2 = fechado
  const pilha = [];

  const anda = (no) => {
    estado.set(no, 1);
    pilha.push(no);
    for (const prox of saida.get(no) || []) {
      if (prox === no) {
        ciclos.push([no, no]);
        continue;
      }
      if (estado.get(prox) === 1) {
        const i = pilha.indexOf(prox);
        ciclos.push([...pilha.slice(i), prox]);
      } else if (!estado.get(prox)) {
        anda(prox);
      }
    }
    pilha.pop();
    estado.set(no, 2);
  };

  for (const no of saida.keys()) if (!estado.get(no)) anda(no);
  return ciclos;
};

// Ordem em que dá para calcular: cada projeto depois de quem ele depende.
// Devolve `null` quando há ciclo, porque aí não existe ordem possível.
export const topologicalOrder = (projectIds = [], links = []) => {
  const ids = [...new Set(projectIds)];
  const grau = new Map(ids.map((id) => [id, 0]));
  const saida = new Map(ids.map((id) => [id, []]));

  for (const l of links) {
    if (!grau.has(l.fromId) || !grau.has(l.toId)) continue;
    if (l.fromId === l.toId) return null;
    saida.get(l.fromId).push(l.toId);
    grau.set(l.toId, grau.get(l.toId) + 1);
  }

  const fila = ids.filter((id) => grau.get(id) === 0);
  const ordem = [];
  while (fila.length) {
    const id = fila.shift();
    ordem.push(id);
    for (const prox of saida.get(id)) {
      grau.set(prox, grau.get(prox) - 1);
      if (grau.get(prox) === 0) fila.push(prox);
    }
  }
  return ordem.length === ids.length ? ordem : null;
};

// Data mais cedo em que cada projeto consegue começar, respeitando de quem ele
// depende. Projeto sem data cadastrada não inventa data: fica como está.
export const portfolioSchedule = (projects = [], links = []) => {
  const ids = projects.map((p) => p.id);
  const ordem = topologicalOrder(ids, links);
  const porId = new Map(projects.map((p) => [p.id, p]));

  if (!ordem) {
    return {
      rows: projects.map((p) => ({
        project: p,
        start: p.startDate || "",
        end: p.dueDate || "",
        pushedBy: null,
        pushedDays: 0,
      })),
      cycles: detectLinkCycles(links),
      endDate: "",
    };
  }

  const calc = new Map();
  for (const id of ordem) {
    const p = porId.get(id);
    const duracao =
      isDate(p.startDate) && isDate(p.dueDate)
        ? daysBetween(p.startDate, p.dueDate)
        : 0;

    const inicioCadastrado = p.startDate || "";
    let inicio = inicioCadastrado;
    let empurradoPor = null;

    for (const l of links.filter((x) => x.toId === id)) {
      const antes = calc.get(l.fromId);
      if (!antes || !isDate(antes.end)) continue;
      const minimo = addDays(antes.end, Math.max(0, l.lagDays) + 1);
      if (!isDate(inicio) || minimo > inicio) {
        inicio = minimo;
        empurradoPor = porId.get(l.fromId) || null;
      }
    }

    // O empurrão é medido contra a data que a titular cadastrou, não contra o
    // empurrão anterior. Com dois projetos empurrando o mesmo, medir do anterior
    // mostraria só o último trecho e esconderia metade do atraso.
    const empurradoDias =
      empurradoPor && isDate(inicioCadastrado) && isDate(inicio)
        ? daysBetween(inicioCadastrado, inicio)
        : 0;

    const fim = isDate(inicio) ? addDays(inicio, duracao) : p.dueDate || "";
    calc.set(id, {
      project: p,
      start: inicio,
      end: fim,
      pushedBy: empurradoPor,
      pushedDays: empurradoDias,
    });
  }

  const linhas = projects.map((p) => calc.get(p.id)).filter(Boolean);
  const fins = linhas.map((r) => r.end).filter(isDate).sort();
  return {
    rows: linhas,
    cycles: [],
    endDate: fins[fins.length - 1] || "",
  };
};

// E se o projeto X atrasar N dias? Quem mais escorrega junto.
// Num losango (A puxa B e C, os dois puxam D), D atrasa o MÁXIMO dos dois
// caminhos, nunca a soma — somar contaria o mesmo atraso duas vezes.
export const propagateDelay = (projects = [], links = [], projectId, days) => {
  const atraso = Math.max(0, Math.round(Number(days) || 0));
  const ids = projects.map((p) => p.id);
  const ordem = topologicalOrder(ids, links);
  if (!ordem || !ids.includes(projectId) || !atraso) return [];

  const desloca = new Map(ids.map((id) => [id, 0]));
  desloca.set(projectId, atraso);

  for (const id of ordem) {
    const meu = desloca.get(id);
    if (!meu) continue;
    for (const l of links.filter((x) => x.fromId === id)) {
      if (!desloca.has(l.toId)) continue;
      desloca.set(l.toId, Math.max(desloca.get(l.toId), meu));
    }
  }

  const porId = new Map(projects.map((p) => [p.id, p]));
  return ids
    .filter((id) => id !== projectId && desloca.get(id) > 0)
    .map((id) => ({
      project: porId.get(id),
      days: desloca.get(id),
      newDue: isDate(porId.get(id)?.dueDate)
        ? addDays(porId.get(id).dueDate, desloca.get(id))
        : "",
    }))
    .sort((a, b) => b.days - a.days);
};

// A corrente que define a data final do portfólio: mexer nela muda o fim.
export const criticalChain = (projects = [], links = []) => {
  const agenda = portfolioSchedule(projects, links);
  if (!agenda.endDate) return [];
  const porId = new Map(agenda.rows.map((r) => [r.project.id, r]));
  let atual = agenda.rows.find((r) => r.end === agenda.endDate);
  const corrente = [];
  const visto = new Set();

  while (atual && !visto.has(atual.project.id)) {
    visto.add(atual.project.id);
    corrente.unshift(atual.project);
    const entrando = links.filter((l) => l.toId === atual.project.id);
    let anterior = null;
    for (const l of entrando) {
      const cand = porId.get(l.fromId);
      if (!cand || !isDate(cand.end)) continue;
      if (!anterior || cand.end > anterior.end) anterior = cand;
    }
    atual = anterior;
  }
  return corrente;
};

// ---------------------------------------------------------------------------
// Saúde do portfólio
// ---------------------------------------------------------------------------

export const HEALTH = {
  verde: { id: "verde", label: "No rumo" },
  amarelo: { id: "amarelo", label: "Atenção" },
  vermelho: { id: "vermelho", label: "Em apuros" },
};

// A saúde vem sempre com o motivo escrito. Semáforo sem motivo não ajuda
// ninguém a decidir o que fazer.
export const projectHealth = (project, metrics = {}, hoje) => {
  const motivos = [];
  const atrasado =
    isDate(project?.dueDate) &&
    isDate(hoje) &&
    project.dueDate < hoje &&
    project.status !== "Concluído";

  if (atrasado)
    motivos.push(`o prazo era ${project.dueDate.split("-").reverse().join("/")}`);
  if (metrics.overdueTasks > 0)
    motivos.push(`${metrics.overdueTasks} tarefa(s) fora do prazo`);
  if (metrics.criticalGovernance > 0)
    motivos.push(`${metrics.criticalGovernance} risco(s) grave(s) em aberto`);
  if (metrics.blockedMilestones > 0)
    motivos.push(`${metrics.blockedMilestones} entrega(s) travada(s)`);

  const estouro =
    Number(project?.budgetPlanned) > 0 &&
    Number(project?.costActual) > Number(project.budgetPlanned);
  if (estouro) motivos.push("o custo passou do orçamento");

  const grave = atrasado || estouro || (metrics.criticalGovernance || 0) > 0;
  const nivel = grave ? "vermelho" : motivos.length ? "amarelo" : "verde";
  return { level: nivel, label: HEALTH[nivel].label, reasons: motivos };
};

// ---------------------------------------------------------------------------
// RACI
// ---------------------------------------------------------------------------

export const RACI_ROLES = [
  { id: "R", label: "Faz", hint: "Põe a mão na massa." },
  { id: "A", label: "Responde", hint: "Presta contas. Só pode haver uma pessoa." },
  { id: "C", label: "É consultado", hint: "Opina antes." },
  { id: "I", label: "É informado", hint: "Fica sabendo depois." },
];

export const makeRaciEntry = (
  id,
  { activity = "", projectId = "", assignments = {}, businessId = "" } = {},
) => ({
  id,
  activity: String(activity || "").trim(),
  projectId,
  assignments: { ...assignments }, // { "Ana": "A", "João": "R" }
  businessId,
});

// As duas regras que fazem o RACI valer alguma coisa:
// duas pessoas "respondendo" é o mesmo que ninguém respondendo, e atividade
// sem ninguém "fazendo" não sai do papel.
export const validateRaci = (entry) => {
  const pares = Object.entries(entry?.assignments || {}).filter(([, p]) => p);
  const donos = pares.filter(([, papel]) => papel === "A").map(([n]) => n);
  const fazem = pares.filter(([, papel]) => papel === "R").map(([n]) => n);
  const problemas = [];

  if (donos.length === 0)
    problemas.push({
      type: "sem-dono",
      message: "Ninguém responde por esta atividade.",
    });
  if (donos.length > 1)
    problemas.push({
      type: "dois-donos",
      message: `${donos.join(" e ")} aparecem como responsáveis. Só uma pessoa pode responder.`,
      people: donos,
    });
  if (fazem.length === 0)
    problemas.push({
      type: "sem-executor",
      message: "Ninguém está marcado para fazer.",
    });

  return { ok: problemas.length === 0, problems: problemas, owners: donos, doers: fazem };
};

// Quem está sobrecarregado de "responder" no portfólio inteiro.
export const raciLoad = (entries = []) => {
  const carga = new Map();
  for (const e of entries) {
    for (const [pessoa, papel] of Object.entries(e.assignments || {})) {
      if (!papel) continue;
      if (!carga.has(pessoa))
        carga.set(pessoa, { name: pessoa, R: 0, A: 0, C: 0, I: 0 });
      carga.get(pessoa)[papel] += 1;
    }
  }
  return [...carga.values()].sort((a, b) => b.A - a.A || b.R - a.R);
};

// ---------------------------------------------------------------------------
// Riscos
// ---------------------------------------------------------------------------

export const RISK_SCALE = [
  { id: 1, label: "Muito baixa" },
  { id: 2, label: "Baixa" },
  { id: 3, label: "Média" },
  { id: 4, label: "Alta" },
  { id: 5, label: "Muito alta" },
];

export const makeRisk = (
  id,
  {
    title = "",
    projectId = "",
    probability = 3,
    impact = 3,
    response = "mitigar",
    ownerName = "",
    plan = "",
    status = "aberto",
    businessId = "",
  } = {},
) => ({
  id,
  title: String(title || "").trim(),
  projectId,
  probability: Math.min(5, Math.max(1, Math.round(Number(probability) || 3))),
  impact: Math.min(5, Math.max(1, Math.round(Number(impact) || 3))),
  response,
  ownerName: String(ownerName || "").trim(),
  plan: String(plan || "").trim(),
  status,
  businessId,
  createdAt: new Date().toISOString(),
});

export const riskScore = (risk) =>
  Math.min(5, Math.max(1, Math.round(Number(risk?.probability) || 1))) *
  Math.min(5, Math.max(1, Math.round(Number(risk?.impact) || 1)));

export const riskLevel = (risk) => {
  const s = riskScore(risk);
  if (s >= 15) return { id: "critico", label: "Crítico", score: s };
  if (s >= 8) return { id: "alto", label: "Alto", score: s };
  if (s >= 4) return { id: "medio", label: "Médio", score: s };
  return { id: "baixo", label: "Baixo", score: s };
};

export const openRisks = (risks = []) =>
  risks.filter((r) => !["encerrado", "mitigado", "aceito"].includes(r.status));

export const topRisks = (risks = [], limite = 5) =>
  [...openRisks(risks)]
    .sort((a, b) => riskScore(b) - riskScore(a) || a.title.localeCompare(b.title))
    .slice(0, limite);

// Matriz 5x5: quantos riscos caem em cada cruzamento de chance e impacto.
export const riskMatrix = (risks = []) => {
  const grade = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of openRisks(risks)) {
    const p = Math.min(5, Math.max(1, Math.round(Number(r.probability) || 1)));
    const i = Math.min(5, Math.max(1, Math.round(Number(r.impact) || 1)));
    grade[5 - p][i - 1] += 1;
  }
  return grade;
};

// Risco sem dono ou sem plano é risco que ninguém está tratando.
export const untreatedRisks = (risks = []) =>
  openRisks(risks).filter(
    (r) => riskScore(r) >= 8 && (!r.ownerName || !r.plan),
  );

// ---------------------------------------------------------------------------
// Causa do atraso e trabalho repetido
// ---------------------------------------------------------------------------

// Por que este projeto atrasou. Só aponta causa que dá para provar com o dado
// cadastrado — não chuta motivo.
export const delayCauses = (projects = [], tasks = [], links = [], hoje) => {
  const agenda = portfolioSchedule(projects, links);
  const porId = new Map(agenda.rows.map((r) => [r.project.id, r]));

  return projects
    .filter(
      (p) =>
        p.status !== "Concluído" && isDate(p.dueDate) && isDate(hoje) && p.dueDate < hoje,
    )
    .map((p) => {
      const causas = [];
      const linha = porId.get(p.id);

      if (linha?.pushedBy)
        causas.push({
          type: "dependencia",
          message: `esperou o projeto "${linha.pushedBy.name}" terminar`,
          days: linha.pushedDays,
        });

      const doProjeto = tasks.filter((t) => t.projectId === p.id);
      const travadas = doProjeto.filter(
        (t) => t.status !== "Concluído" && (t.blocked || t.blockReason),
      );
      if (travadas.length)
        causas.push({
          type: "tarefa-travada",
          message: `${travadas.length} tarefa(s) travada(s)`,
        });

      const semDono = doProjeto.filter(
        (t) => t.status !== "Concluído" && !t.assigneeId && !t.assignee,
      );
      if (semDono.length)
        causas.push({
          type: "sem-responsavel",
          message: `${semDono.length} tarefa(s) sem responsável`,
        });

      if (!causas.length)
        causas.push({
          type: "desconhecida",
          message: "não dá para dizer pelo que está cadastrado",
        });

      return { project: p, lateDays: daysBetween(p.dueDate, hoje), causes: causas };
    })
    .sort((a, b) => b.lateDays - a.lateDays);
};

// Tarefas com título praticamente igual em projetos diferentes: pode ser gente
// fazendo a mesma coisa duas vezes sem saber.
export const redundantWork = (projects = [], tasks = []) => {
  const nomes = new Map(projects.map((p) => [p.id, p.name]));
  const grupos = new Map();

  for (const t of tasks) {
    if (!t.projectId || t.status === "Concluído") continue;
    const chave = normalize(t.title).replace(/[^\p{L}\p{N} ]/gu, "");
    if (chave.length < 6) continue;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(t);
  }

  return [...grupos.values()]
    .map((lista) => {
      const projetos = [...new Set(lista.map((t) => t.projectId))];
      if (projetos.length < 2) return null;
      return {
        title: lista[0].title,
        tasks: lista,
        projects: projetos.map((id) => ({ id, name: nomes.get(id) || "—" })),
      };
    })
    .filter(Boolean);
};

// ---------------------------------------------------------------------------
// Resumo executivo
// ---------------------------------------------------------------------------

export const executiveSummary = ({
  projects = [],
  healths = [],
  risks = [],
  links = [],
  hoje = "",
} = {}) => {
  const total = projects.length;
  const vermelhos = healths.filter((h) => h.level === "vermelho");
  const amarelos = healths.filter((h) => h.level === "amarelo");
  const criticos = topRisks(risks, 3);
  const ciclos = detectLinkCycles(links);
  const atrasados = projects.filter(
    (p) => p.status !== "Concluído" && isDate(p.dueDate) && isDate(hoje) && p.dueDate < hoje,
  );

  const linhas = [];
  if (!total) return ["Nenhum projeto cadastrado ainda."];

  linhas.push(
    `${total} projeto(s) no portfólio: ${healths.filter((h) => h.level === "verde").length} no rumo, ${amarelos.length} pedindo atenção e ${vermelhos.length} em apuros.`,
  );
  if (atrasados.length)
    linhas.push(
      `${atrasados.length} projeto(s) passaram do prazo: ${atrasados.map((p) => p.name).join(", ")}.`,
    );
  if (criticos.length)
    linhas.push(
      `Riscos mais pesados agora: ${criticos.map((r) => `${r.title} (${riskLevel(r).label.toLowerCase()})`).join("; ")}.`,
    );
  const semTratar = untreatedRisks(risks);
  if (semTratar.length)
    linhas.push(
      `${semTratar.length} risco(s) grave(s) sem dono ou sem plano definido.`,
    );
  if (ciclos.length)
    linhas.push(
      "Há dependência circular entre projetos: um espera o outro em círculo, e nenhuma data fecha até isso ser desfeito.",
    );
  if (!atrasados.length && !vermelhos.length)
    linhas.push("Nenhum projeto em apuros no momento.");

  return linhas;
};
