import { describe, expect, it } from "vitest";
import { fillWhatsappTemplate, DEFAULT_WA_TEMPLATES } from "./App";

describe("fillWhatsappTemplate", () => {
  it("substitui variáveis conhecidas pelos valores informados", () => {
    const out = fillWhatsappTemplate("Olá {{nome}}, total {{valor}}.", {
      nome: "Ana",
      valor: "R$ 50,00",
    });
    expect(out).toBe("Olá Ana, total R$ 50,00.");
  });

  it("marca variáveis sem valor com [chave] para o usuário completar", () => {
    const out = fillWhatsappTemplate("Oi {{nome}}, {{negocio}}!", {
      nome: "Ana",
    });
    expect(out).toBe("Oi Ana, [negocio]!");
  });

  it("tolera espaços dentro das chaves e valores vazios", () => {
    expect(fillWhatsappTemplate("{{ nome }}", { nome: "" })).toBe("[nome]");
    expect(fillWhatsappTemplate("{{ nome }}", { nome: "Zé" })).toBe("Zé");
  });

  it("todos os modelos padrão preenchem sem sobrar chaves duplas", () => {
    const vars = {
      nome: "Ana",
      negocio: "Loja",
      itens: "2x Caneca",
      status: "Enviado",
      valor: "R$ 60",
      servico: "Corte",
      data: "20/07",
      hora: "14h",
      descricao: "serviço",
    };
    for (const t of DEFAULT_WA_TEMPLATES) {
      const out = fillWhatsappTemplate(t.body, vars);
      expect(out).not.toMatch(/\{\{|\}\}/);
    }
  });
});
