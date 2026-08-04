// ===== Agentes: a IA planeja, você aprova, ela executa =====
// Camada pura. A regra que organiza este módulo inteiro: a IA nunca faz nada
// que saia do workspace sem a titular ver e aprovar. Tudo o mais é negociável
// pelo nível de autonomia; isso não é.

// ---------------------------------------------------------------------------
// Ferramentas que o agente pode usar
// ---------------------------------------------------------------------------

// O risco não é opinião, é o que a ação faz:
//  - leitura: olha o workspace, não muda nada.
//  - escrita: muda dado do workspace da titular. Dá para desfazer olhando.
//  - externo: sai do workspace e chega em outra pessoa. NÃO dá para desfazer.
export const TOOL_RISK = {
  leitura: { id: "leitura", label: "Só olha", weight: 0 },
  escrita: { id: "escrita", label: "Muda dado seu", weight: 1 },
  externo: { id: "externo", label: "Sai para fora", weight: 2 },
};

export const AGENT_TOOLS = [
  {
    id: "buscar_workspace",
    label: "Procurar no meu workspace",
    risk: "leitura",
    describe: (a) => `procurar por "${a.termo || ""}"`,
  },
  {
    id: "ler_financeiro",
    label: "Ler o financeiro",
    risk: "leitura",
    describe: () => "olhar entradas, saídas e contas",
  },
  {
    id: "ler_agenda",
    label: "Ler a agenda",
    risk: "leitura",
    describe: () => "olhar os compromissos",
  },
  {
    id: "ler_crm",
    label: "Ler clientes e oportunidades",
    risk: "leitura",
    describe: () => "olhar o funil e os contatos",
  },
  {
    id: "resumir",
    label: "Resumir o que leu",
    risk: "leitura",
    describe: () => "escrever um resumo do que encontrou",
  },
  {
    id: "criar_tarefa",
    label: "Criar tarefa",
    risk: "escrita",
    describe: (a) => `criar a tarefa "${a.titulo || ""}"`,
  },
  {
    id: "criar_nota",
    label: "Criar nota",
    risk: "escrita",
    describe: (a) => `criar a nota "${a.titulo || ""}"`,
  },
  {
    id: "criar_documento",
    label: "Escrever documento",
    risk: "escrita",
    describe: (a) => `escrever o documento "${a.titulo || ""}"`,
  },
  {
    id: "agendar_compromisso",
    label: "Marcar compromisso",
    risk: "escrita",
    describe: (a) => `marcar "${a.titulo || ""}" em ${a.data || "data a definir"}`,
  },
  {
    id: "registrar_lancamento",
    label: "Lançar no financeiro",
    risk: "escrita",
    describe: (a) => `lançar ${a.descricao || ""} de R$ ${a.valor || 0}`,
  },
  {
    id: "rascunhar_email",
    label: "Escrever rascunho de e-mail",
    risk: "escrita",
    describe: (a) => `rascunhar e-mail para ${a.para || "alguém"}`,
  },
  {
    id: "enviar_email",
    label: "Enviar e-mail",
    risk: "externo",
    describe: (a) => `ENVIAR e-mail para ${a.para || "alguém"}`,
  },
  {
    id: "enviar_whatsapp",
    label: "Enviar WhatsApp",
    risk: "externo",
    describe: (a) => `ENVIAR WhatsApp para ${a.para || "alguém"}`,
  },
  {
    id: "publicar_site",
    label: "Publicar no site",
    risk: "externo",
    describe: () => "PUBLICAR conteúdo no site",
  },
];

export const findTool = (id) => AGENT_TOOLS.find((t) => t.id === id) || null;

// ---------------------------------------------------------------------------
// Autonomia
// ---------------------------------------------------------------------------

export const AUTONOMY_LEVELS = [
  {
    id: "planejar",
    label: "Só me mostrar o plano",
    hint: "A IA pensa e escreve o passo a passo. Não faz nada sozinha.",
    allows: [],
  },
  {
    id: "ler",
    label: "Pode olhar meus dados",
    hint: "Lê e resume sozinha. Qualquer mudança pede aprovação.",
    allows: ["leitura"],
  },
  {
    id: "escrever",
    label: "Pode criar coisas para mim",
    hint: "Cria tarefa, nota, documento e lançamento sozinha. Nada sai para fora sem você ver.",
    allows: ["leitura", "escrita"],
  },
  {
    id: "tudo",
    label: "Pode fazer tudo, inclusive enviar",
    hint: "Envia e-mail e WhatsApp sozinha, em seu nome. Mensagem enviada não volta: se a IA entender errado, quem responde é você. Tudo fica registrado no histórico.",
    allows: ["leitura", "escrita", "externo"],
    warn: true,
  },
];

// O nível "tudo" libera até o envio externo. Foi escolha explícita da titular:
// é o negócio dela, a conta dela e o risco dela. O que este módulo garante é
// que a escolha seja consciente (o nível avisa o que significa), que valha por
// agente e não para o app inteiro, e que TODO envio fique no log — porque o que
// não dá para desfazer, dá pelo menos para auditar.
export const needsApproval = (step, agent) => {
  const ferramenta = findTool(step?.toolId);
  if (!ferramenta) return true; // ferramenta desconhecida nunca roda sozinha
  const nivel = AUTONOMY_LEVELS.find((n) => n.id === agent?.autonomy);
  if (!nivel) return true;
  return !nivel.allows.includes(ferramenta.risk);
};

export const approvalReason = (step, agent) => {
  const ferramenta = findTool(step?.toolId);
  if (!ferramenta) return "essa ferramenta não é conhecida pelo app";
  const nivel = AUTONOMY_LEVELS.find((n) => n.id === agent?.autonomy);
  if (!nivel) return "o nível de autonomia deste agente não está definido";
  if (!nivel.allows.includes(ferramenta.risk))
    return `este agente está em "${nivel.label.toLowerCase()}"`;
  return "";
};

// Ação externa feita sozinha é registrada com destaque, para a titular
// conseguir achar depois "o que foi enviado em meu nome, e quando".
export const isExternalAction = (step) =>
  findTool(step?.toolId)?.risk === "externo";

// ---------------------------------------------------------------------------
// Agente e memória
// ---------------------------------------------------------------------------

export const makeAgent = (
  id,
  {
    name = "",
    goal = "",
    autonomy = "planejar",
    maxSteps = 8,
    acceptance = [],
    memory = [],
    businessId = "",
  } = {},
) => ({
  id,
  name: String(name || "").trim(),
  goal: String(goal || "").trim(),
  autonomy: AUTONOMY_LEVELS.some((n) => n.id === autonomy) ? autonomy : "planejar",
  // `Number(x) || 8` seria armadilha: zero é falso em JavaScript, então quem
  // digitasse 0 receberia 8 passos calado — o oposto de limitar o agente.
  maxSteps: (() => {
    const n = Number(maxSteps);
    return Math.min(30, Math.max(1, Math.round(Number.isFinite(n) ? n : 8)));
  })(),
  acceptance: acceptance.map((c) => String(c || "").trim()).filter(Boolean),
  memory: [...memory],
  businessId,
  createdAt: new Date().toISOString(),
});

export const rememberForAgent = (agent, texto) => {
  const t = String(texto || "").trim();
  if (!t) return agent;
  if (agent.memory?.some((m) => m.text === t)) return agent;
  return {
    ...agent,
    memory: [
      ...(agent.memory || []),
      { text: t, at: new Date().toISOString() },
    ].slice(-30), // memória de agente não cresce sem fim
  };
};

// ---------------------------------------------------------------------------
// Plano e execução
// ---------------------------------------------------------------------------

export const RUN_STATUS = {
  planejando: "Montando o plano",
  aguardando: "Esperando você aprovar",
  executando: "Trabalhando",
  pausado: "Pausado",
  concluido: "Terminou",
  falhou: "Parou por erro",
  cancelado: "Cancelado por você",
};

export const makeStep = (
  id,
  { title = "", toolId = "", args = {}, dependsOn = [] } = {},
) => ({
  id,
  title: String(title || "").trim(),
  toolId,
  args: { ...args },
  dependsOn: [...dependsOn],
  status: "pendente", // pendente | aprovado | recusado | feito | erro | pulado
  result: "",
  error: "",
  approvedAt: "",
  doneAt: "",
});

export const makeRun = (id, { agentId = "", goal = "", steps = [], businessId = "" } = {}) => ({
  id,
  agentId,
  goal: String(goal || "").trim(),
  steps,
  status: steps.length ? "aguardando" : "planejando",
  log: [],
  startedAt: new Date().toISOString(),
  finishedAt: "",
  businessId,
});

// O log é o que permite entender DEPOIS por que a IA fez o que fez.
export const logDecision = (run, texto, tipo = "info") => ({
  ...run,
  log: [
    ...(run.log || []),
    { at: new Date().toISOString(), type: tipo, text: String(texto || "") },
  ],
});

// A IA devolve texto livre. Este parser aceita o que ela costuma escrever
// (numeração, traço, markdown) e ignora o resto, em vez de quebrar.
// Formato pedido: "1. Título | ferramenta | chave=valor, chave=valor"
export const parsePlan = (texto) => {
  const passos = [];
  for (const linhaBruta of String(texto || "").split("\n")) {
    const linha = linhaBruta.trim().replace(/^[*-]\s*/, "");
    const m = linha.match(/^\d+[.)]\s*(.+)$/);
    if (!m) continue;
    const partes = m[1].split("|").map((p) => p.trim());
    const titulo = partes[0].replace(/\*\*/g, "").trim();
    if (!titulo) continue;

    const idFerramenta = (partes[1] || "").toLowerCase().replace(/[^a-z_]/g, "");
    const args = {};
    for (const par of (partes[2] || "").split(/[,;]/)) {
      const mm = par.match(/^\s*([\p{L}_]+)\s*=\s*(.+?)\s*$/u);
      if (mm) args[mm[1].toLowerCase()] = mm[2];
    }
    passos.push(
      makeStep(`p${passos.length + 1}`, {
        title: titulo,
        toolId: findTool(idFerramenta) ? idFerramenta : "",
        args,
      }),
    );
  }
  return passos;
};

export const buildPlanPrompt = (agent, contexto = "") => {
  const ferramentas = AGENT_TOOLS.map(
    (t) => `- ${t.id} (${TOOL_RISK[t.risk].label})`,
  ).join("\n");
  return `Você é um assistente que planeja o trabalho antes de executar.

Objetivo: ${agent.goal}

Ferramentas disponíveis:
${ferramentas}

${contexto ? `Contexto do negócio:\n${contexto}\n` : ""}
${agent.acceptance?.length ? `O trabalho só está pronto quando:\n${agent.acceptance.map((c) => `- ${c}`).join("\n")}\n` : ""}
Escreva no máximo ${agent.maxSteps} passos, um por linha, exatamente neste formato:
1. O que fazer | id_da_ferramenta | chave=valor, chave=valor

Regras:
- Use somente os ids de ferramenta da lista.
- Não invente dado que você não tem; primeiro leia, depois escreva.
- Só use enviar_email ou enviar_whatsapp quando houver destinatário e texto final; os argumentos devem incluir para= e texto=.
- Português do Brasil, direto.
- Nada além das linhas numeradas.`;
};

// Qual passo vem agora: o primeiro pendente cujas dependências já foram feitas.
export const nextStep = (run) => {
  const feitos = new Set(
    (run.steps || []).filter((s) => s.status === "feito").map((s) => s.id),
  );
  return (
    (run.steps || []).find(
      (s) =>
        (s.status === "pendente" || s.status === "aprovado") &&
        (s.dependsOn || []).every((d) => feitos.has(d)),
    ) || null
  );
};

// Passo recusado derruba quem dependia dele: executar um passo que dependia de
// algo que a titular vetou seria fazer justamente o que ela não quis.
export const skipBlockedSteps = (run) => {
  const parados = new Set(
    (run.steps || [])
      .filter((s) => s.status === "recusado" || s.status === "pulado" || s.status === "erro")
      .map((s) => s.id),
  );
  if (!parados.size) return run;

  let mudou = true;
  const passos = [...(run.steps || [])];
  while (mudou) {
    mudou = false;
    for (let i = 0; i < passos.length; i += 1) {
      const s = passos[i];
      if (s.status !== "pendente" && s.status !== "aprovado") continue;
      if ((s.dependsOn || []).some((d) => parados.has(d))) {
        passos[i] = { ...s, status: "pulado" };
        parados.add(s.id);
        mudou = true;
      }
    }
  }
  return { ...run, steps: passos };
};

export const approveStep = (run, stepId) => ({
  ...run,
  steps: (run.steps || []).map((s) =>
    s.id === stepId
      ? { ...s, status: "aprovado", approvedAt: new Date().toISOString() }
      : s,
  ),
});

export const rejectStep = (run, stepId) =>
  skipBlockedSteps({
    ...run,
    steps: (run.steps || []).map((s) =>
      s.id === stepId ? { ...s, status: "recusado" } : s,
    ),
  });

export const completeStep = (run, stepId, resultado = "") => ({
  ...run,
  steps: (run.steps || []).map((s) =>
    s.id === stepId
      ? {
          ...s,
          status: "feito",
          result: String(resultado || ""),
          doneAt: new Date().toISOString(),
        }
      : s,
  ),
});

export const failStep = (run, stepId, erro = "") =>
  skipBlockedSteps({
    ...run,
    steps: (run.steps || []).map((s) =>
      s.id === stepId ? { ...s, status: "erro", error: String(erro || "") } : s,
    ),
  });

// Orçamento: quantos passos já foram gastos e se ainda pode continuar.
// Sem isso, um plano que a IA escreveu errado roda em círculo.
export const runBudget = (run, agent) => {
  const gastos = (run.steps || []).filter(
    (s) => s.status === "feito" || s.status === "erro",
  ).length;
  const limite = agent?.maxSteps || 8;
  return { used: gastos, limit: limite, left: Math.max(0, limite - gastos) };
};

export const canContinue = (run, agent) => {
  if (["concluido", "cancelado", "falhou"].includes(run.status))
    return { ok: false, reason: "esta execução já terminou" };
  const orcamento = runBudget(run, agent);
  if (orcamento.left <= 0)
    return {
      ok: false,
      reason: `bateu o limite de ${orcamento.limit} passos que você definiu`,
    };
  if (!nextStep(run)) return { ok: false, reason: "não há passo pendente" };
  return { ok: true, reason: "" };
};

// Situação da execução, derivada dos passos. Nunca gravar isso na mão.
export const deriveStatus = (run, agent) => {
  if (["cancelado", "planejando"].includes(run.status)) return run.status;
  const passos = run.steps || [];
  if (!passos.length) return "planejando";

  const abertos = passos.filter((s) => s.status === "pendente" || s.status === "aprovado");
  if (!abertos.length) {
    return passos.some((s) => s.status === "erro") ? "falhou" : "concluido";
  }
  const orcamento = runBudget(run, agent);
  if (orcamento.left <= 0) return "pausado";

  const proximo = nextStep(run);
  if (proximo && proximo.status === "pendente" && needsApproval(proximo, agent))
    return "aguardando";
  return "executando";
};

// Execução interrompida (fechou o navegador, caiu a internet) volta de onde
// parou. Passo que já foi feito não é refeito — refazer "lançar no financeiro"
// lançaria duas vezes.
export const resumeRun = (run, agent) => {
  const limpo = {
    ...run,
    steps: (run.steps || []).map((s) =>
      s.status === "executando" ? { ...s, status: "pendente" } : s,
    ),
  };
  const comPulos = skipBlockedSteps(limpo);
  return { ...comPulos, status: deriveStatus(comPulos, agent) };
};

// ---------------------------------------------------------------------------
// Conferência do próprio resultado
// ---------------------------------------------------------------------------

// A IA confere o que ela mesma fez contra os critérios que a titular escreveu.
// O resultado é sempre uma pergunta para ela, nunca um carimbo de "está certo":
// a IA não é boa juíza do próprio trabalho e não deve fingir que é.
export const checkAcceptance = (run, agent) => {
  const criterios = agent?.acceptance || [];
  if (!criterios.length)
    return {
      checked: false,
      items: [],
      note: "Você não definiu critérios de aceite, então não há o que conferir.",
    };

  const feitos = (run.steps || []).filter((s) => s.status === "feito");
  const texto = feitos
    .map((s) => `${s.title} ${s.result}`)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const itens = criterios.map((c) => {
    const palavras = c
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/\s+/)
      .filter((p) => p.length > 3);
    const achou = palavras.filter((p) => texto.includes(p)).length;
    const proporcao = palavras.length ? achou / palavras.length : 0;
    return {
      criterion: c,
      evidence: proporcao >= 0.5 ? "parece atendido" : "não achei sinal disso",
      confident: false,
    };
  });

  return {
    checked: true,
    items: itens,
    note: "Isto é só um indício pelo que ficou escrito nos passos. Confira você antes de considerar pronto.",
  };
};

// ---------------------------------------------------------------------------
// Fila e agendamento
// ---------------------------------------------------------------------------

export const AGENT_SCHEDULES = [
  { id: "manual", label: "Só quando eu mandar" },
  { id: "diario", label: "Todo dia de manhã" },
  { id: "semanal", label: "Toda segunda-feira" },
  { id: "mensal", label: "Todo dia 1º" },
];

export const isDueToday = (agent, hoje) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hoje || ""))) return false;
  const dia = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  if (agent?.schedule === "diario") return true;
  if (agent?.schedule === "semanal") return dia === 1;
  if (agent?.schedule === "mensal") return hoje.slice(8, 10) === "01";
  return false;
};

export const pendingApprovals = (runs = [], agents = []) => {
  const porId = new Map(agents.map((a) => [a.id, a]));
  const lista = [];
  for (const run of runs) {
    if (["concluido", "cancelado", "falhou"].includes(run.status)) continue;
    const agente = porId.get(run.agentId);
    const passo = nextStep(run);
    if (passo && passo.status === "pendente" && needsApproval(passo, agente)) {
      lista.push({ run, step: passo, agent: agente, reason: approvalReason(passo, agente) });
    }
  }
  return lista;
};

export const describeStep = (step) => {
  const ferramenta = findTool(step?.toolId);
  if (!ferramenta) return step?.title || "";
  try {
    return ferramenta.describe(step.args || {});
  } catch {
    return step?.title || "";
  }
};
