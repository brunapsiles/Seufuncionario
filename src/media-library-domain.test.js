import { describe, expect, it } from "vitest";
import {
  HEAVY_LIBRARY_BYTES,
  allTags,
  filterMedia,
  forBusiness,
  itemBytes,
  libraryStats,
  libraryWarning,
  normalizeTag,
  removeMedia,
  renameMedia,
  sortMedia,
  toggleTag,
  typeLabel,
  upsertMedia,
} from "./features/media/libraryDomain";

const item = (extra = {}) => ({
  id: extra.id || `m-${Math.random()}`,
  type: "image",
  name: "",
  createdAt: "2026-08-01T10:00:00.000Z",
  tags: [],
  ...extra,
});

const ACERVO = [
  item({
    id: "a",
    name: "Logo azul",
    type: "logo",
    tags: ["marca"],
    createdAt: "2026-08-03T10:00:00.000Z",
  }),
  item({
    id: "b",
    name: "Bolo de cenoura",
    type: "image",
    tags: ["produto", "marca"],
    createdAt: "2026-08-01T10:00:00.000Z",
    bytes: 400_000,
  }),
  item({
    id: "c",
    name: "Recado do cliente",
    type: "audio",
    transcript: "confirmar entrega na quinta",
    createdAt: "2026-08-02T10:00:00.000Z",
  }),
];

describe("forBusiness", () => {
  it("mostra só o que é do negócio aberto", () => {
    const lista = [item({ id: "x", businessId: "b1" }), item({ id: "y", businessId: "b2" })];
    expect(forBusiness(lista, "b1").map((i) => i.id)).toEqual(["x"]);
  });

  it("arquivo sem negócio aparece em qualquer um — é herança de versão antiga", () => {
    const lista = [item({ id: "x", businessId: null })];
    expect(forBusiness(lista, "b1")).toHaveLength(1);
  });

  it("sem negócio escolhido, mostra tudo", () => {
    expect(forBusiness(ACERVO, null)).toHaveLength(3);
  });
});

describe("filterMedia", () => {
  it("busca pelo nome", () => {
    expect(filterMedia(ACERVO, { q: "bolo" }).map((i) => i.id)).toEqual(["b"]);
  });

  it("busca dentro da transcrição do áudio", () => {
    expect(filterMedia(ACERVO, { q: "entrega" }).map((i) => i.id)).toEqual(["c"]);
  });

  it("todos os termos precisam bater, não qualquer um", () => {
    expect(filterMedia(ACERVO, { q: "logo azul" }).map((i) => i.id)).toEqual(["a"]);
    expect(filterMedia(ACERVO, { q: "logo cenoura" })).toEqual([]);
  });

  it("ignora maiúscula", () => {
    expect(filterMedia(ACERVO, { q: "LOGO" })).toHaveLength(1);
  });

  it("filtra por tipo", () => {
    expect(filterMedia(ACERVO, { type: "audio" }).map((i) => i.id)).toEqual(["c"]);
    expect(filterMedia(ACERVO, { type: "todos" })).toHaveLength(3);
  });

  it("filtra por etiqueta", () => {
    expect(filterMedia(ACERVO, { tag: "marca" }).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("sem filtro nenhum, devolve tudo", () => {
    expect(filterMedia(ACERVO, {})).toHaveLength(3);
    expect(filterMedia(ACERVO)).toHaveLength(3);
  });

  it("lista inválida não quebra a tela", () => {
    expect(filterMedia(null, { q: "x" })).toEqual([]);
  });
});

describe("sortMedia", () => {
  it("mais recentes primeiro, por padrão", () => {
    expect(sortMedia(ACERVO).map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("mais antigos primeiro", () => {
    expect(sortMedia(ACERVO, "antigos").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("por nome, respeitando acento do português", () => {
    expect(sortMedia(ACERVO, "nome").map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("maiores primeiro", () => {
    expect(sortMedia(ACERVO, "tamanho")[0].id).toBe("b");
  });

  it("não altera a lista original", () => {
    const antes = ACERVO.map((i) => i.id);
    sortMedia(ACERVO, "antigos");
    expect(ACERVO.map((i) => i.id)).toEqual(antes);
  });
});

describe("etiquetas", () => {
  it("lista as etiquetas em uso, mais usadas primeiro", () => {
    expect(allTags(ACERVO)).toEqual([
      { tag: "marca", total: 2 },
      { tag: "produto", total: 1 },
    ]);
  });

  it("põe e tira a etiqueta no mesmo clique", () => {
    const comTag = toggleTag(item({ tags: [] }), "promoção");
    expect(comTag.tags).toEqual(["promoção"]);
    expect(toggleTag(comTag, "promoção").tags).toEqual([]);
  });

  it("etiqueta vazia não entra", () => {
    const base = item({ tags: ["x"] });
    expect(toggleTag(base, "   ").tags).toEqual(["x"]);
  });

  it("etiqueta longa é cortada em vez de estourar o layout", () => {
    expect(normalizeTag("a".repeat(80))).toHaveLength(24);
  });

  it("espaço sobrando é limpo", () => {
    expect(normalizeTag("  foto   de  produto ")).toBe("foto de produto");
  });
});

describe("renomear", () => {
  it("guarda o nome novo", () => {
    expect(renameMedia(item({ name: "antigo" }), " novo ").name).toBe("novo");
  });

  it("nome vazio não apaga o que já tinha", () => {
    expect(renameMedia(item({ name: "antigo" }), "").name).toBe("antigo");
  });
});

describe("espaço ocupado", () => {
  it("soma o tamanho de tudo", () => {
    const stats = libraryStats([
      item({ bytes: 100_000 }),
      item({ url: "data:image/png;base64,AAAA" }),
    ]);
    expect(stats.total).toBe(2);
    expect(stats.bytes).toBe(100_003);
  });

  it("conta por tipo", () => {
    expect(libraryStats(ACERVO).porTipo).toEqual({ logo: 1, image: 1, audio: 1 });
  });

  it("aponta os arquivos mais pesados, que é o que dá para resolver", () => {
    const stats = libraryStats([item({ id: "g", name: "Grande", bytes: 900_000 })]);
    expect(stats.pesados[0]).toMatchObject({ id: "g", name: "Grande" });
  });

  it("arquivo leve não entra na lista dos pesados", () => {
    expect(libraryStats([item({ bytes: 1000 })]).pesados).toEqual([]);
  });

  it("avisa quando a biblioteca está pesando no app", () => {
    expect(libraryWarning(libraryStats([item({ bytes: 1000 })]))).toBe("");
    const cheia = libraryStats([item({ bytes: HEAVY_LIBRARY_BYTES + 1 })]);
    expect(libraryWarning(cheia)).toContain("Baixe e apague");
  });

  it("link para o servidor não conta como espaço do espaço de trabalho", () => {
    expect(itemBytes(item({ url: "https://exemplo.com/a.png" }))).toBe(0);
  });

  it("biblioteca vazia não quebra a conta", () => {
    expect(libraryStats([])).toMatchObject({ total: 0, bytes: 0 });
    expect(libraryStats(null).total).toBe(0);
  });
});

describe("guardar e apagar", () => {
  it("item novo entra na frente", () => {
    const r = upsertMedia(ACERVO, item({ id: "novo" }));
    expect(r[0].id).toBe("novo");
    expect(r).toHaveLength(4);
  });

  it("item existente é atualizado no lugar, sem duplicar", () => {
    const r = upsertMedia(ACERVO, { ...ACERVO[0], name: "Logo novo" });
    expect(r).toHaveLength(3);
    expect(r.find((i) => i.id === "a").name).toBe("Logo novo");
  });

  it("item sem id não entra", () => {
    expect(upsertMedia(ACERVO, { name: "sem id" })).toHaveLength(3);
  });

  it("apaga pelo id", () => {
    expect(removeMedia(ACERVO, "b").map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("apagar id que não existe não mexe em nada", () => {
    expect(removeMedia(ACERVO, "zzz")).toHaveLength(3);
  });
});

describe("typeLabel", () => {
  it("dá nome em português ao tipo", () => {
    expect(typeLabel("audio")).toBe("Áudios");
    expect(typeLabel("desconhecido")).toBe("Arquivo");
  });
});
