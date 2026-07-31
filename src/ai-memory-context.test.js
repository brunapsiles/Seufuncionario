import { describe, expect, it } from "vitest";
import {
  memoriesToSystemContext,
  selectApprovedMemories,
} from "../worker/services/ai-memory.js";

describe("AI memory context", () => {
  it("usa apenas memórias aprovadas e compatíveis com o escopo", () => {
    const result = selectApprovedMemories(
      [
        { text: "Prefiro respostas curtas.", approved: true, scope: "pessoal" },
        { text: "Segredo pendente.", approved: false, scope: "pessoal" },
        {
          text: "Tom formal.",
          approved: true,
          scope: "especialista",
          scopeRef: "Redator",
        },
        {
          text: "Outro especialista.",
          approved: true,
          scope: "especialista",
          scopeRef: "Financeiro",
        },
        { text: "Dado do projeto.", approved: true, scope: "projeto" },
      ],
      { specialist: "Redator" },
    );
    expect(result.map((item) => item.text)).toEqual([
      "Prefiro respostas curtas.",
      "Tom formal.",
    ]);
  });

  it("explica que memória não supera a instrução atual", () => {
    const context = memoriesToSystemContext([
      { text: "Use tom direto.", scope: "pessoal", scopeRef: "" },
    ]);
    expect(context).toContain("MEMÓRIAS APROVADAS");
    expect(context).toContain("instrução atual prevalece");
  });
});
