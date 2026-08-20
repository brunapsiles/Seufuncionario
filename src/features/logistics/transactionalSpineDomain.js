const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const SERVICE_ORDER_TRANSITIONS = Object.freeze({
  draft: ["released", "cancelled"],
  released: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
});

export function canTransitionServiceOrder(from, to) {
  return (SERVICE_ORDER_TRANSITIONS[from] || []).includes(to);
}

export function serviceOrderAmounts(input = {}) {
  const quantity = Math.max(0, number(input.quantity));
  const unitPrice = Math.max(0, number(input.unitPrice));
  const grossAmount = quantity * unitPrice;
  const discountAmount = Math.min(grossAmount, Math.max(0, number(input.discountAmount)));
  const taxAmount = Math.max(0, number(input.taxAmount));
  return {
    quantity,
    unitPrice,
    grossAmount,
    discountAmount,
    taxAmount,
    netAmount: grossAmount - discountAmount + taxAmount,
  };
}

export function validateAllocation(total, allocations = [], tolerance = 0.01) {
  const expected = Math.max(0, number(total));
  if (!expected) return { valid: false, error: "O custo precisa ser maior que zero." };
  if (!Array.isArray(allocations) || !allocations.length)
    return { valid: false, error: "Informe ao menos um rateio." };
  const allocated = allocations.reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0);
  if (Math.abs(expected - allocated) > tolerance)
    return { valid: false, error: "A soma dos rateios precisa ser igual ao custo." };
  if (allocations.some((item) => !item.serviceOrderId && !item.operationId && !item.clientId &&
    !item.contractId && !item.vehicleId && !item.supplierId && !item.costCenterId))
    return { valid: false, error: "Cada rateio precisa apontar para ao menos uma dimensão." };
  return { valid: true, allocated };
}

export function settlementState(openAmount, amount) {
  const open = Math.max(0, number(openAmount));
  const paid = Math.max(0, number(amount));
  if (!paid) return { valid: false, error: "O valor da baixa precisa ser maior que zero." };
  if (paid > open + 0.01) return { valid: false, error: "A baixa não pode superar o saldo em aberto." };
  const remaining = Math.max(0, open - paid);
  return { valid: true, remaining, status: remaining <= 0.01 ? "settled" : "partial" };
}
