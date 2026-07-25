import { describe, expect, it } from "vitest";
import { workspaceBreakdown, trimOldConversations } from "./App";

describe("workspaceBreakdown", () => {
  it("lista as coleções por tamanho, maior primeiro", () => {
    const db = {
      conversations: [
        { id: "c1", messages: [{ content: "x".repeat(500) }] },
        { id: "c2", messages: [{ content: "y".repeat(500) }] },
      ],
      tasks: [{ id: "t1", title: "curta" }],
      leads: [],
    };
    const { rows, total } = workspaceBreakdown(db);
    expect(rows[0].key).toBe("conversations");
    expect(rows.map((r) => r.key)).toContain("tasks");
    // leads vazio não entra
    expect(rows.map((r) => r.key)).not.toContain("leads");
    expect(total).toBe(rows.reduce((s, r) => s + r.bytes, 0));
    expect(rows.find((r) => r.key === "tasks").count).toBe(1);
  });

  it("ignora coleções ausentes ou vazias", () => {
    expect(workspaceBreakdown({}).rows).toHaveLength(0);
    expect(workspaceBreakdown(null).rows).toHaveLength(0);
  });
});

describe("trimOldConversations", () => {
  const mk = (id, date) => ({ id, createdAt: date });
  it("mantém as N mais recentes por createdAt", () => {
    const list = [
      mk("a", "2026-01-01"),
      mk("b", "2026-05-01"),
      mk("c", "2026-03-01"),
      mk("d", "2026-07-01"),
    ];
    const kept = trimOldConversations(list, 2);
    expect(kept.map((c) => c.id)).toEqual(["d", "b"]);
  });

  it("não mexe quando já está dentro do limite", () => {
    const list = [mk("a", "2026-01-01")];
    expect(trimOldConversations(list, 5)).toBe(list);
    expect(trimOldConversations(undefined, 5)).toEqual([]);
  });
});
