import { describe, expect, it } from "vitest";
import { buildPageTree, pageDescendantIds, searchPages } from "./domain.js";

const pages = [
  { id: "a", title: "Processos", parentId: null, content: "raiz" },
  { id: "b", title: "Vendas", parentId: "a", content: "como vender" },
  { id: "c", title: "Atendimento", parentId: "a", content: "sac" },
  { id: "d", title: "Script", parentId: "b", content: "roteiro" },
  { id: "e", title: "Financeiro", parentId: null, content: "caixa" },
];

describe("buildPageTree", () => {
  it("monta a árvore por parentId e ordena", () => {
    const tree = buildPageTree(pages);
    expect(tree.map((n) => n.title)).toEqual(["Financeiro", "Processos"]);
    const processos = tree.find((n) => n.id === "a");
    expect(processos.children.map((n) => n.title)).toEqual(["Atendimento", "Vendas"]);
    const vendas = processos.children.find((n) => n.id === "b");
    expect(vendas.children.map((n) => n.title)).toEqual(["Script"]);
  });

  it("promove órfãos (pai inexistente) para a raiz", () => {
    const tree = buildPageTree([{ id: "x", title: "Solta", parentId: "zzz" }]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("x");
  });
});

describe("pageDescendantIds", () => {
  it("retorna a página e todos os descendentes", () => {
    expect(pageDescendantIds(pages, "a").sort()).toEqual(["a", "b", "c", "d"]);
    expect(pageDescendantIds(pages, "b").sort()).toEqual(["b", "d"]);
    expect(pageDescendantIds(pages, "e")).toEqual(["e"]);
  });
});

describe("searchPages", () => {
  it("filtra por título ou conteúdo", () => {
    expect(searchPages(pages, "roteiro").map((p) => p.id)).toEqual(["d"]);
    expect(searchPages(pages, "vend").map((p) => p.id)).toEqual(["b"]);
    expect(searchPages(pages, "").length).toBe(pages.length);
  });
});
