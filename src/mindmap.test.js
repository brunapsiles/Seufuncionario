import { describe, expect, it } from "vitest";
import { parseMindMap } from "./domain.js";

describe("parseMindMap", () => {
  it("estrutura título e ramos com ideias", () => {
    const raw = JSON.stringify({
      title: "Atrair clientes",
      branches: [
        { title: "Redes sociais", ideas: ["Postar todo dia", "Fazer reels"] },
        { title: "Indicações", ideas: ["Programa de indicação"] },
      ],
    });
    const map = parseMindMap(raw);
    expect(map.title).toBe("Atrair clientes");
    expect(map.branches).toHaveLength(2);
    expect(map.branches[0]).toMatchObject({
      title: "Redes sociais",
      ideas: ["Postar todo dia", "Fazer reels"],
    });
    expect(map.branches[1].ideas).toEqual(["Programa de indicação"]);
  });

  it("aceita chaves em português e limpa marcadores", () => {
    const raw =
      '```json\n{"titulo":"Tema","ramos":[{"titulo":"A","ideias":["- um","2) dois"]}]}\n```';
    const map = parseMindMap(raw);
    expect(map.title).toBe("Tema");
    expect(map.branches[0].title).toBe("A");
    expect(map.branches[0].ideas).toEqual(["um", "dois"]);
  });

  it("descarta ramos vazios e tolera texto ao redor", () => {
    const raw =
      'Segue:\n{"branches":[{"title":"","ideas":[]},{"title":"Ok","ideas":["x"]}]}';
    const map = parseMindMap(raw);
    expect(map.branches).toHaveLength(1);
    expect(map.branches[0].title).toBe("Ok");
  });

  it("retorna vazio quando não há JSON ou ramos", () => {
    expect(parseMindMap("").branches).toEqual([]);
    expect(parseMindMap("nada aqui").branches).toEqual([]);
    expect(parseMindMap('{"branches":[]}').branches).toEqual([]);
  });
});
