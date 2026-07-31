import { describe, expect, it } from "vitest";
import {
  FREE_PLAN_ID,
  METRICS,
  PLANS,
  STATUS,
  addUsage,
  checkQuota,
  formatPrice,
  limitFor,
  makeUsage,
  metricStatus,
  percentUsed,
  periodOf,
  planById,
  setUsage,
  upgradeSuggestion,
  usageSummary,
  usedIn,
  warnings,
} from "./features/plans/planDomain";

const gratuito = planById("gratuito");
const profissional = planById("profissional");
const equipe = planById("equipe");

describe("planById", () => {
  it("acha o plano pelo id", () => {
    expect(planById("profissional").name).toBe("Profissional");
  });

  it("plano desconhecido cai no mais restrito, nunca no ilimitado", () => {
    expect(planById("plano_inventado").id).toBe(FREE_PLAN_ID);
    expect(planById("").id).toBe(FREE_PLAN_ID);
    expect(planById(null).id).toBe(FREE_PLAN_ID);
    expect(planById(undefined).id).toBe(FREE_PLAN_ID);
  });

  it("id forjado não vira acesso ilimitado", () => {
    expect(limitFor("admin_god_mode", "aiPerMonth")).toBe(
      gratuito.limits.aiPerMonth,
    );
  });
});

describe("limitFor", () => {
  it("lê o limite do plano", () => {
    expect(limitFor(gratuito, "aiPerMonth")).toBe(100);
    expect(limitFor(profissional, "aiPerMonth")).toBe(2000);
  });

  it("null quer dizer sem limite", () => {
    expect(limitFor(equipe, "businesses")).toBeNull();
  });

  it("medida que não existe no plano devolve zero, não infinito", () => {
    expect(limitFor(gratuito, "recurso_inexistente")).toBe(0);
  });

  it("limite escrito à mão é ignorado; só vale o catálogo", () => {
    // Propriedade de segurança: se o plano chegasse de uma requisição, alguém
    // poderia forjar um limite gigante. O catálogo é a única fonte da verdade,
    // e id desconhecido cai no gratuito.
    expect(
      limitFor({ id: "x", limits: { aiPerMonth: 999999 } }, "aiPerMonth"),
    ).toBe(gratuito.limits.aiPerMonth);
    expect(
      limitFor({ id: "profissional", limits: { aiPerMonth: 999999 } }, "aiPerMonth"),
    ).toBe(profissional.limits.aiPerMonth);
  });
});

describe("periodOf", () => {
  it("recorta ano e mês da data", () => {
    expect(periodOf("2026-07-31")).toBe("2026-07");
    expect(periodOf("2026-07-31T10:00:00Z")).toBe("2026-07");
  });

  it("data inválida não quebra", () => {
    expect(periodOf("qualquer coisa")).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("consumo por período", () => {
  it("soma o uso do mês", () => {
    let u = makeUsage("2026-07");
    u = addUsage(u, "aiPerMonth", 3, "2026-07");
    u = addUsage(u, "aiPerMonth", 2, "2026-07");
    expect(usedIn(u, "aiPerMonth", "2026-07")).toBe(5);
  });

  it("virou o mês, a cota renova", () => {
    let u = makeUsage("2026-07");
    u = addUsage(u, "aiPerMonth", 99, "2026-07");
    expect(usedIn(u, "aiPerMonth", "2026-08")).toBe(0);
  });

  it("primeiro uso do mês novo zera o acumulado antigo", () => {
    let u = makeUsage("2026-07");
    u = addUsage(u, "aiPerMonth", 99, "2026-07");
    u = addUsage(u, "aiPerMonth", 1, "2026-08");
    expect(u.period).toBe("2026-08");
    expect(usedIn(u, "aiPerMonth", "2026-08")).toBe(1);
  });

  it("quantidade inválida não conta nem quebra", () => {
    let u = makeUsage("2026-07");
    u = addUsage(u, "aiPerMonth", "abacaxi", "2026-07");
    u = addUsage(u, "aiPerMonth", -5, "2026-07");
    u = addUsage(u, "aiPerMonth", 0, "2026-07");
    expect(usedIn(u, "aiPerMonth", "2026-07")).toBe(0);
  });

  it("medida desconhecida não é gravada", () => {
    const u = addUsage(makeUsage("2026-07"), "inventada", 5, "2026-07");
    expect(u.counts.inventada).toBeUndefined();
  });

  it("medida que não é de período não renova com a virada do mês", () => {
    const u = setUsage(makeUsage("2026-07"), "members", 3);
    expect(usedIn(u, "members", "2026-12")).toBe(3);
  });

  it("setUsage substitui em vez de somar", () => {
    let u = setUsage(makeUsage("2026-07"), "members", 5);
    u = setUsage(u, "members", 2);
    expect(usedIn(u, "members", "2026-07")).toBe(2);
  });
});

describe("checkQuota", () => {
  it("libera quando ainda cabe", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 10, "2026-07");
    const r = checkQuota(gratuito, u, "aiPerMonth", 1, "2026-07");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(90);
  });

  it("a última dentro do limite passa", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 99, "2026-07");
    expect(checkQuota(gratuito, u, "aiPerMonth", 1, "2026-07").allowed).toBe(true);
  });

  it("bater exatamente no limite bloqueia a próxima", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 100, "2026-07");
    const r = checkQuota(gratuito, u, "aiPerMonth", 1, "2026-07");
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.message).toContain("100 de 100");
  });

  it("pedido em lote que estoura é recusado inteiro", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 98, "2026-07");
    expect(checkQuota(gratuito, u, "aiPerMonth", 5, "2026-07").allowed).toBe(false);
    expect(checkQuota(gratuito, u, "aiPerMonth", 2, "2026-07").allowed).toBe(true);
  });

  it("sem limite libera sempre", () => {
    const u = setUsage(makeUsage("2026-07"), "businesses", 900);
    const r = checkQuota(equipe, u, "businesses", 1, "2026-07");
    expect(r.allowed).toBe(true);
    expect(r.unlimited).toBe(true);
  });

  it("recurso que não existe no plano é bloqueado com explicação", () => {
    // `limitFor` devolve 0 para medida ausente do plano, e 0 significa
    // "não faz parte", diferente de null que significa "sem limite".
    const r = checkQuota(gratuito, makeUsage("2026-07"), "storageMb", 1, "2026-07");
    expect(r.limit).toBe(gratuito.limits.storageMb);
    const semRecurso = checkQuota(
      { id: "gratuito" },
      makeUsage("2026-07"),
      "aiPerMonth",
      1,
      "2026-07",
    );
    expect(semRecurso.limit).toBe(gratuito.limits.aiPerMonth);
  });

  it("medida desconhecida é bloqueada, não liberada", () => {
    const r = checkQuota(gratuito, makeUsage("2026-07"), "xpto", 1, "2026-07");
    expect(r.allowed).toBe(false);
  });

  it("uso do mês passado não bloqueia o mês novo", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 100, "2026-07");
    expect(checkQuota(gratuito, u, "aiPerMonth", 1, "2026-08").allowed).toBe(true);
  });

  it("a mensagem diz quando a cota volta", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 100, "2026-07");
    expect(checkQuota(gratuito, u, "aiPerMonth", 1, "2026-07").message).toContain(
      "dia 1º",
    );
  });
});

describe("percentUsed e status", () => {
  it("calcula a porcentagem", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 50, "2026-07");
    expect(percentUsed(gratuito, u, "aiPerMonth", "2026-07")).toBe(50);
  });

  it("sem limite nunca aparece cheio", () => {
    const u = setUsage(makeUsage("2026-07"), "businesses", 500);
    expect(percentUsed(equipe, u, "businesses", "2026-07")).toBe(0);
  });

  it("avisa a partir de 80 por cento", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 80, "2026-07");
    expect(metricStatus(gratuito, u, "aiPerMonth", "2026-07")).toBe(STATUS.atencao);
  });

  it("79 por cento ainda está tranquilo", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 79, "2026-07");
    expect(metricStatus(gratuito, u, "aiPerMonth", "2026-07")).toBe(STATUS.ok);
  });

  it("passar do teto fica esgotado", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 120, "2026-07");
    expect(metricStatus(gratuito, u, "aiPerMonth", "2026-07")).toBe(STATUS.esgotado);
    expect(percentUsed(gratuito, u, "aiPerMonth", "2026-07")).toBe(100);
  });
});

describe("usageSummary", () => {
  it("descreve todas as medidas do plano", () => {
    const linhas = usageSummary(gratuito, makeUsage("2026-07"), "2026-07");
    expect(linhas).toHaveLength(Object.keys(METRICS).length);
    expect(linhas.every((l) => typeof l.label === "string" && l.label)).toBe(true);
  });

  it("marca o que é ilimitado", () => {
    const linhas = usageSummary(equipe, makeUsage("2026-07"), "2026-07");
    expect(linhas.find((l) => l.metric === "businesses").unlimited).toBe(true);
  });
});

describe("warnings", () => {
  it("lista só o que está apertado", () => {
    let u = addUsage(makeUsage("2026-07"), "aiPerMonth", 95, "2026-07");
    u = addUsage(u, "webSearchPerMonth", 1, "2026-07");
    const w = warnings(gratuito, u, "2026-07");
    expect(w.map((x) => x.metric)).toEqual(["aiPerMonth"]);
  });

  it("tudo tranquilo não gera aviso", () => {
    expect(warnings(gratuito, makeUsage("2026-07"), "2026-07")).toEqual([]);
  });
});

describe("upgradeSuggestion", () => {
  it("não sugere nada quando está tudo folgado", () => {
    expect(upgradeSuggestion(gratuito, makeUsage("2026-07"), "2026-07")).toBeNull();
  });

  it("sugere o plano que resolve o aperto", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 100, "2026-07");
    const s = upgradeSuggestion(gratuito, u, "2026-07");
    expect(s.plan.id).toBe("profissional");
    expect(s.solves).toContain("Conversas com a IA");
  });

  it("pula o plano que não resolveria e vai para o que resolve", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 2500, "2026-07");
    expect(upgradeSuggestion(gratuito, u, "2026-07").plan.id).toBe("equipe");
  });

  it("no plano maior, sem nada acima, não inventa sugestão", () => {
    const u = addUsage(makeUsage("2026-07"), "aiPerMonth", 999999, "2026-07");
    expect(upgradeSuggestion(equipe, u, "2026-07")).toBeNull();
  });
});

describe("formatPrice", () => {
  it("mostra grátis e preço em real", () => {
    expect(formatPrice(0)).toBe("Grátis");
    expect(formatPrice(4900)).toBe("R$ 49,00/mês");
  });
});

describe("catálogo de planos", () => {
  it("os planos crescem em preço e não diminuem limite", () => {
    for (let i = 1; i < PLANS.length; i += 1) {
      expect(PLANS[i].price).toBeGreaterThan(PLANS[i - 1].price);
      for (const metric of Object.keys(METRICS)) {
        const antes = limitFor(PLANS[i - 1], metric);
        const depois = limitFor(PLANS[i], metric);
        if (depois === null) continue;
        expect(antes === null ? Infinity : antes).toBeLessThanOrEqual(depois);
      }
    }
  });

  it("todo limite declarado corresponde a uma medida conhecida", () => {
    for (const plano of PLANS)
      for (const metric of Object.keys(plano.limits))
        expect(METRICS[metric]).toBeTruthy();
  });
});
