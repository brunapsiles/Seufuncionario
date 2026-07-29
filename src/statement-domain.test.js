import { describe, expect, it } from "vitest";
import {
  averageMonthlyResult,
  cashVersusAccrual,
  categoryBreakdown,
  compareMonths,
  monthLabel,
  monthResult,
  monthSeries,
  shiftMonth,
  topExpenses,
} from "./features/finance/statementDomain.js";

const tx = (extra = {}) => ({
  id: "t1",
  type: "Receita",
  description: "Venda",
  value: 1000,
  date: "2026-07-10",
  category: "Serviços",
  ...extra,
});

const julho = [
  tx({ id: "a", value: 3000, date: "2026-07-05" }),
  tx({ id: "b", value: 2000, date: "2026-07-20" }),
  tx({ id: "c", type: "Despesa", value: 800, category: "Aluguel", date: "2026-07-05" }),
  tx({ id: "d", type: "Despesa", value: 400, category: "Insumos", date: "2026-07-11" }),
  tx({ id: "e", type: "Despesa", value: 300, category: "Insumos", date: "2026-07-18" }),
];
const junho = [
  tx({ id: "f", value: 4000, date: "2026-06-10" }),
  tx({ id: "g", type: "Despesa", value: 1000, category: "Aluguel", date: "2026-06-05" }),
];

describe("monthLabel e shiftMonth", () => {
  it("escreve o mês em português", () => {
    expect(monthLabel("2026-07")).toBe("julho de 2026");
    expect(monthLabel("2026-01")).toBe("janeiro de 2026");
  });

  it("devolve a entrada quando o mês é inválido", () => {
    expect(monthLabel("")).toBe("");
    expect(monthLabel("2026-13")).toBe("2026-13");
  });

  it("desloca meses virando o ano nos dois sentidos", () => {
    expect(shiftMonth("2026-07", 1)).toBe("2026-08");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-07", -7)).toBe("2025-12");
  });
});

describe("monthResult", () => {
  it("soma receita, despesa, resultado e margem do mês", () => {
    const r = monthResult(julho, "2026-07");
    expect(r.receita).toBe(5000);
    expect(r.despesa).toBe(1500);
    expect(r.resultado).toBe(3500);
    expect(r.margem).toBe(70);
    expect(r.lancamentos).toBe(5);
  });

  it("ignora lançamentos de outros meses", () => {
    expect(monthResult([...julho, ...junho], "2026-06").receita).toBe(4000);
  });

  it("margem é nula sem receita, não zero", () => {
    const r = monthResult(
      [tx({ type: "Despesa", value: 500, date: "2026-07-01" })],
      "2026-07",
    );
    expect(r.margem).toBeNull();
    expect(r.resultado).toBe(-500);
  });

  it("aceita valores em formato brasileiro", () => {
    const r = monthResult([tx({ value: "1.250,50" })], "2026-07");
    expect(r.receita).toBe(1250.5);
  });

  it("mês vazio devolve zeros", () => {
    expect(monthResult([], "2026-07")).toMatchObject({
      receita: 0,
      despesa: 0,
      resultado: 0,
      lancamentos: 0,
    });
  });
});

describe("monthSeries", () => {
  it("vai do mês mais antigo para o mais recente", () => {
    const serie = monthSeries([...julho, ...junho], "2026-07", 3);
    expect(serie.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07"]);
    expect(serie[2].receita).toBe(5000);
    expect(serie[1].receita).toBe(4000);
    expect(serie[0].lancamentos).toBe(0);
  });
});

describe("categoryBreakdown", () => {
  it("agrupa despesas por categoria com a fatia de cada uma", () => {
    const fatias = categoryBreakdown(julho, "2026-07", "Despesa");
    expect(fatias[0]).toMatchObject({ category: "Aluguel", total: 800, count: 1 });
    expect(fatias[1]).toMatchObject({ category: "Insumos", total: 700, count: 2 });
    // 800 de 1500 = 53.3%
    expect(fatias[0].share).toBeCloseTo(53.3, 1);
  });

  it("agrupa receitas quando pedido", () => {
    const fatias = categoryBreakdown(julho, "2026-07", "Receita");
    expect(fatias).toHaveLength(1);
    expect(fatias[0]).toMatchObject({ category: "Serviços", total: 5000, share: 100 });
  });

  it("usa 'Sem categoria' para lançamentos sem categoria", () => {
    const fatias = categoryBreakdown(
      [tx({ type: "Despesa", value: 100, category: "" })],
      "2026-07",
    );
    expect(fatias[0].category).toBe("Sem categoria");
  });
});

describe("compareMonths", () => {
  it("compara com o mês anterior em valor e percentual", () => {
    const c = compareMonths([...julho, ...junho], "2026-07");
    expect(c.atual.receita).toBe(5000);
    expect(c.anterior.receita).toBe(4000);
    expect(c.receita).toEqual({ delta: 1000, pct: 25 });
    expect(c.despesa).toEqual({ delta: 500, pct: 50 });
  });

  it("percentual é nulo quando não havia base de comparação", () => {
    const c = compareMonths(julho, "2026-07");
    expect(c.anterior.receita).toBe(0);
    expect(c.receita.pct).toBeNull();
    expect(c.receita.delta).toBe(5000);
  });
});

describe("topExpenses", () => {
  it("lista as maiores saídas primeiro", () => {
    const top = topExpenses(julho, "2026-07", 2);
    expect(top.map((t) => t.value)).toEqual([800, 400]);
    expect(top[0].category).toBe("Aluguel");
  });

  it("não inclui receitas", () => {
    expect(topExpenses(julho, "2026-07", 10).every((t) => t.value <= 800)).toBe(
      true,
    );
    expect(topExpenses(julho, "2026-07", 10)).toHaveLength(3);
  });
});

describe("cashVersusAccrual", () => {
  const contas = [
    { id: "c1", direction: "receber", value: 6000, dueDate: "2026-07-15" },
    { id: "c2", direction: "pagar", value: 1000, dueDate: "2026-07-20" },
    { id: "c3", direction: "receber", value: 900, dueDate: "2026-08-05" },
  ];

  it("separa o que moveu no caixa do que venceu no mês", () => {
    const r = cashVersusAccrual(julho, contas, "2026-07");
    expect(r.caixa).toMatchObject({ receita: 5000, despesa: 1500, resultado: 3500 });
    expect(r.competencia).toMatchObject({
      receita: 6000,
      despesa: 1000,
      resultado: 5000,
    });
  });

  it("a diferença mostra o que ficou pelo caminho", () => {
    const r = cashVersusAccrual(julho, contas, "2026-07");
    // Venceu 6000 mas entraram 5000: faltou 1000.
    expect(r.diferencaReceita).toBe(1000);
    // Venceu 1000 mas saíram 1500: pagou 500 além do que vencia no mês.
    expect(r.diferencaDespesa).toBe(-500);
  });

  it("funciona sem contas cadastradas", () => {
    const r = cashVersusAccrual(julho, [], "2026-07");
    expect(r.competencia.resultado).toBe(0);
    expect(r.diferencaReceita).toBe(-5000);
  });
});

describe("averageMonthlyResult", () => {
  it("faz a média só dos meses com movimento", () => {
    const media = averageMonthlyResult([...julho, ...junho], "2026-07", 6);
    expect(media.meses).toBe(2);
    expect(media.receita).toBe(4500);
    expect(media.despesa).toBe(1250);
    expect(media.resultado).toBe(3250);
  });

  it("devolve zeros quando não há movimento nenhum", () => {
    expect(averageMonthlyResult([], "2026-07", 6)).toEqual({
      receita: 0,
      despesa: 0,
      resultado: 0,
      meses: 0,
    });
  });
});
