import { describe, expect, it } from "vitest";
import { buildOrderReceita, buildLeadWonSideEffects } from "./App";

describe("buildOrderReceita (pedido → caixa)", () => {
  it("cria uma receita a partir do total do pedido", () => {
    const receita = buildOrderReceita(
      { id: "o1", clientName: "João", total: 150 },
      { businessId: "b1", ownerId: "u1" },
    );
    expect(receita).toMatchObject({
      type: "Receita",
      value: 150,
      category: "Vendas",
      businessId: "b1",
      ownerId: "u1",
      sourceOrderId: "o1",
    });
    expect(receita.description).toContain("João");
  });

  it("não lança nada quando o total é zero ou negativo", () => {
    expect(buildOrderReceita({ total: 0 }, {})).toBeNull();
    expect(buildOrderReceita({ total: -5 }, {})).toBeNull();
    expect(buildOrderReceita({}, {})).toBeNull();
  });
});

describe("buildLeadWonSideEffects (lead ganho → tarefa + timeline)", () => {
  it("cria uma tarefa de primeiro atendimento vinculada ao lead", () => {
    const { task } = buildLeadWonSideEffects(
      { id: "l1", name: "Maria", contact: "5511999998888", project: "Contrato" },
      { businessId: "b1", ownerId: "u1" },
    );
    expect(task).toMatchObject({
      status: "A fazer",
      priority: "Alta",
      project: "Contrato",
      businessId: "b1",
      ownerId: "u1",
      sourceLeadId: "l1",
    });
    expect(task.title).toContain("Maria");
  });

  it("cria uma interação para a linha do tempo do cliente", () => {
    const { interaction } = buildLeadWonSideEffects(
      { id: "l2", name: "Bruno", contact: "bruno@empresa.com" },
      {},
    );
    expect(interaction).toMatchObject({
      channel: "note",
      direction: "out",
      contactName: "Bruno",
      subject: "Negócio ganho",
    });
    expect(interaction.contactHandle).toBe("bruno@empresa.com");
  });
});
