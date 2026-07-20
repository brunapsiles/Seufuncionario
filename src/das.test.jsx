import { describe, expect, it } from "vitest";
import { dasStatus, buildDasReminder, monthLabelPt } from "./App";

const meiProfile = (overrides = {}) => ({
  isMEI: true,
  dueDay: 20,
  cnpj: "",
  dasHistory: {},
  ...overrides,
});

describe("dasStatus", () => {
  it("retorna 'off' quando a pessoa não é MEI", () => {
    expect(dasStatus({ isMEI: false }, "2026-07-25").status).toBe("off");
  });

  it("'a_pagar' antes do vencimento, 'atrasado' depois, 'pago' quando marcado", () => {
    expect(dasStatus(meiProfile(), "2026-07-10").status).toBe("a_pagar");
    expect(dasStatus(meiProfile(), "2026-07-20").status).toBe("a_pagar");
    expect(dasStatus(meiProfile(), "2026-07-21").status).toBe("atrasado");
    expect(
      dasStatus(
        meiProfile({ dasHistory: { "2026-07": { paid: true } } }),
        "2026-07-25",
      ).status,
    ).toBe("pago");
  });

  it("respeita um dia de vencimento personalizado", () => {
    const custom = meiProfile({ dueDay: 15 });
    expect(dasStatus(custom, "2026-07-15").status).toBe("a_pagar");
    expect(dasStatus(custom, "2026-07-16").status).toBe("atrasado");
  });
});

describe("buildDasReminder", () => {
  it("não gera lembrete cedo demais no mês", () => {
    expect(buildDasReminder(meiProfile(), [], "u1", "2026-07-05")).toBeNull();
  });

  it("gera lembrete a partir de 5 dias antes do vencimento", () => {
    const result = buildDasReminder(meiProfile(), [], "u1", "2026-07-16");
    expect(result).not.toBeNull();
    expect(result[0].id).toBe("das-2026-07-lembrete");
    expect(result[0].assigneeId).toBe("u1");
    expect(result[0].link).toBe("financeiro");
    expect(result[0].message).toContain("vence no dia 20");
  });

  it("gera aviso de atraso após o vencimento", () => {
    const result = buildDasReminder(meiProfile(), [], "u1", "2026-07-25");
    expect(result[0].id).toBe("das-2026-07-atrasado");
    expect(result[0].message).toContain("venceu");
  });

  it("é idempotente: não duplica um lembrete já existente", () => {
    const existing = [
      { id: "das-2026-07-lembrete", assigneeId: "u1", message: "x" },
    ];
    expect(
      buildDasReminder(meiProfile(), existing, "u1", "2026-07-16"),
    ).toBeNull();
  });

  it("não gera nada quando o mês já está pago", () => {
    const paid = meiProfile({ dasHistory: { "2026-07": { paid: true } } });
    expect(buildDasReminder(paid, [], "u1", "2026-07-25")).toBeNull();
  });

  it("não gera nada sem usuário", () => {
    expect(buildDasReminder(meiProfile(), [], "", "2026-07-25")).toBeNull();
  });
});

describe("monthLabelPt", () => {
  it("formata o mês em português com inicial maiúscula", () => {
    expect(monthLabelPt("2026-07")).toMatch(/^Julho de 2026$/);
  });
});
