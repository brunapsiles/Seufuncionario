import { describe, expect, it } from "vitest";
import {
  canTransitionServiceOrder,
  serviceOrderAmounts,
  settlementState,
  validateAllocation,
} from "./features/logistics/transactionalSpineDomain.js";

describe("espinha transacional To Do Green", () => {
  it("impede pular a execução da ordem de serviço", () => {
    expect(canTransitionServiceOrder("draft", "released")).toBe(true);
    expect(canTransitionServiceOrder("draft", "completed")).toBe(false);
    expect(canTransitionServiceOrder("completed", "in_progress")).toBe(false);
  });

  it("calcula o valor faturável sem permitir desconto acima do bruto", () => {
    expect(serviceOrderAmounts({ quantity: 10, unitPrice: 12, discountAmount: 200, taxAmount: 5 }))
      .toEqual({ quantity: 10, unitPrice: 12, grossAmount: 120, discountAmount: 120, taxAmount: 5, netAmount: 5 });
  });

  it("exige rateio integral e pelo menos uma dimensão", () => {
    expect(validateAllocation(100, [{ amount: 60, clientId: "c" }, { amount: 40, vehicleId: "v" }]).valid).toBe(true);
    expect(validateAllocation(100, [{ amount: 90, clientId: "c" }]).valid).toBe(false);
    expect(validateAllocation(100, [{ amount: 100 }]).valid).toBe(false);
  });

  it("não permite baixa maior que o saldo", () => {
    expect(settlementState(100, 40)).toMatchObject({ valid: true, remaining: 60, status: "partial" });
    expect(settlementState(100, 100)).toMatchObject({ valid: true, remaining: 0, status: "settled" });
    expect(settlementState(100, 101).valid).toBe(false);
  });
});
