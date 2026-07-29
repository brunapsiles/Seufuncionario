// ===== Contas a receber e a pagar =====
// Camada pura. O módulo Financeiro existente é um livro-caixa (dinheiro que já
// entrou ou saiu). Aqui tratamos do dinheiro COMBINADO mas ainda não movimentado:
// vencimento, pagamento parcial, atraso, inadimplência e fluxo projetado.

import { parseBrNumber } from "../../domain.js";

export const BILL_DIRECTIONS = [
  { id: "receber", label: "A receber", sign: 1 },
  { id: "pagar", label: "A pagar", sign: -1 },
];

// Reusa o parser de número no formato brasileiro já existente ("1.250,50").
const money = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return parseBrNumber(value);
};

const round2 = (n) => Math.round(n * 100) / 100;

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

// Diferença em dias inteiros entre duas datas AAAA-MM-DD (b - a).
export const daysBetween = (a, b) => {
  if (!isDate(a) || !isDate(b)) return 0;
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
};

export const addDays = (date, days) => {
  if (!isDate(date)) return date;
  const base = Date.parse(`${date}T00:00:00Z`) + days * 86400000;
  return new Date(base).toISOString().slice(0, 10);
};

// Total já pago de uma conta (aceita pagamentos parciais).
export const billPaidTotal = (bill) =>
  round2((bill?.payments || []).reduce((total, p) => total + money(p.amount), 0));

// Quanto ainda falta pagar/receber. Nunca negativo.
export const billOpenAmount = (bill) =>
  round2(Math.max(0, money(bill?.value) - billPaidTotal(bill)));

// Situação da conta numa data. "quitada" quando não resta saldo em aberto.
// days: negativo = ainda vai vencer; positivo = dias de atraso.
export const billStatus = (bill, today) => {
  const open = billOpenAmount(bill);
  const paid = billPaidTotal(bill);
  if (open <= 0 && money(bill?.value) > 0)
    return { state: "quitada", label: "Quitada", days: 0, open: 0, paid };
  const days = daysBetween(bill?.dueDate, today);
  if (!isDate(bill?.dueDate))
    return { state: "sem-data", label: "Sem vencimento", days: 0, open, paid };
  if (days > 0)
    return {
      state: "atrasada",
      label: `Atrasada ${days} ${days === 1 ? "dia" : "dias"}`,
      days,
      open,
      paid,
    };
  if (days === 0)
    return { state: "vence-hoje", label: "Vence hoje", days: 0, open, paid };
  return {
    state: "a-vencer",
    label: `Vence em ${-days} ${days === -1 ? "dia" : "dias"}`,
    days,
    open,
    paid,
  };
};

// Registra um pagamento (total ou parcial) e devolve a conta atualizada.
// Nunca aceita valor maior que o saldo em aberto.
export const registerPayment = (bill, { id, amount, at, method = "" }) => {
  const open = billOpenAmount(bill);
  const valor = Math.min(open, round2(money(amount)));
  if (valor <= 0) return bill;
  return {
    ...bill,
    payments: [
      ...(bill.payments || []),
      { id, amount: valor, at, method },
    ],
  };
};

// Inadimplência por faixa de atraso — a leitura clássica de quem deve há quanto
// tempo. Só considera contas com saldo em aberto.
export const agingBuckets = (bills, today) => {
  const buckets = {
    aVencer: { label: "A vencer", total: 0, count: 0 },
    ate15: { label: "Atraso até 15 dias", total: 0, count: 0 },
    ate30: { label: "Atraso de 16 a 30 dias", total: 0, count: 0 },
    ate60: { label: "Atraso de 31 a 60 dias", total: 0, count: 0 },
    mais60: { label: "Atraso acima de 60 dias", total: 0, count: 0 },
  };
  for (const bill of bills || []) {
    const status = billStatus(bill, today);
    if (status.state === "quitada" || status.open <= 0) continue;
    let key = "aVencer";
    if (status.days > 60) key = "mais60";
    else if (status.days > 30) key = "ate60";
    else if (status.days > 15) key = "ate30";
    else if (status.days > 0) key = "ate15";
    buckets[key].total = round2(buckets[key].total + status.open);
    buckets[key].count += 1;
  }
  return buckets;
};

// Painel de números do módulo.
export const billsSummary = (bills, today) => {
  const resumo = {
    aReceber: 0,
    aPagar: 0,
    atrasadoReceber: 0,
    atrasadoPagar: 0,
    venceEmSete: 0,
    saldoPrevisto: 0,
    contasAbertas: 0,
  };
  for (const bill of bills || []) {
    const status = billStatus(bill, today);
    if (status.state === "quitada" || status.open <= 0) continue;
    resumo.contasAbertas += 1;
    const receber = bill.direction !== "pagar";
    if (receber) {
      resumo.aReceber = round2(resumo.aReceber + status.open);
      if (status.state === "atrasada")
        resumo.atrasadoReceber = round2(resumo.atrasadoReceber + status.open);
    } else {
      resumo.aPagar = round2(resumo.aPagar + status.open);
      if (status.state === "atrasada")
        resumo.atrasadoPagar = round2(resumo.atrasadoPagar + status.open);
    }
    if (status.days > -7 && status.days <= 0)
      resumo.venceEmSete = round2(
        resumo.venceEmSete + (receber ? status.open : -status.open),
      );
  }
  resumo.saldoPrevisto = round2(resumo.aReceber - resumo.aPagar);
  return resumo;
};

// Fluxo de caixa projetado por semana, a partir das contas em aberto.
// Contas atrasadas entram na primeira semana — o dinheiro ainda é esperado.
export const cashFlowForecast = (
  bills,
  { from, weeks = 8, openingBalance = 0 } = {},
) => {
  const inicio = isDate(from) ? from : new Date().toISOString().slice(0, 10);
  const periodos = [];
  let acumulado = round2(money(openingBalance));
  for (let i = 0; i < weeks; i += 1) {
    const start = addDays(inicio, i * 7);
    const end = addDays(inicio, i * 7 + 6);
    let entradas = 0;
    let saidas = 0;
    for (const bill of bills || []) {
      const status = billStatus(bill, inicio);
      if (status.state === "quitada" || status.open <= 0) continue;
      if (!isDate(bill.dueDate)) continue;
      const venceAntes = bill.dueDate < start;
      const dentro = bill.dueDate >= start && bill.dueDate <= end;
      // Atrasadas caem na primeira semana; as demais na semana do vencimento.
      const contaAqui = dentro || (i === 0 && venceAntes);
      if (!contaAqui) continue;
      if (bill.direction === "pagar") saidas = round2(saidas + status.open);
      else entradas = round2(entradas + status.open);
    }
    acumulado = round2(acumulado + entradas - saidas);
    periodos.push({
      start,
      end,
      entradas,
      saidas,
      resultado: round2(entradas - saidas),
      acumulado,
    });
  }
  return periodos;
};

// Contas que vencem nos próximos N dias (inclui atrasadas), da mais urgente
// para a menos urgente — a fila de trabalho do dia.
export const upcomingBills = (bills, today, days = 15) =>
  (bills || [])
    .map((bill) => ({ bill, status: billStatus(bill, today) }))
    .filter(
      ({ status }) =>
        status.state !== "quitada" &&
        status.state !== "sem-data" &&
        status.open > 0 &&
        status.days >= -days,
    )
    .sort((a, b) => b.status.days - a.status.days);

// Gera a próxima conta de uma série recorrente (mensal), quando marcada.
export const nextRecurrence = (bill, id) => {
  if (!bill?.recurring || !isDate(bill.dueDate)) return null;
  const [ano, mes, dia] = bill.dueDate.split("-").map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const ultimoDia = new Date(Date.UTC(proximoAno, proximoMes, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return {
    ...bill,
    id,
    payments: [],
    dueDate: `${proximoAno}-${String(proximoMes).padStart(2, "0")}-${String(
      diaFinal,
    ).padStart(2, "0")}`,
  };
};

// Lançamento para o livro-caixa quando uma conta é paga/recebida — é isso que
// mantém o Financeiro e as contas contando a mesma história.
export const paymentToTransaction = (bill, payment, { id, businessId, ownerId }) => ({
  id,
  type: bill.direction === "pagar" ? "Despesa" : "Receita",
  description: `${bill.description}${bill.contactName ? ` — ${bill.contactName}` : ""}`,
  value: round2(money(payment.amount)),
  date: String(payment.at || "").slice(0, 10),
  category: bill.category || "Geral",
  businessId,
  ownerId,
  billId: bill.id,
});

export const makeBill = (id, { businessId = null, ownerId = null, direction = "receber" } = {}) => ({
  id,
  direction,
  description: "",
  contactName: "",
  value: "",
  dueDate: new Date().toISOString().slice(0, 10),
  category: "Geral",
  notes: "",
  recurring: false,
  payments: [],
  businessId,
  ownerId,
  createdAt: new Date().toISOString(),
});
