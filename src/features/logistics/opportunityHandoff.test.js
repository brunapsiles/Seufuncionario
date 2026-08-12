import { describe, expect, it } from "vitest";
import { deveCriarHandoff } from "../../../worker/services/todogreen-vertical-records.js";

describe("handoff comercial para operação", () => {
  it("abre o handoff somente na transição para fechada ganha", () => {
    expect(deveCriarHandoff("Negociação", "Fechada ganha")).toBe(true);
    expect(deveCriarHandoff("Fechada ganha", "Fechada ganha")).toBe(false);
    expect(deveCriarHandoff("Proposta", "Fechada perdida")).toBe(false);
  });
});
