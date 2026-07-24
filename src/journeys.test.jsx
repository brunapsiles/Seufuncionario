import { describe, expect, it } from "vitest";
import {
  buildOrderReceita,
  buildLeadWonSideEffects,
  quoteTotal,
  orderFromQuote,
} from "./App";

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

describe("quoteTotal (orçamento)", () => {
  it("soma as linhas e desconta, nunca negativo", () => {
    expect(
      quoteTotal({
        items: [
          { price: 50, quantity: 2 },
          { price: 30, quantity: 1 },
        ],
        discount: 10,
      }),
    ).toBe(120);
    expect(quoteTotal({ items: [{ price: 10, quantity: 1 }], discount: 999 })).toBe(0);
    expect(quoteTotal({})).toBe(0);
  });
});

describe("orderFromQuote (orçamento aprovado → pedido)", () => {
  it("gera um pedido a partir do orçamento, preservando itens e total", () => {
    const order = orderFromQuote(
      {
        id: "q1",
        clientName: "Ana",
        clientContact: "5511911112222",
        items: [{ name: "Lavagem", price: 40, quantity: 3 }],
        discount: 20,
      },
      { businessId: "b1", ownerId: "u1" },
    );
    expect(order).toMatchObject({
      clientName: "Ana",
      channel: "Orçamento",
      status: "Novo",
      total: 100,
      businessId: "b1",
      ownerId: "u1",
      sourceQuoteId: "q1",
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ name: "Lavagem", price: 40, quantity: 3 });
  });

  it("um pedido vindo de orçamento também vira receita no caixa", () => {
    const order = orderFromQuote(
      { id: "q2", clientName: "Ana", items: [{ name: "X", price: 100, quantity: 1 }] },
      { businessId: "b1", ownerId: "u1" },
    );
    const receita = buildOrderReceita(order, {
      businessId: order.businessId,
      ownerId: order.ownerId,
    });
    expect(receita).toMatchObject({ type: "Receita", value: 100, sourceOrderId: order.id });
  });
});
