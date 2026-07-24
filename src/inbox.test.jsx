import { describe, expect, it } from "vitest";
import { groupInteractions } from "./App";

const mk = (over) => ({
  id: Math.random().toString(36).slice(2),
  contactId: "",
  contactName: "",
  contactHandle: "",
  channel: "whatsapp",
  direction: "out",
  subject: "",
  body: "oi",
  createdAt: "2026-07-01T10:00:00.000Z",
  readAt: null,
  ...over,
});

describe("groupInteractions", () => {
  it("agrupa por contato e conta as não lidas", () => {
    const threads = groupInteractions([
      mk({ contactId: "c1", contactName: "Ana", createdAt: "2026-07-01T10:00:00Z", readAt: "x" }),
      mk({ contactId: "c1", contactName: "Ana", createdAt: "2026-07-02T10:00:00Z", readAt: null }),
      mk({ contactId: "c2", contactName: "Bruno", createdAt: "2026-07-03T10:00:00Z", readAt: null }),
    ]);
    expect(threads).toHaveLength(2);
    const ana = threads.find((t) => t.key === "c1");
    expect(ana.items).toHaveLength(2);
    expect(ana.unread).toBe(1);
  });

  it("ordena as threads pela interação mais recente", () => {
    const threads = groupInteractions([
      mk({ contactId: "old", createdAt: "2026-06-01T10:00:00Z" }),
      mk({ contactId: "new", createdAt: "2026-07-20T10:00:00Z" }),
    ]);
    expect(threads[0].key).toBe("new");
  });

  it("reúne por telefone/e-mail quando não há id de contato", () => {
    const threads = groupInteractions([
      mk({ contactHandle: "5511988887777", body: "1" }),
      mk({ contactHandle: "5511988887777", body: "2" }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].items).toHaveLength(2);
  });
});
