const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const saldoAberto = (entry) => Math.max(0, number(entry?.valor) - number(entry?.valorPago));

export const statusFinanceiroEfetivo = (entry, now = new Date()) => {
  if (entry?.statusFinanceiro === "cancelled") return "cancelled";
  if (saldoAberto(entry) <= 0.0001 && number(entry?.valor) > 0) return "paid";
  const due = entry?.vencimentoEm ? new Date(`${entry.vencimentoEm}T23:59:59`) : null;
  if (due && !Number.isNaN(due.getTime()) && due < now) return "overdue";
  if (number(entry?.valorPago) > 0) return "partial";
  return "pending";
};

export const resumoFinanceiro = (entries = [], now = new Date()) => entries.reduce((summary, entry) => {
  const valor = number(entry.valor);
  const pago = Math.min(valor, Math.max(0, number(entry.valorPago)));
  const status = statusFinanceiroEfetivo(entry, now);
  if (status === "cancelled") {
    summary.cancelado += valor;
    return summary;
  }
  summary.total += valor;
  summary.pago += pago;
  summary.aberto += Math.max(0, valor - pago);
  if (status === "overdue") summary.vencido += Math.max(0, valor - pago);
  if (pago > 0 && pago < valor) summary.parciais += 1;
  return summary;
}, { total: 0, pago: 0, aberto: 0, vencido: 0, cancelado: 0, parciais: 0 });

export const agruparPorCentroDeCusto = (entries = []) => Object.entries(entries.reduce((groups, entry) => {
  const key = entry.centroCusto || "Sem centro de custo";
  groups[key] = (groups[key] || 0) + number(entry.valor);
  return groups;
}, {})).sort((a, b) => b[1] - a[1]);
