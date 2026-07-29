import { describe, expect, it } from "vitest";
import {
  MEMORY_SCOPES,
  addDays,
  detectSensitive,
  exportMemories,
  findConflicts,
  isStale,
  makeMemory,
  memoriesToContext,
  relevantMemories,
  similarity,
  staleMemories,
  suggestMemories,
} from "./features/knowledge/memoryDomain.js";
import {
  SEARCHABLE_SOURCES,
  buildAnswerPrompt,
  buildIndex,
  expandWithSynonyms,
  findDuplicates,
  makeGlossaryEntry,
  normalizeToken,
  scoreDocuments,
  searchWorkspace,
  snippetFor,
  staleContent,
  stem,
  tokenize,
} from "./features/knowledge/searchDomain.js";

const HOJE = "2026-07-29";

// ===================== MEMÓRIA =====================

describe("detectSensitive", () => {
  it("acha CPF, CNPJ, cartão e senha", () => {
    expect(detectSensitive("o CPF dele é 123.456.789-00").map((s) => s.id)).toContain("cpf");
    expect(detectSensitive("CNPJ 12.345.678/0001-99").map((s) => s.id)).toContain("cnpj");
    expect(detectSensitive("cartão 4111 1111 1111 1111").map((s) => s.id)).toContain("cartao");
    expect(detectSensitive("a senha do sistema é abc").map((s) => s.id)).toContain("senha");
  });

  it("texto comum não é sensível", () => {
    expect(detectSensitive("atendemos de segunda a sexta")).toEqual([]);
  });
});

describe("makeMemory", () => {
  it("nasce aprovada quando não há dado sensível", () => {
    const m = makeMemory("m1", { text: "Preferimos entregar de manhã", createdAt: `${HOJE}T10:00:00Z` });
    expect(m.approved).toBe(true);
    expect(m.scope).toBe("empresa");
  });

  it("nasce PENDENTE de aprovação quando há dado sensível", () => {
    const m = makeMemory("m2", { text: "CPF do cliente: 123.456.789-00" });
    expect(m.approved).toBe(false);
  });

  it("calcula a data de revisão a partir do prazo", () => {
    const m = makeMemory("m3", {
      text: "Trabalhamos com fornecedor local",
      createdAt: `${HOJE}T10:00:00Z`,
      reviewEveryDays: 30,
    });
    expect(m.reviewAt).toBe(addDays(HOJE, 30));
  });

  it("sem prazo de revisão, não tem data", () => {
    expect(makeMemory("m4", { text: "algo", reviewEveryDays: 0 }).reviewAt).toBe("");
  });

  it("os escopos previstos existem", () => {
    expect(MEMORY_SCOPES.map((s) => s.id)).toEqual([
      "pessoal",
      "empresa",
      "projeto",
      "cliente",
      "especialista",
    ]);
  });
});

describe("isStale e staleMemories", () => {
  it("acusa memória passada da revisão", () => {
    const velha = { reviewAt: "2026-01-01" };
    expect(isStale(velha, HOJE)).toBe(true);
    expect(isStale({ reviewAt: "2027-01-01" }, HOJE)).toBe(false);
    expect(isStale({ reviewAt: "" }, HOJE)).toBe(false);
  });

  it("lista só as vencidas", () => {
    const lista = [{ id: "a", reviewAt: "2026-01-01" }, { id: "b", reviewAt: "2027-01-01" }];
    expect(staleMemories(lista, HOJE).map((m) => m.id)).toEqual(["a"]);
  });
});

describe("similarity", () => {
  it("frases iguais dão 1", () => {
    expect(similarity("entregamos de manhã", "entregamos de manhã")).toBe(1);
  });

  it("frases sem relação dão 0", () => {
    expect(similarity("entregamos de manhã", "cor do logotipo azul")).toBe(0);
  });

  it("texto vazio dá 0", () => {
    expect(similarity("", "qualquer coisa")).toBe(0);
  });
});

describe("findConflicts", () => {
  it("acusa contradição quando uma frase nega a outra", () => {
    const conflitos = findConflicts([
      makeMemory("a", { text: "Atendemos aos sábados pela manhã" }),
      makeMemory("b", { text: "Não atendemos aos sábados pela manhã" }),
    ]);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].kind).toBe("contradicao");
  });

  it("acusa duplicada quando dizem a mesma coisa", () => {
    const conflitos = findConflicts([
      makeMemory("a", { text: "Preferimos entregar pela manhã sempre" }),
      makeMemory("b", { text: "Preferimos entregar pela manhã sempre" }),
    ]);
    expect(conflitos[0].kind).toBe("duplicada");
  });

  it("não compara memórias de escopos diferentes", () => {
    const conflitos = findConflicts([
      makeMemory("a", { text: "Atendemos aos sábados", scope: "empresa" }),
      makeMemory("b", { text: "Não atendemos aos sábados", scope: "pessoal" }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("não compara clientes diferentes", () => {
    const conflitos = findConflicts([
      makeMemory("a", { text: "Cobra antecipado sempre", scope: "cliente", scopeRef: "X" }),
      makeMemory("b", { text: "Não cobra antecipado sempre", scope: "cliente", scopeRef: "Y" }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("assuntos distintos não geram conflito", () => {
    expect(
      findConflicts([
        makeMemory("a", { text: "Entregamos pela manhã" }),
        makeMemory("b", { text: "O logotipo é azul" }),
      ]),
    ).toEqual([]);
  });
});

describe("relevantMemories", () => {
  const memorias = [
    makeMemory("obrig", { text: "Somos MEI e emitimos nota pelo portal", required: true }),
    makeMemory("entrega", { text: "Entregamos bolos somente pela manhã" }),
    makeMemory("logo", { text: "A cor do logotipo é azul escuro" }),
    makeMemory("proj", { text: "Neste projeto o prazo é curto", scope: "projeto", scopeRef: "P1" }),
    makeMemory("sensivel", { text: "CPF do cliente 123.456.789-00" }),
  ];

  it("traz a obrigatória sempre, mesmo sem relação com a pergunta", () => {
    const r = relevantMemories(memorias, "qual a cor do logo?").map((m) => m.id);
    expect(r).toContain("obrig");
    expect(r).toContain("logo");
  });

  it("não traz memória de projeto fora do projeto", () => {
    expect(relevantMemories(memorias, "prazo do projeto").map((m) => m.id)).not.toContain("proj");
    expect(
      relevantMemories(memorias, "prazo do projeto", {
        scopeRefs: { projeto: "P1" },
      }).map((m) => m.id),
    ).toContain("proj");
  });

  it("nunca traz memória não aprovada", () => {
    expect(relevantMemories(memorias, "CPF do cliente").map((m) => m.id)).not.toContain(
      "sensivel",
    );
  });

  it("respeita o limite", () => {
    expect(relevantMemories(memorias, "entrega bolo manhã", { limit: 2 })).toHaveLength(2);
  });
});

describe("memoriesToContext", () => {
  it("monta o bloco com escopo e instrução de não repetir", () => {
    const ctx = memoriesToContext([
      makeMemory("a", { text: "Entregamos pela manhã" }),
      makeMemory("b", { text: "Prazo curto", scope: "projeto", scopeRef: "P1" }),
    ]);
    expect(ctx).toContain("Entregamos pela manhã");
    expect(ctx).toContain("De um projeto: P1");
    expect(ctx).toContain("Não repita esta lista");
  });

  it("é vazio sem memória, para não injetar ruído", () => {
    expect(memoriesToContext([])).toBe("");
  });
});

describe("exportMemories", () => {
  it("exporta JSON legível com total e campos em português", () => {
    const json = JSON.parse(exportMemories([makeMemory("a", { text: "Algo relevante aqui" })]));
    expect(json.total).toBe(1);
    expect(json.memorias[0].texto).toBe("Algo relevante aqui");
    expect(json.memorias[0].escopo).toBe("empresa");
  });
});

describe("suggestMemories", () => {
  it("sugere frases de preferência e de fato do negócio", () => {
    const sugestoes = suggestMemories(
      "Oi, tudo bem? Sempre entregamos os bolos pela manhã. Gostei muito. Não atendemos aos domingos por questão de família.",
    );
    const textos = sugestoes.map((s) => s.text);
    expect(textos.some((t) => t.includes("Sempre entregamos"))).toBe(true);
    expect(textos.some((t) => t.includes("Não atendemos aos domingos"))).toBe(true);
    expect(textos.some((t) => t.includes("Gostei muito"))).toBe(false);
  });

  it("marca a sugestão que contém dado sensível", () => {
    const sugestoes = suggestMemories(
      "Sempre cobramos no CNPJ 12.345.678/0001-99 para esse cliente.",
    );
    expect(sugestoes[0].sensitive.length).toBeGreaterThan(0);
  });

  it("não sugere duas frases que dizem a mesma coisa", () => {
    const sugestoes = suggestMemories(
      "Sempre entregamos os bolos pela manhã. Sempre entregamos os bolos pela manhã mesmo.",
    );
    expect(sugestoes).toHaveLength(1);
  });

  it("conversa sem nada memorável não gera sugestão", () => {
    expect(suggestMemories("oi. tudo bem? obrigado.")).toEqual([]);
  });
});

// ===================== BUSCA =====================

describe("normalizeToken e stem", () => {
  it("tira acento e pontuação", () => {
    expect(normalizeToken("Pagamentô,")).toBe("pagamento");
  });

  it("junta singular e plural no mesmo radical", () => {
    expect(stem("clientes")).toBe(stem("cliente"));
    expect(stem("pagamentos")).toBe(stem("pagamento"));
  });

  it("não destrói palavra curta", () => {
    expect(stem("nf")).toBe("nf");
    expect(stem("das")).toBe("das");
  });
});

describe("tokenize", () => {
  it("descarta palavras comuns sem significado", () => {
    expect(tokenize("o pagamento para o cliente")).not.toContain("para");
  });

  it("mantém os termos relevantes", () => {
    const t = tokenize("Pagamento do cliente atrasado");
    expect(t).toContain(stem("pagamento"));
    expect(t).toContain(stem("cliente"));
  });
});

describe("expandWithSynonyms", () => {
  const glossario = [
    makeGlossaryEntry("g1", { term: "nota fiscal", synonyms: ["NF", "nfe"] }),
  ];

  it("uma sigla puxa o termo completo", () => {
    const expandido = expandWithSynonyms(tokenize("emitir NF"), glossario);
    expect(expandido).toContain(stem("nota"));
    expect(expandido).toContain(stem("fiscal"));
  });

  it("sem glossário, nada muda", () => {
    const tokens = tokenize("emitir NF");
    expect(expandWithSynonyms(tokens, [])).toEqual(tokens);
  });
});

const dbExemplo = () => ({
  tasks: [
    { id: "t1", title: "Emitir nota fiscal do cliente", notes: "urgente", businessId: "b1" },
    { id: "t2", title: "Comprar embalagens", notes: "", businessId: "b1" },
    {
      id: "t3",
      title: "Segredo pessoal",
      notes: "",
      businessId: "b1",
      visibility: "privado",
      ownerId: "outra-pessoa",
    },
  ],
  documents: [
    {
      id: "d1",
      title: "Contrato padrão",
      content: "O pagamento do cliente ocorre em 30 dias após a nota fiscal.",
      businessId: "b1",
      updatedAt: "2025-01-10T10:00:00Z",
    },
  ],
  bills: [
    { id: "c1", description: "Aluguel da loja", contactName: "Imobiliária", businessId: "b1" },
  ],
});

describe("buildIndex", () => {
  it("indexa as fontes conhecidas com título e corpo", () => {
    const docs = buildIndex(dbExemplo(), { businessId: "b1", userId: "eu" });
    expect(docs.some((d) => d.sourceId === "tasks")).toBe(true);
    expect(docs.some((d) => d.sourceId === "documents")).toBe(true);
    expect(docs.find((d) => d.itemId === "d1").sourceLabel).toBe("Documentos");
  });

  it("respeita visibilidade: privado de outra pessoa não entra", () => {
    const docs = buildIndex(dbExemplo(), { businessId: "b1", userId: "eu" });
    expect(docs.some((d) => d.itemId === "t3")).toBe(false);
  });

  it("respeita o negócio ativo", () => {
    const db = dbExemplo();
    db.tasks.push({ id: "outro", title: "De outro negócio", businessId: "b2" });
    const docs = buildIndex(db, { businessId: "b1" });
    expect(docs.some((d) => d.itemId === "outro")).toBe(false);
  });

  it("todas as fontes declaradas têm campo de título", () => {
    for (const f of SEARCHABLE_SOURCES) expect(f.titleField).toBeTruthy();
  });

  it("workspace vazio não quebra", () => {
    expect(buildIndex({}, {})).toEqual([]);
  });
});

describe("scoreDocuments e searchWorkspace", () => {
  it("acha pelo significado do termo e cita a fonte", () => {
    const { results } = searchWorkspace(dbExemplo(), "nota fiscal", {
      businessId: "b1",
      userId: "eu",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sourceLabel).toBeTruthy();
    expect(results.some((r) => r.itemId === "t1")).toBe(true);
  });

  it("o título pesa mais que o corpo", () => {
    const { results } = searchWorkspace(dbExemplo(), "nota fiscal", {
      businessId: "b1",
      userId: "eu",
    });
    // t1 tem "nota fiscal" no título; d1 só no corpo.
    const posT1 = results.findIndex((r) => r.itemId === "t1");
    const posD1 = results.findIndex((r) => r.itemId === "d1");
    expect(posT1).toBeLessThan(posD1);
  });

  it("plural acha singular", () => {
    const { results } = searchWorkspace(dbExemplo(), "clientes", {
      businessId: "b1",
      userId: "eu",
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("sigla acha o termo completo pelo glossário", () => {
    const { results } = searchWorkspace(dbExemplo(), "NF", {
      businessId: "b1",
      userId: "eu",
      glossary: [makeGlossaryEntry("g1", { term: "nota fiscal", synonyms: ["NF"] })],
    });
    expect(results.some((r) => r.itemId === "t1")).toBe(true);
  });

  it("dá para filtrar por fonte", () => {
    const { results } = searchWorkspace(dbExemplo(), "nota fiscal", {
      businessId: "b1",
      userId: "eu",
      sources: ["documents"],
    });
    expect(results.every((r) => r.sourceId === "documents")).toBe(true);
  });

  it("consulta vazia ou só com palavras comuns não devolve nada", () => {
    expect(searchWorkspace(dbExemplo(), "", {}).results).toEqual([]);
    expect(searchWorkspace(dbExemplo(), "para o com", {}).results).toEqual([]);
  });

  it("termo inexistente devolve lista vazia, não erro", () => {
    expect(searchWorkspace(dbExemplo(), "girafa astronauta", {}).results).toEqual([]);
  });
});

describe("snippetFor", () => {
  it("marca a palavra encontrada e dá contexto", () => {
    const trecho = snippetFor(
      "O pagamento do cliente ocorre em 30 dias após a nota fiscal.",
      tokenize("pagamento"),
    );
    expect(trecho).toContain("«pagamento»");
  });

  it("sem correspondência, devolve o começo do texto", () => {
    const trecho = snippetFor("Texto qualquer aqui", tokenize("girafa"));
    expect(trecho).toContain("Texto qualquer");
  });

  it("texto vazio devolve vazio", () => {
    expect(snippetFor("", tokenize("x"))).toBe("");
  });
});

describe("findDuplicates", () => {
  it("acha itens da mesma fonte com título praticamente igual", () => {
    const db = dbExemplo();
    db.tasks.push({ id: "t4", title: "Emitir nota fiscal do cliente", businessId: "b1" });
    const dups = findDuplicates(db, { businessId: "b1" });
    expect(dups.length).toBeGreaterThan(0);
    expect(dups[0].similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("títulos diferentes não são duplicados", () => {
    expect(findDuplicates(dbExemplo(), { businessId: "b1" })).toEqual([]);
  });
});

describe("staleContent", () => {
  it("aponta o que não é mexido há muito tempo", () => {
    const velhos = staleContent(dbExemplo(), HOJE, { businessId: "b1", days: 180 });
    expect(velhos.some((v) => v.itemId === "d1")).toBe(true);
  });

  it("com janela larga, nada é velho", () => {
    expect(staleContent(dbExemplo(), HOJE, { businessId: "b1", days: 3650 })).toEqual([]);
  });
});

describe("buildAnswerPrompt", () => {
  it("numera as fontes e proíbe inventar", () => {
    const { results } = searchWorkspace(dbExemplo(), "nota fiscal", {
      businessId: "b1",
      userId: "eu",
    });
    const prompt = buildAnswerPrompt("quando o cliente paga?", results);
    expect(prompt).toContain("[1]");
    expect(prompt).toContain("Não encontrei essa informação no seu workspace.");
    expect(prompt).toContain("SOMENTE os trechos");
  });

  it("sem resultados, avisa que não há trecho", () => {
    expect(buildAnswerPrompt("qualquer", [])).toContain("nenhum trecho encontrado");
  });
});
