import { describe, expect, it, vi } from "vitest";
import {
  normalizeSearchQuery,
  normalizeSearchResults,
  searchWeb,
  shouldSearchWeb,
  webResultsToContext,
} from "../worker/services/web-search.js";

describe("web search service", () => {
  it("detecta pedido de informação atual sem forçar busca em toda conversa", () => {
    expect(shouldSearchWeb("Pesquise os preços atuais", undefined)).toBe(true);
    expect(shouldSearchWeb("Escreva um e-mail para a Ana", undefined)).toBe(false);
    expect(shouldSearchWeb("qualquer coisa", true)).toBe(true);
    expect(shouldSearchWeb("pesquise agora", false)).toBe(false);
  });

  it("normaliza consulta e descarta resultados sem URL segura", () => {
    expect(normalizeSearchQuery("  preço   atual  ")).toBe("preço atual");
    expect(
      normalizeSearchResults(
        [
          { title: "Fonte", url: "https://example.com", description: "Resumo" },
          { title: "Perigosa", url: "javascript:alert(1)" },
        ],
        "Teste",
      ),
    ).toEqual([
      {
        title: "Fonte",
        url: "https://example.com/",
        snippet: "Resumo",
        provider: "Teste",
      },
    ]);
  });

  it("usa Brave sem expor a chave no resultado", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            {
              title: "Resultado",
              url: "https://example.com/a",
              description: "Informação recuperada.",
            },
          ],
        },
      }),
    });
    const result = await searchWeb(
      { BRAVE_SEARCH_API_KEY: "segredo" },
      "mercado atual",
      { fetcher },
    );
    expect(result.providers).toEqual(["Brave Search"]);
    expect(result.results).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("segredo");
    expect(fetcher.mock.calls[0][1].headers["x-subscription-token"]).toBe(
      "segredo",
    );
  });

  it("combina provedores e remove links repetidos", async () => {
    const fetcher = vi.fn(async (url) => {
      if (String(url).includes("tavily"))
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                title: "Fonte Tavily",
                url: "https://example.com/noticia",
                content: "Resumo Tavily",
              },
            ],
          }),
        };
      return {
        ok: true,
        json: async () => ({
          organic: [
            {
              title: "Mesma fonte",
              link: "https://example.com/noticia?ref=google",
              snippet: "Resumo Serper",
            },
            {
              title: "Outra fonte",
              link: "https://example.org/",
              snippet: "Outro resumo",
            },
          ],
        }),
      };
    });
    const result = await searchWeb(
      { TAVILY_API_KEY: "t", SERPER_API_KEY: "s" },
      "pesquisa profunda",
      { fetcher },
    );
    expect(result.providers).toEqual(["Tavily", "Serper"]);
    expect(result.results).toHaveLength(2);
  });

  it("produz contexto numerado com obrigação de citar", () => {
    const context = webResultsToContext({
      results: [
        { title: "Fonte", url: "https://example.com", snippet: "Trecho" },
      ],
    });
    expect(context).toContain("[1] Fonte");
    expect(context).toContain("Cite a fonte");
  });
});
