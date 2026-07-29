import { describe, expect, it } from "vitest";
import {
  addDays,
  agingBuckets,
  billOpenAmount,
  billPaidTotal,
  billStatus,
  billsSummary,
  cashFlowForecast,
  daysBetween,
  makeBill,
  nextRecurrence,
  paymentToTransaction,
  registerPayment,
  upcomingBills,
} from "./features/finance/billsDomain.js";

const HOJE = "2026-07-29";

const conta = (extra = {}) => ({
  id: "c1",
  direction: "receber",
  description: "Serviço de julho",
  contactName: "Cliente A",
  value: 1000,
  dueDate: HOJE,
  category: "Serviços",
  payments: [],
  ...extra,
});

describe("daysBetween e addDays", () => {
  it("conta dias entre datas", () => {
    expect(daysBetween("2026-07-29", "2026-08-05")).toBe(7);
    expect(daysBetween("2026-08-05", "2026-07-29")).toBe(-7);
    expect(daysBetween("2026-07-29", "2026-07-29")).toBe(0);
  });

  it("atravessa virada de mês e de ano", () => {
    expect(daysBetween("2026-12-28", "2027-01-04")).toBe(7);
  });

  it("ignora datas inválidas", () => {
    expect(daysBetween("", "2026-07-29")).toBe(0);
    expect(addDays("qualquer", 5)).toBe("qualquer");
  });

  it("soma dias", () => {
    expect(addDays("2026-07-29", 7)).toBe("2026-08-05");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });
});

describe("billPaidTotal e billOpenAmount", () => {
  it("soma pagamentos parciais", () => {
    const c = conta({ payments: [{ amount: 300 }, { amount: 200 }] });
    expect(billPaidTotal(c)).toBe(500);
    expect(billOpenAmount(c)).toBe(500);
  });

  it("aceita valor escrito com vírgula", () => {
    const c = conta({ value: "1.250,50", payments: [{ amount: "250,50" }] });
    expect(billOpenAmount(c)).toBe(1000);
  });

  it("nunca deixa saldo negativo", () => {
    const c = conta({ value: 100, payments: [{ amount: 250 }] });
    expect(billOpenAmount(c)).toBe(0);
  });

  it("conta sem pagamentos tem tudo em aberto", () => {
    expect(billOpenAmount(conta())).toBe(1000);
    expect(billPaidTotal(conta())).toBe(0);
  });
});

describe("billStatus", () => {
  it("marca quitada quando não resta saldo", () => {
    const c = conta({ payments: [{ amount: 1000 }] });
    expect(billStatus(c, HOJE).state).toBe("quitada");
  });

  it("marca vence hoje", () => {
    expect(billStatus(conta(), HOJE)).toMatchObject({
      state: "vence-hoje",
      open: 1000,
    });
  });

  it("marca a vencer com os dias que faltam", () => {
    const status = billStatus(conta({ dueDate: "2026-08-05" }), HOJE);
    expect(status.state).toBe("a-vencer");
    expect(status.label).toBe("Vence em 7 dias");
  });

  it("marca atrasada com os dias de atraso", () => {
    const status = billStatus(conta({ dueDate: "2026-07-22" }), HOJE);
    expect(status.state).toBe("atrasada");
    expect(status.days).toBe(7);
    expect(status.label).toBe("Atrasada 7 dias");
  });

  it("usa singular para um dia", () => {
    expect(billStatus(conta({ dueDate: "2026-07-28" }), HOJE).label).toBe(
      "Atrasada 1 dia",
    );
    expect(billStatus(conta({ dueDate: "2026-07-30" }), HOJE).label).toBe(
      "Vence em 1 dia",
    );
  });

  it("uma conta parcialmente paga e vencida continua atrasada pelo saldo", () => {
    const c = conta({ dueDate: "2026-07-20", payments: [{ amount: 400 }] });
    const status = billStatus(c, HOJE);
    expect(status.state).toBe("atrasada");
    expect(status.open).toBe(600);
    expect(status.paid).toBe(400);
  });

  it("trata conta sem vencimento", () => {
    expect(billStatus(conta({ dueDate: "" }), HOJE).state).toBe("sem-data");
  });
});

describe("registerPayment", () => {
  it("registra pagamento parcial", () => {
    const c = registerPayment(conta(), {
      id: "p1",
      amount: 400,
      at: "2026-07-29T10:00:00.000Z",
    });
    expect(billOpenAmount(c)).toBe(600);
    expect(c.payments).toHaveLength(1);
  });

  it("nunca registra mais que o saldo em aberto", () => {
    const c = registerPayment(conta({ value: 100 }), {
      id: "p1",
      amount: 900,
      at: "2026-07-29T10:00:00.000Z",
    });
    expect(c.payments[0].amount).toBe(100);
    expect(billOpenAmount(c)).toBe(0);
  });

  it("ignora valor zero ou negativo", () => {
    const original = conta();
    expect(registerPayment(original, { id: "p", amount: 0, at: "x" })).toBe(
      original,
    );
    expect(registerPayment(original, { id: "p", amount: -50, at: "x" })).toBe(
      original,
    );
  });
});

describe("agingBuckets", () => {
  it("separa a inadimplência por faixa de atraso", () => {
    const contas = [
      conta({ id: "a", dueDate: "2026-08-10", value: 100 }),
      conta({ id: "b", dueDate: "2026-07-25", value: 200 }),
      conta({ id: "c", dueDate: "2026-07-09", value: 300 }),
      conta({ id: "d", dueDate: "2026-06-20", value: 400 }),
      conta({ id: "e", dueDate: "2026-04-01", value: 500 }),
    ];
    const faixas = agingBuckets(contas, HOJE);
    expect(faixas.aVencer.total).toBe(100);
    expect(faixas.ate15.total).toBe(200);
    expect(faixas.ate30.total).toBe(300);
    expect(faixas.ate60.total).toBe(400);
    expect(faixas.mais60.total).toBe(500);
  });

  it("ignora contas quitadas", () => {
    const contas = [
      conta({ dueDate: "2026-06-01", payments: [{ amount: 1000 }] }),
    ];
    expect(agingBuckets(contas, HOJE).mais60.total).toBe(0);
  });
});

describe("billsSummary", () => {
  it("soma a receber, a pagar e o que está atrasado", () => {
    const contas = [
      conta({ id: "a", value: 1000, dueDate: "2026-08-10" }),
      conta({ id: "b", value: 500, dueDate: "2026-07-20" }),
      conta({ id: "c", direction: "pagar", value: 300, dueDate: "2026-08-01" }),
      conta({ id: "d", direction: "pagar", value: 200, dueDate: "2026-07-10" }),
    ];
    const resumo = billsSummary(contas, HOJE);
    expect(resumo.aReceber).toBe(1500);
    expect(resumo.aPagar).toBe(500);
    expect(resumo.atrasadoReceber).toBe(500);
    expect(resumo.atrasadoPagar).toBe(200);
    expect(resumo.saldoPrevisto).toBe(1000);
    expect(resumo.contasAbertas).toBe(4);
  });

  it("desconta o que já foi pago parcialmente", () => {
    const contas = [conta({ value: 1000, payments: [{ amount: 400 }] })];
    expect(billsSummary(contas, HOJE).aReceber).toBe(600);
  });

  it("lida com lista vazia", () => {
    expect(billsSummary([], HOJE)).toMatchObject({
      aReceber: 0,
      aPagar: 0,
      contasAbertas: 0,
    });
  });
});

describe("cashFlowForecast", () => {
  it("projeta entradas e saídas por semana com saldo acumulado", () => {
    const contas = [
      conta({ id: "a", value: 1000, dueDate: "2026-07-30" }),
      conta({ id: "b", direction: "pagar", value: 400, dueDate: "2026-08-06" }),
    ];
    const fluxo = cashFlowForecast(contas, {
      from: HOJE,
      weeks: 2,
      openingBalance: 500,
    });
    expect(fluxo).toHaveLength(2);
    expect(fluxo[0]).toMatchObject({
      start: "2026-07-29",
      end: "2026-08-04",
      entradas: 1000,
      saidas: 0,
      acumulado: 1500,
    });
    expect(fluxo[1]).toMatchObject({
      entradas: 0,
      saidas: 400,
      acumulado: 1100,
    });
  });

  it("joga as contas atrasadas na primeira semana", () => {
    const contas = [conta({ value: 800, dueDate: "2026-05-01" })];
    const fluxo = cashFlowForecast(contas, { from: HOJE, weeks: 2 });
    expect(fluxo[0].entradas).toBe(800);
    expect(fluxo[1].entradas).toBe(0);
  });

  it("não conta o que já foi quitado", () => {
    const contas = [
      conta({ value: 800, dueDate: "2026-07-30", payments: [{ amount: 800 }] }),
    ];
    expect(cashFlowForecast(contas, { from: HOJE, weeks: 1 })[0].entradas).toBe(0);
  });
});

describe("upcomingBills", () => {
  it("lista da mais atrasada para a que vence mais longe", () => {
    const contas = [
      conta({ id: "futura", dueDate: "2026-08-05" }),
      conta({ id: "atrasada", dueDate: "2026-07-01" }),
      conta({ id: "hoje", dueDate: HOJE }),
    ];
    const fila = upcomingBills(contas, HOJE, 15).map((x) => x.bill.id);
    expect(fila).toEqual(["atrasada", "hoje", "futura"]);
  });

  it("respeita a janela de dias e ignora quitadas", () => {
    const contas = [
      conta({ id: "longe", dueDate: "2026-12-01" }),
      conta({ id: "paga", dueDate: HOJE, payments: [{ amount: 1000 }] }),
    ];
    expect(upcomingBills(contas, HOJE, 15)).toHaveLength(0);
  });
});

describe("nextRecurrence", () => {
  it("gera a conta do mês seguinte sem os pagamentos", () => {
    const c = conta({ recurring: true, dueDate: "2026-07-10", payments: [{ amount: 100 }] });
    const proxima = nextRecurrence(c, "c2");
    expect(proxima.dueDate).toBe("2026-08-10");
    expect(proxima.payments).toEqual([]);
    expect(proxima.id).toBe("c2");
  });

  it("vira o ano em dezembro", () => {
    const c = conta({ recurring: true, dueDate: "2026-12-15" });
    expect(nextRecurrence(c, "x").dueDate).toBe("2027-01-15");
  });

  it("ajusta o dia quando o mês seguinte é mais curto", () => {
    const c = conta({ recurring: true, dueDate: "2026-01-31" });
    expect(nextRecurrence(c, "x").dueDate).toBe("2026-02-28");
  });

  it("devolve nulo quando a conta não é recorrente", () => {
    expect(nextRecurrence(conta({ recurring: false }), "x")).toBeNull();
  });
});

describe("paymentToTransaction", () => {
  it("vira Receita no livro-caixa quando é conta a receber", () => {
    const lancamento = paymentToTransaction(
      conta(),
      { amount: 400, at: "2026-07-29T15:00:00.000Z" },
      { id: "t1", businessId: "b1", ownerId: "u1" },
    );
    expect(lancamento).toMatchObject({
      type: "Receita",
      value: 400,
      date: "2026-07-29",
      description: "Serviço de julho — Cliente A",
      category: "Serviços",
      billId: "c1",
    });
  });

  it("vira Despesa quando é conta a pagar", () => {
    const lancamento = paymentToTransaction(
      conta({ direction: "pagar", contactName: "" }),
      { amount: 150, at: "2026-07-29T15:00:00.000Z" },
      { id: "t2", businessId: "b1", ownerId: "u1" },
    );
    expect(lancamento.type).toBe("Despesa");
    expect(lancamento.description).toBe("Serviço de julho");
  });
});

describe("makeBill", () => {
  it("cria conta a receber por padrão, sem pagamentos", () => {
    const c = makeBill("novo", { businessId: "b1", ownerId: "u1" });
    expect(c.direction).toBe("receber");
    expect(c.payments).toEqual([]);
    expect(c.businessId).toBe("b1");
  });
});
