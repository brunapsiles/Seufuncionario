import { describe, expect, it } from "vitest";
import {
  addDays,
  criticalChain,
  daysBetween,
  delayCauses,
  detectLinkCycles,
  executiveSummary,
  makeProgram,
  makeProjectLink,
  makeRaciEntry,
  makeRisk,
  openRisks,
  portfolioSchedule,
  projectHealth,
  propagateDelay,
  raciLoad,
  redundantWork,
  riskLevel,
  riskMatrix,
  riskScore,
  topRisks,
  topologicalOrder,
  untreatedRisks,
  validateRaci,
} from "./features/portfolio/portfolioDomain";

const proj = (id, name, startDate, dueDate, extra = {}) => ({
  id,
  name,
  startDate,
  dueDate,
  status: "Em andamento",
  budgetPlanned: 0,
  costActual: 0,
  ...extra,
});

const link = (from, to, lag = 0) =>
  makeProjectLink(`l-${from}-${to}`, { fromId: from, toId: to, lagDays: lag });

describe("datas", () => {
  it("soma dias virando o mês", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });
  it("conta a diferença", () => {
    expect(daysBetween("2026-03-01", "2026-03-15")).toBe(14);
  });
});

describe("detectLinkCycles", () => {
  it("acha o círculo entre dois projetos", () => {
    const ciclos = detectLinkCycles([link("a", "b"), link("b", "a")]);
    expect(ciclos.length).toBeGreaterThan(0);
  });

  it("acha o círculo com três projetos", () => {
    const ciclos = detectLinkCycles([link("a", "b"), link("b", "c"), link("c", "a")]);
    expect(ciclos.length).toBeGreaterThan(0);
  });

  it("acha projeto que depende de si mesmo", () => {
    expect(detectLinkCycles([link("a", "a")]).length).toBeGreaterThan(0);
  });

  it("corrente reta não é círculo", () => {
    expect(detectLinkCycles([link("a", "b"), link("b", "c")])).toEqual([]);
  });

  it("losango não é círculo", () => {
    const ciclos = detectLinkCycles([
      link("a", "b"),
      link("a", "c"),
      link("b", "d"),
      link("c", "d"),
    ]);
    expect(ciclos).toEqual([]);
  });
});

describe("topologicalOrder", () => {
  it("põe o projeto depois de quem ele espera", () => {
    const ordem = topologicalOrder(["c", "a", "b"], [link("a", "b"), link("b", "c")]);
    expect(ordem).toEqual(["a", "b", "c"]);
  });

  it("devolve nulo quando há círculo, porque não existe ordem", () => {
    expect(topologicalOrder(["a", "b"], [link("a", "b"), link("b", "a")])).toBeNull();
  });

  it("devolve nulo para projeto que depende de si mesmo", () => {
    expect(topologicalOrder(["a"], [link("a", "a")])).toBeNull();
  });

  it("ignora ligação para projeto que não está na lista", () => {
    expect(topologicalOrder(["a"], [link("a", "fantasma")])).toEqual(["a"]);
  });
});

describe("portfolioSchedule", () => {
  it("empurra o projeto seguinte para depois do anterior", () => {
    const projetos = [
      proj("a", "Reforma", "2026-01-01", "2026-01-10"),
      proj("b", "Mudança", "2026-01-01", "2026-01-05"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b")]);
    const b = r.rows.find((x) => x.project.id === "b");
    expect(b.start).toBe("2026-01-11");
    expect(b.pushedBy.id).toBe("a");
  });

  it("respeita a folga pedida entre os dois", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-01", "2026-01-05"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b", 5)]);
    expect(r.rows.find((x) => x.project.id === "b").start).toBe("2026-01-16");
  });

  it("mantém a duração do projeto empurrado", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-01", "2026-01-08"), // 7 dias
    ];
    const r = portfolioSchedule(projetos, [link("a", "b")]);
    const b = r.rows.find((x) => x.project.id === "b");
    expect(daysBetween(b.start, b.end)).toBe(7);
  });

  it("com dois projetos empurrando, conta o empurrão desde a data cadastrada", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("c", "C", "2026-01-01", "2026-01-20"),
      proj("b", "B", "2026-01-01", "2026-01-05"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b"), link("c", "b")]);
    const b = r.rows.find((x) => x.project.id === "b");
    expect(b.start).toBe("2026-01-21");
    expect(b.pushedDays).toBe(20); // não 10, que seria só o último trecho
    expect(b.pushedBy.id).toBe("c");
  });

  it("não empurra quem já começa depois", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-06-01", "2026-06-10"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b")]);
    expect(r.rows.find((x) => x.project.id === "b").start).toBe("2026-06-01");
  });

  it("com círculo devolve as datas cadastradas e aponta o círculo", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-01", "2026-01-05"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b"), link("b", "a")]);
    expect(r.cycles.length).toBeGreaterThan(0);
    expect(r.rows.find((x) => x.project.id === "b").start).toBe("2026-01-01");
  });

  it("projeto sem data não ganha data inventada", () => {
    const r = portfolioSchedule([proj("a", "A", "", "")], []);
    expect(r.rows[0].start).toBe("");
  });

  it("a data final do portfólio é a maior data de término", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-01", "2026-01-05"),
    ];
    const r = portfolioSchedule(projetos, [link("a", "b")]);
    expect(r.endDate).toBe("2026-01-15");
  });
});

describe("propagateDelay", () => {
  const projetos = [
    proj("a", "A", "2026-01-01", "2026-01-10"),
    proj("b", "B", "2026-01-11", "2026-01-20"),
    proj("c", "C", "2026-01-21", "2026-01-30"),
  ];

  it("o atraso escorrega para quem depende", () => {
    const r = propagateDelay(projetos, [link("a", "b"), link("b", "c")], "a", 5);
    expect(r.map((x) => [x.project.id, x.days])).toEqual([
      ["b", 5],
      ["c", 5],
    ]);
  });

  it("no losango o atraso não é somado duas vezes", () => {
    const p = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-11", "2026-01-15"),
      proj("c", "C", "2026-01-11", "2026-01-15"),
      proj("d", "D", "2026-01-16", "2026-01-20"),
    ];
    const r = propagateDelay(
      p,
      [link("a", "b"), link("a", "c"), link("b", "d"), link("c", "d")],
      "a",
      7,
    );
    expect(r.find((x) => x.project.id === "d").days).toBe(7);
  });

  it("mostra o novo prazo de quem foi empurrado", () => {
    const r = propagateDelay(projetos, [link("a", "b")], "a", 3);
    expect(r[0].newDue).toBe("2026-01-23");
  });

  it("quem não depende não é afetado", () => {
    const r = propagateDelay(projetos, [link("a", "b")], "a", 5);
    expect(r.map((x) => x.project.id)).not.toContain("c");
  });

  it("atraso zero não mexe em ninguém", () => {
    expect(propagateDelay(projetos, [link("a", "b")], "a", 0)).toEqual([]);
  });

  it("com círculo não trava e devolve vazio", () => {
    const r = propagateDelay(projetos, [link("a", "b"), link("b", "a")], "a", 5);
    expect(r).toEqual([]);
  });
});

describe("criticalChain", () => {
  it("mostra a corrente que define a data final", () => {
    const projetos = [
      proj("a", "A", "2026-01-01", "2026-01-10"),
      proj("b", "B", "2026-01-01", "2026-01-20"),
      proj("c", "C", "2026-01-01", "2026-01-05"),
    ];
    const corrente = criticalChain(projetos, [link("a", "b")]);
    expect(corrente.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("sem projeto nenhum devolve corrente vazia", () => {
    expect(criticalChain([], [])).toEqual([]);
  });
});

describe("projectHealth", () => {
  it("projeto fora do prazo fica vermelho e diz o porquê", () => {
    const h = projectHealth(proj("a", "A", "2026-01-01", "2026-06-01"), {}, "2026-07-30");
    expect(h.level).toBe("vermelho");
    expect(h.reasons.join(" ")).toContain("01/06/2026");
  });

  it("projeto com tarefa atrasada fica amarelo", () => {
    const h = projectHealth(
      proj("a", "A", "2026-01-01", "2026-12-01"),
      { overdueTasks: 2 },
      "2026-07-30",
    );
    expect(h.level).toBe("amarelo");
    expect(h.reasons.join(" ")).toContain("2 tarefa");
  });

  it("estouro de orçamento deixa vermelho", () => {
    const h = projectHealth(
      proj("a", "A", "2026-01-01", "2026-12-01", {
        budgetPlanned: 1000,
        costActual: 1500,
      }),
      {},
      "2026-07-30",
    );
    expect(h.level).toBe("vermelho");
    expect(h.reasons.join(" ")).toContain("orçamento");
  });

  it("projeto sem problema fica verde e sem motivo", () => {
    const h = projectHealth(proj("a", "A", "2026-01-01", "2026-12-01"), {}, "2026-07-30");
    expect(h.level).toBe("verde");
    expect(h.reasons).toEqual([]);
  });

  it("projeto concluído fora do prazo não conta como atrasado", () => {
    const h = projectHealth(
      proj("a", "A", "2026-01-01", "2026-06-01", { status: "Concluído" }),
      {},
      "2026-07-30",
    );
    expect(h.level).toBe("verde");
  });
});

describe("validateRaci", () => {
  it("aceita uma pessoa respondendo e outra fazendo", () => {
    const e = makeRaciEntry("r1", {
      activity: "Fechar contrato",
      assignments: { Ana: "A", João: "R" },
    });
    expect(validateRaci(e).ok).toBe(true);
  });

  it("acusa duas pessoas respondendo, que é o mesmo que ninguém", () => {
    const e = makeRaciEntry("r1", {
      activity: "Fechar contrato",
      assignments: { Ana: "A", João: "A", Maria: "R" },
    });
    const v = validateRaci(e);
    expect(v.ok).toBe(false);
    expect(v.problems.find((p) => p.type === "dois-donos").people.sort()).toEqual([
      "Ana",
      "João",
    ]);
  });

  it("acusa atividade sem ninguém respondendo", () => {
    const e = makeRaciEntry("r1", { assignments: { Ana: "R" } });
    expect(validateRaci(e).problems.some((p) => p.type === "sem-dono")).toBe(true);
  });

  it("acusa atividade sem ninguém fazendo", () => {
    const e = makeRaciEntry("r1", { assignments: { Ana: "A" } });
    expect(validateRaci(e).problems.some((p) => p.type === "sem-executor")).toBe(true);
  });

  it("atividade vazia acusa os dois problemas", () => {
    const v = validateRaci(makeRaciEntry("r1", {}));
    expect(v.problems).toHaveLength(2);
  });

  it("a mesma pessoa pode fazer e responder", () => {
    const e = makeRaciEntry("r1", { assignments: { Ana: "A", João: "R" } });
    expect(validateRaci(e).owners).toEqual(["Ana"]);
    expect(validateRaci(e).doers).toEqual(["João"]);
  });
});

describe("raciLoad", () => {
  it("mostra quem responde por mais coisa", () => {
    const entradas = [
      makeRaciEntry("1", { assignments: { Ana: "A", João: "R" } }),
      makeRaciEntry("2", { assignments: { Ana: "A", Maria: "R" } }),
      makeRaciEntry("3", { assignments: { João: "A", Ana: "C" } }),
    ];
    const carga = raciLoad(entradas);
    expect(carga[0].name).toBe("Ana");
    expect(carga[0].A).toBe(2);
    expect(carga[0].C).toBe(1);
  });
});

describe("riscos", () => {
  it("a nota é chance vezes impacto", () => {
    expect(riskScore(makeRisk("r", { probability: 4, impact: 5 }))).toBe(20);
  });

  it("valor fora da escala é trazido para dentro", () => {
    expect(riskScore(makeRisk("r", { probability: 99, impact: -3 }))).toBe(5);
  });

  it("classifica o nível pela nota", () => {
    expect(riskLevel(makeRisk("r", { probability: 5, impact: 5 })).id).toBe("critico");
    expect(riskLevel(makeRisk("r", { probability: 3, impact: 3 })).id).toBe("alto");
    expect(riskLevel(makeRisk("r", { probability: 2, impact: 2 })).id).toBe("medio");
    expect(riskLevel(makeRisk("r", { probability: 1, impact: 2 })).id).toBe("baixo");
  });

  it("risco encerrado sai da conta", () => {
    const riscos = [
      makeRisk("a", { title: "A", status: "aberto" }),
      makeRisk("b", { title: "B", status: "encerrado" }),
    ];
    expect(openRisks(riscos).map((r) => r.id)).toEqual(["a"]);
  });

  it("os mais pesados vêm primeiro", () => {
    const riscos = [
      makeRisk("a", { title: "Leve", probability: 1, impact: 1 }),
      makeRisk("b", { title: "Pesado", probability: 5, impact: 5 }),
    ];
    expect(topRisks(riscos)[0].id).toBe("b");
  });

  it("a matriz conta o risco no cruzamento certo", () => {
    const grade = riskMatrix([makeRisk("a", { probability: 5, impact: 1 })]);
    expect(grade[0][0]).toBe(1); // chance máxima em cima, impacto mínimo à esquerda
  });

  it("acusa risco grave sem dono ou sem plano", () => {
    const riscos = [
      makeRisk("a", { title: "Sem dono", probability: 4, impact: 4 }),
      makeRisk("b", {
        title: "Cuidado",
        probability: 4,
        impact: 4,
        ownerName: "Ana",
        plan: "trocar fornecedor",
      }),
      makeRisk("c", { title: "Bobinho", probability: 1, impact: 1 }),
    ];
    expect(untreatedRisks(riscos).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("delayCauses", () => {
  it("aponta a espera por outro projeto como causa", () => {
    const projetos = [
      proj("a", "Reforma", "2026-01-01", "2026-03-01"),
      proj("b", "Inauguração", "2026-01-01", "2026-02-01"),
    ];
    const r = delayCauses(projetos, [], [link("a", "b")], "2026-07-30");
    const b = r.find((x) => x.project.id === "b");
    expect(b.causes.some((c) => c.type === "dependencia")).toBe(true);
  });

  it("aponta tarefa travada e tarefa sem responsável", () => {
    const projetos = [proj("a", "A", "2026-01-01", "2026-02-01")];
    const tarefas = [
      { id: "t1", projectId: "a", status: "pendente", blocked: true, title: "x" },
      { id: "t2", projectId: "a", status: "pendente", title: "y" },
    ];
    const r = delayCauses(projetos, tarefas, [], "2026-07-30");
    const tipos = r[0].causes.map((c) => c.type);
    expect(tipos).toContain("tarefa-travada");
    expect(tipos).toContain("sem-responsavel");
  });

  it("assume que não sabe em vez de chutar motivo", () => {
    const projetos = [proj("a", "A", "2026-01-01", "2026-02-01")];
    const r = delayCauses(projetos, [], [], "2026-07-30");
    expect(r[0].causes[0].type).toBe("desconhecida");
  });

  it("projeto no prazo não entra na lista", () => {
    const projetos = [proj("a", "A", "2026-01-01", "2026-12-01")];
    expect(delayCauses(projetos, [], [], "2026-07-30")).toEqual([]);
  });

  it("o mais atrasado vem primeiro", () => {
    const projetos = [
      proj("a", "Pouco", "2026-01-01", "2026-07-01"),
      proj("b", "Muito", "2026-01-01", "2026-02-01"),
    ];
    const r = delayCauses(projetos, [], [], "2026-07-30");
    expect(r[0].project.id).toBe("b");
  });
});

describe("redundantWork", () => {
  it("acha a mesma tarefa em dois projetos", () => {
    const projetos = [proj("a", "Projeto A", "", ""), proj("b", "Projeto B", "", "")];
    const tarefas = [
      { id: "1", projectId: "a", title: "Contratar fotógrafo", status: "pendente" },
      { id: "2", projectId: "b", title: "contratar fotógrafo", status: "pendente" },
    ];
    const r = redundantWork(projetos, tarefas);
    expect(r).toHaveLength(1);
    expect(r[0].projects.map((p) => p.name).sort()).toEqual(["Projeto A", "Projeto B"]);
  });

  it("mesma tarefa no mesmo projeto não é trabalho repetido entre projetos", () => {
    const tarefas = [
      { id: "1", projectId: "a", title: "Contratar fotógrafo", status: "pendente" },
      { id: "2", projectId: "a", title: "Contratar fotógrafo", status: "pendente" },
    ];
    expect(redundantWork([proj("a", "A", "", "")], tarefas)).toEqual([]);
  });

  it("tarefa concluída não conta", () => {
    const tarefas = [
      { id: "1", projectId: "a", title: "Contratar fotógrafo", status: "Concluído" },
      { id: "2", projectId: "b", title: "Contratar fotógrafo", status: "pendente" },
    ];
    expect(redundantWork([], tarefas)).toEqual([]);
  });

  it("título curto demais não vira alarme falso", () => {
    const tarefas = [
      { id: "1", projectId: "a", title: "Ligar", status: "pendente" },
      { id: "2", projectId: "b", title: "Ligar", status: "pendente" },
    ];
    expect(redundantWork([], tarefas)).toEqual([]);
  });
});

describe("executiveSummary", () => {
  it("avisa quando não há projeto nenhum", () => {
    expect(executiveSummary({})).toEqual(["Nenhum projeto cadastrado ainda."]);
  });

  it("conta os projetos por situação", () => {
    const linhas = executiveSummary({
      projects: [proj("a", "A", "", ""), proj("b", "B", "", "")],
      healths: [{ level: "verde" }, { level: "vermelho" }],
      hoje: "2026-07-30",
    });
    expect(linhas[0]).toContain("2 projeto(s)");
    expect(linhas[0]).toContain("1 em apuros");
  });

  it("nomeia os projetos que passaram do prazo", () => {
    const linhas = executiveSummary({
      projects: [proj("a", "Reforma", "2026-01-01", "2026-02-01")],
      healths: [{ level: "vermelho" }],
      hoje: "2026-07-30",
    });
    expect(linhas.join(" ")).toContain("Reforma");
  });

  it("avisa da dependência circular em português claro", () => {
    const linhas = executiveSummary({
      projects: [proj("a", "A", "", ""), proj("b", "B", "", "")],
      healths: [{ level: "verde" }, { level: "verde" }],
      links: [link("a", "b"), link("b", "a")],
      hoje: "2026-07-30",
    });
    expect(linhas.join(" ")).toContain("círculo");
  });

  it("diz que está tudo bem quando está tudo bem", () => {
    const linhas = executiveSummary({
      projects: [proj("a", "A", "2026-01-01", "2026-12-01")],
      healths: [{ level: "verde" }],
      hoje: "2026-07-30",
    });
    expect(linhas.join(" ")).toContain("Nenhum projeto em apuros");
  });
});

describe("makeProgram", () => {
  it("não repete o mesmo projeto no programa", () => {
    const p = makeProgram("pg1", { name: "Expansão", projectIds: ["a", "a", "b"] });
    expect(p.projectIds).toEqual(["a", "b"]);
  });
});
