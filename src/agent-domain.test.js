import { describe, expect, it } from "vitest";
import {
  AGENT_TOOLS,
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
  isDueToday,
  isExternalAction,
  logDecision,
  makeAgent,
  makeRun,
  makeStep,
  needsApproval,
  nextStep,
  parsePlan,
  pendingApprovals,
  rejectStep,
  rememberForAgent,
  resumeRun,
  runBudget,
  skipBlockedSteps,
} from "./features/agents/agentDomain";

const agente = (extra = {}) =>
  makeAgent("a1", { name: "Assistente", goal: "Organizar a semana", ...extra });

const passo = (id, toolId, extra = {}) =>
  makeStep(id, { title: `Passo ${id}`, toolId, ...extra });

describe("catálogo de ferramentas", () => {
  it("toda ferramenta tem risco declarado e conhecido", () => {
    for (const t of AGENT_TOOLS) {
      expect(["leitura", "escrita", "externo"]).toContain(t.risk);
    }
  });

  it("acha a ferramenta pelo id e devolve nulo para id inventado", () => {
    expect(findTool("criar_tarefa").label).toBe("Criar tarefa");
    expect(findTool("hackear_banco")).toBeNull();
  });

  it("descreve o passo em português com os dados dele", () => {
    expect(describeStep(passo("p1", "criar_tarefa", { args: { titulo: "Ligar" } }))).toContain(
      "Ligar",
    );
  });

  it("passo com ferramenta desconhecida não quebra a descrição", () => {
    expect(describeStep(passo("p1", "inexistente"))).toBe("Passo p1");
  });
});

describe("aprovação por nível de autonomia", () => {
  it("no nível 'só planejar' até leitura pede aprovação", () => {
    const a = agente({ autonomy: "planejar" });
    expect(needsApproval(passo("p1", "buscar_workspace"), a)).toBe(true);
  });

  it("no nível 'ler' a leitura passa sozinha", () => {
    const a = agente({ autonomy: "ler" });
    expect(needsApproval(passo("p1", "buscar_workspace"), a)).toBe(false);
  });

  it("no nível 'ler' criar tarefa ainda pede aprovação", () => {
    const a = agente({ autonomy: "ler" });
    expect(needsApproval(passo("p1", "criar_tarefa"), a)).toBe(true);
  });

  it("no nível 'escrever' criar tarefa passa sozinha", () => {
    const a = agente({ autonomy: "escrever" });
    expect(needsApproval(passo("p1", "criar_tarefa"), a)).toBe(false);
  });

  it("no nível 'escrever' enviar e-mail ainda pede aprovação", () => {
    const a = agente({ autonomy: "escrever" });
    expect(needsApproval(passo("p1", "enviar_email"), a)).toBe(true);
  });

  it("no nível 'tudo' o envio externo passa sozinho, como a titular pediu", () => {
    const a = agente({ autonomy: "tudo" });
    expect(needsApproval(passo("p1", "enviar_email"), a)).toBe(false);
    expect(needsApproval(passo("p2", "enviar_whatsapp"), a)).toBe(false);
    expect(needsApproval(passo("p3", "publicar_site"), a)).toBe(false);
  });

  it("ferramenta desconhecida nunca roda sozinha, nem no nível 'tudo'", () => {
    const a = agente({ autonomy: "tudo" });
    expect(needsApproval(passo("p1", "formatar_o_computador"), a)).toBe(true);
  });

  it("agente sem nível definido pede aprovação para tudo", () => {
    expect(needsApproval(passo("p1", "buscar_workspace"), { autonomy: "xpto" })).toBe(true);
  });

  it("o nível 'tudo' vem marcado para avisar antes de ser escolhido", () => {
    expect(AUTONOMY_LEVELS.find((n) => n.id === "tudo").warn).toBe(true);
  });

  it("explica em português por que está pedindo aprovação", () => {
    const a = agente({ autonomy: "ler" });
    expect(approvalReason(passo("p1", "enviar_email"), a)).toContain("pode olhar");
  });

  it("marca a ação que sai para fora, para achar no histórico depois", () => {
    expect(isExternalAction(passo("p1", "enviar_email"))).toBe(true);
    expect(isExternalAction(passo("p2", "criar_tarefa"))).toBe(false);
  });
});

describe("makeAgent", () => {
  it("limita o número de passos a um teto sensato", () => {
    expect(makeAgent("a", { maxSteps: 999 }).maxSteps).toBe(30);
    expect(makeAgent("a", { maxSteps: 0 }).maxSteps).toBe(1);
  });

  it("nível inválido cai para o mais conservador", () => {
    expect(makeAgent("a", { autonomy: "sei_la" }).autonomy).toBe("planejar");
  });

  it("guarda os critérios de aceite sem linha vazia", () => {
    const a = makeAgent("a", { acceptance: ["Ter resumo", "", "  "] });
    expect(a.acceptance).toEqual(["Ter resumo"]);
  });
});

describe("memória do agente", () => {
  it("guarda o que aprendeu", () => {
    const a = rememberForAgent(agente(), "A cliente Ana prefere manhã");
    expect(a.memory[0].text).toBe("A cliente Ana prefere manhã");
  });

  it("não guarda a mesma coisa duas vezes", () => {
    let a = rememberForAgent(agente(), "Igual");
    a = rememberForAgent(a, "Igual");
    expect(a.memory).toHaveLength(1);
  });

  it("não guarda vazio", () => {
    expect(rememberForAgent(agente(), "   ").memory).toHaveLength(0);
  });

  it("a memória não cresce sem fim", () => {
    let a = agente();
    for (let i = 0; i < 50; i += 1) a = rememberForAgent(a, `fato ${i}`);
    expect(a.memory.length).toBeLessThanOrEqual(30);
  });
});

describe("parsePlan", () => {
  it("lê o formato pedido", () => {
    const passos = parsePlan(
      "1. Olhar as contas do mês | ler_financeiro |\n2. Criar tarefa de cobrança | criar_tarefa | titulo=Cobrar Ana",
    );
    expect(passos).toHaveLength(2);
    expect(passos[0].toolId).toBe("ler_financeiro");
    expect(passos[1].args.titulo).toBe("Cobrar Ana");
  });

  it("aguenta traço e negrito que a IA gosta de colocar", () => {
    const passos = parsePlan("- 1. **Resumir tudo** | resumir |");
    expect(passos[0].title).toBe("Resumir tudo");
  });

  it("ignora conversa fiada fora das linhas numeradas", () => {
    const passos = parsePlan(
      "Claro! Aqui está o plano:\n\n1. Ler a agenda | ler_agenda |\n\nEspero ter ajudado!",
    );
    expect(passos).toHaveLength(1);
  });

  it("ferramenta inventada pela IA fica em branco, e aí precisa de aprovação", () => {
    const passos = parsePlan("1. Fazer mágica | teletransportar |");
    expect(passos[0].toolId).toBe("");
    expect(needsApproval(passos[0], agente({ autonomy: "tudo" }))).toBe(true);
  });

  it("texto sem plano nenhum devolve lista vazia", () => {
    expect(parsePlan("não consegui montar um plano")).toEqual([]);
  });

  it("linha numerada sem título é descartada", () => {
    expect(parsePlan("1.  |  | ")).toEqual([]);
  });
});

describe("buildPlanPrompt", () => {
  it("manda a lista de ferramentas e o limite de passos", () => {
    const p = buildPlanPrompt(agente({ maxSteps: 5 }));
    expect(p).toContain("criar_tarefa");
    expect(p).toContain("no máximo 5 passos");
  });

  it("inclui os critérios de aceite quando existem", () => {
    const p = buildPlanPrompt(agente({ acceptance: ["Ter o resumo pronto"] }));
    expect(p).toContain("Ter o resumo pronto");
  });
});

describe("nextStep e dependências", () => {
  it("pega o primeiro passo pendente", () => {
    const run = makeRun("r1", {
      steps: [passo("p1", "resumir"), passo("p2", "criar_tarefa")],
    });
    expect(nextStep(run).id).toBe("p1");
  });

  it("não pega passo cuja dependência ainda não foi feita", () => {
    const run = makeRun("r1", {
      steps: [
        passo("p1", "resumir"),
        passo("p2", "criar_tarefa", { dependsOn: ["p1"] }),
      ],
    });
    expect(nextStep(run).id).toBe("p1");
  });

  it("libera o dependente depois que o anterior é feito", () => {
    let run = makeRun("r1", {
      steps: [
        passo("p1", "resumir"),
        passo("p2", "criar_tarefa", { dependsOn: ["p1"] }),
      ],
    });
    run = completeStep(run, "p1", "resumo pronto");
    expect(nextStep(run).id).toBe("p2");
  });

  it("execução sem passo pendente devolve nulo", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1");
    expect(nextStep(run)).toBeNull();
  });
});

describe("recusa derruba quem dependia", () => {
  it("passo recusado pula os que dependiam dele", () => {
    let run = makeRun("r1", {
      steps: [
        passo("p1", "rascunhar_email"),
        passo("p2", "enviar_email", { dependsOn: ["p1"] }),
        passo("p3", "criar_tarefa", { dependsOn: ["p2"] }),
      ],
    });
    run = rejectStep(run, "p1");
    expect(run.steps[1].status).toBe("pulado");
    expect(run.steps[2].status).toBe("pulado");
  });

  it("passo independente continua de pé", () => {
    let run = makeRun("r1", {
      steps: [passo("p1", "resumir"), passo("p2", "criar_tarefa")],
    });
    run = rejectStep(run, "p1");
    expect(run.steps[1].status).toBe("pendente");
  });

  it("erro também derruba quem dependia", () => {
    let run = makeRun("r1", {
      steps: [
        passo("p1", "ler_financeiro"),
        passo("p2", "criar_tarefa", { dependsOn: ["p1"] }),
      ],
    });
    run = failStep(run, "p1", "não achei os dados");
    expect(run.steps[1].status).toBe("pulado");
  });

  it("sem nada recusado, nada muda", () => {
    const run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    expect(skipBlockedSteps(run).steps[0].status).toBe("pendente");
  });
});

describe("orçamento de passos", () => {
  it("conta o que já foi gasto", () => {
    let run = makeRun("r1", {
      steps: [passo("p1", "resumir"), passo("p2", "criar_tarefa")],
    });
    run = completeStep(run, "p1");
    expect(runBudget(run, agente({ maxSteps: 5 }))).toMatchObject({
      used: 1,
      limit: 5,
      left: 4,
    });
  });

  it("passo com erro também gasta orçamento", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = failStep(run, "p1", "erro");
    expect(runBudget(run, agente({ maxSteps: 3 })).used).toBe(1);
  });

  it("para quando bate o limite, mesmo com passo pendente", () => {
    let run = makeRun("r1", {
      steps: [passo("p1", "resumir"), passo("p2", "criar_tarefa")],
    });
    run = completeStep(run, "p1");
    const r = canContinue(run, agente({ maxSteps: 1 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("limite de 1 passos");
  });

  it("não continua execução já encerrada", () => {
    const run = { ...makeRun("r1", { steps: [passo("p1", "resumir")] }), status: "cancelado" };
    expect(canContinue(run, agente()).ok).toBe(false);
  });

  it("continua quando há passo e orçamento", () => {
    const run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    expect(canContinue(run, agente({ maxSteps: 5 })).ok).toBe(true);
  });
});

describe("deriveStatus", () => {
  it("tudo feito vira concluído", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1");
    expect(deriveStatus(run, agente({ autonomy: "ler" }))).toBe("concluido");
  });

  it("com erro no meio vira falhou", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = failStep(run, "p1", "deu ruim");
    expect(deriveStatus(run, agente())).toBe("falhou");
  });

  it("passo esperando aprovação vira aguardando", () => {
    const run = makeRun("r1", { steps: [passo("p1", "enviar_email")] });
    expect(deriveStatus(run, agente({ autonomy: "escrever" }))).toBe("aguardando");
  });

  it("no nível 'tudo' o mesmo passo já fica executando", () => {
    const run = makeRun("r1", { steps: [passo("p1", "enviar_email")] });
    expect(deriveStatus(run, agente({ autonomy: "tudo" }))).toBe("executando");
  });

  it("orçamento estourado vira pausado, não concluído", () => {
    let run = makeRun("r1", {
      steps: [passo("p1", "resumir"), passo("p2", "resumir")],
    });
    run = completeStep(run, "p1");
    expect(deriveStatus(run, agente({ maxSteps: 1, autonomy: "ler" }))).toBe("pausado");
  });

  it("cancelado pela titular continua cancelado", () => {
    const run = { ...makeRun("r1", { steps: [passo("p1", "resumir")] }), status: "cancelado" };
    expect(deriveStatus(run, agente())).toBe("cancelado");
  });
});

describe("resumeRun", () => {
  it("não refaz passo que já tinha sido feito", () => {
    let run = makeRun("r1", {
      steps: [passo("p1", "registrar_lancamento"), passo("p2", "resumir")],
    });
    run = completeStep(run, "p1", "lançado");
    const voltou = resumeRun(run, agente({ autonomy: "escrever" }));
    expect(voltou.steps[0].status).toBe("feito");
    expect(nextStep(voltou).id).toBe("p2");
  });

  it("passo que ficou no meio volta para pendente", () => {
    const run = makeRun("r1", {
      steps: [{ ...passo("p1", "resumir"), status: "executando" }],
    });
    expect(resumeRun(run, agente({ autonomy: "ler" })).steps[0].status).toBe("pendente");
  });

  it("recalcula a situação ao voltar", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1");
    expect(resumeRun(run, agente({ autonomy: "ler" })).status).toBe("concluido");
  });
});

describe("aprovar e concluir", () => {
  it("aprovar marca a hora", () => {
    const run = approveStep(
      makeRun("r1", { steps: [passo("p1", "enviar_email")] }),
      "p1",
    );
    expect(run.steps[0].status).toBe("aprovado");
    expect(run.steps[0].approvedAt).toBeTruthy();
  });

  it("passo aprovado não pede aprovação de novo", () => {
    const run = approveStep(
      makeRun("r1", { steps: [passo("p1", "enviar_email")] }),
      "p1",
    );
    expect(deriveStatus(run, agente({ autonomy: "escrever" }))).toBe("executando");
  });

  it("concluir guarda o resultado", () => {
    const run = completeStep(
      makeRun("r1", { steps: [passo("p1", "resumir")] }),
      "p1",
      "achei 3 contas vencidas",
    );
    expect(run.steps[0].result).toBe("achei 3 contas vencidas");
  });
});

describe("log de decisões", () => {
  it("registra o que foi decidido, com hora", () => {
    const run = logDecision(makeRun("r1", {}), "escolhi ler o financeiro primeiro");
    expect(run.log[0].text).toContain("financeiro");
    expect(run.log[0].at).toBeTruthy();
  });

  it("acumula em ordem", () => {
    let run = logDecision(makeRun("r1", {}), "primeiro");
    run = logDecision(run, "segundo");
    expect(run.log.map((l) => l.text)).toEqual(["primeiro", "segundo"]);
  });
});

describe("checkAcceptance", () => {
  it("sem critério, não finge que conferiu", () => {
    const r = checkAcceptance(makeRun("r1", {}), agente());
    expect(r.checked).toBe(false);
    expect(r.note).toContain("não há o que conferir");
  });

  it("acha sinal do critério no que foi feito", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1", "resumo das contas vencidas do mês");
    const r = checkAcceptance(run, agente({ acceptance: ["Resumo das contas vencidas"] }));
    expect(r.items[0].evidence).toBe("parece atendido");
  });

  it("diz que não achou quando não achou", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1", "falei sobre o tempo");
    const r = checkAcceptance(run, agente({ acceptance: ["Planilha de fornecedores pronta"] }));
    expect(r.items[0].evidence).toBe("não achei sinal disso");
  });

  it("nunca se declara confiante do próprio resultado", () => {
    let run = makeRun("r1", { steps: [passo("p1", "resumir")] });
    run = completeStep(run, "p1", "resumo pronto");
    const r = checkAcceptance(run, agente({ acceptance: ["Resumo pronto"] }));
    expect(r.items.every((i) => i.confident === false)).toBe(true);
    expect(r.note).toContain("Confira você");
  });
});

describe("agendamento", () => {
  it("agente diário roda todo dia", () => {
    expect(isDueToday({ schedule: "diario" }, "2026-07-30")).toBe(true);
  });

  it("agente semanal roda só na segunda", () => {
    expect(isDueToday({ schedule: "semanal" }, "2026-07-27")).toBe(true); // segunda
    expect(isDueToday({ schedule: "semanal" }, "2026-07-30")).toBe(false);
  });

  it("agente mensal roda só no dia 1º", () => {
    expect(isDueToday({ schedule: "mensal" }, "2026-08-01")).toBe(true);
    expect(isDueToday({ schedule: "mensal" }, "2026-08-02")).toBe(false);
  });

  it("agente manual nunca dispara sozinho", () => {
    expect(isDueToday({ schedule: "manual" }, "2026-07-30")).toBe(false);
  });

  it("data inválida não dispara nada", () => {
    expect(isDueToday({ schedule: "diario" }, "amanhã")).toBe(false);
  });
});

describe("pendingApprovals", () => {
  it("junta o que está esperando a titular, com o motivo", () => {
    const a = agente({ autonomy: "escrever" });
    const run = makeRun("r1", { agentId: "a1", steps: [passo("p1", "enviar_email")] });
    const lista = pendingApprovals([run], [a]);
    expect(lista).toHaveLength(1);
    expect(lista[0].reason).toContain("pode criar coisas");
  });

  it("execução encerrada não aparece na fila", () => {
    const a = agente({ autonomy: "escrever" });
    const run = {
      ...makeRun("r1", { agentId: "a1", steps: [passo("p1", "enviar_email")] }),
      status: "concluido",
    };
    expect(pendingApprovals([run], [a])).toEqual([]);
  });

  it("no nível 'tudo' nada fica esperando aprovação", () => {
    const a = agente({ autonomy: "tudo" });
    const run = makeRun("r1", { agentId: "a1", steps: [passo("p1", "enviar_email")] });
    expect(pendingApprovals([run], [a])).toEqual([]);
  });
});
