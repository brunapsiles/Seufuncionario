import { describe, expect, it } from "vitest";
import {
  addDays,
  backlinksFor,
  buildGraph,
  cardStats,
  cardsFromNote,
  dailyTitle,
  daysBetween,
  dueCards,
  duplicateTitles,
  ensureDailyNote,
  exportAll,
  findBlock,
  fromMarkdown,
  localGraph,
  makeCard,
  makeNote,
  normalize,
  orphanNotes,
  parseLinks,
  parseTags,
  resolveTransclusions,
  reviewCard,
  splitBlocks,
  suggestConnections,
  toMarkdown,
  unlinkedMentions,
} from "./features/notes/notesDomain";

const nota = (id, title, content, extra = {}) =>
  makeNote(id, { title, content, ...extra });

describe("normalize", () => {
  it("tira acento e caixa para comparar título", () => {
    expect(normalize("Notação Fiscal")).toBe("notacao fiscal");
    expect(normalize("  PREÇO  ")).toBe("preco");
  });

  it("aguenta valor vazio sem quebrar", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});

describe("datas", () => {
  it("soma dias sem escorregar de mês", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("devolve o valor original quando não é data", () => {
    expect(addDays("qualquer", 3)).toBe("qualquer");
  });

  it("conta a diferença entre duas datas", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(-10);
  });
});

describe("parseLinks", () => {
  it("acha ligações e ignora repetida", () => {
    const r = parseLinks("Falar de [[Cliente Ana]] e de novo [[cliente ana]].");
    expect(r).toHaveLength(1);
    expect(r[0].target).toBe("Cliente Ana");
  });

  it("entende ligação com apelido", () => {
    const r = parseLinks("Ver [[Nota Fiscal|a NF]] hoje.");
    expect(r[0].target).toBe("Nota Fiscal");
    expect(r[0].alias).toBe("a NF");
  });

  it("não inventa ligação em texto sem colchete", () => {
    expect(parseLinks("texto simples sem ligação")).toEqual([]);
  });

  it("ignora colchete vazio", () => {
    expect(parseLinks("um [[]] solto")).toEqual([]);
  });
});

describe("parseTags", () => {
  it("acha etiqueta com acento", () => {
    expect(parseTags("assunto #produção e #vendas")).toEqual(["produção", "vendas"]);
  });

  it("não confunde endereço de bloco dentro de ligação com etiqueta", () => {
    expect(parseTags("ver ![[Nota#^abc]] aqui")).toEqual([]);
  });

  it("não pega # no meio de palavra", () => {
    expect(parseTags("cor#1 não é etiqueta")).toEqual([]);
  });
});

describe("buildGraph", () => {
  it("liga duas notas existentes", () => {
    const notes = [
      nota("a", "Cliente Ana", "Combinado com [[Contrato padrão]]"),
      nota("b", "Contrato padrão", "texto"),
    ];
    const g = buildGraph(notes);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]).toMatchObject({ from: "a", to: "b", missing: false });
  });

  it("ligação para nota inexistente vira nó a criar, não erro", () => {
    const notes = [nota("a", "Cliente Ana", "Ver [[Proposta 2027]]")];
    const g = buildGraph(notes);
    const ausente = g.nodes.find((n) => n.missing);
    expect(ausente.title).toBe("Proposta 2027");
    expect(g.edges[0].missing).toBe(true);
  });

  it("nota que liga para si mesma não vira laço", () => {
    const notes = [nota("a", "Ana", "Falando de [[Ana]] mesmo")];
    expect(buildGraph(notes).edges).toHaveLength(0);
  });

  it("acha o título mesmo com acento e caixa diferentes", () => {
    const notes = [
      nota("a", "X", "ver [[producao mensal]]"),
      nota("b", "Produção Mensal", "y"),
    ];
    expect(buildGraph(notes).edges[0].to).toBe("b");
  });

  it("duas notas ausentes com o mesmo nome viram um nó só", () => {
    const notes = [
      nota("a", "A", "[[Sumida]]"),
      nota("b", "B", "[[sumida]]"),
    ];
    const g = buildGraph(notes);
    expect(g.nodes.filter((n) => n.missing)).toHaveLength(1);
    expect(g.edges).toHaveLength(2);
  });
});

describe("backlinksFor", () => {
  it("mostra quem aponta para a nota, com trecho", () => {
    const notes = [
      nota("a", "Contrato padrão", "corpo"),
      nota("b", "Reunião", "combinamos usar o [[Contrato padrão]] revisado"),
    ];
    const r = backlinksFor("a", notes);
    expect(r).toHaveLength(1);
    expect(r[0].note.id).toBe("b");
    expect(r[0].excerpt).toContain("Contrato padrão");
  });

  it("o trecho mostra a frase, sem a marcação de ligação", () => {
    const notes = [
      nota("a", "Contrato padrão", "corpo"),
      nota("b", "Reunião", "revisamos o [[Contrato padrão|contrato]] com a Ana"),
    ];
    const r = backlinksFor("a", notes);
    expect(r[0].excerpt).not.toContain("[[");
    expect(r[0].excerpt).toContain("contrato");
  });

  it("nota sem ninguém apontando devolve lista vazia", () => {
    expect(backlinksFor("a", [nota("a", "Sozinha", "nada")])).toEqual([]);
  });

  it("id que não existe não quebra", () => {
    expect(backlinksFor("zzz", [nota("a", "A", "x")])).toEqual([]);
  });
});

describe("unlinkedMentions", () => {
  it("acha citação em texto corrido que ainda não virou ligação", () => {
    const notes = [
      nota("a", "Contrato padrão", "corpo"),
      nota("b", "Reunião", "falamos do contrato padrão na segunda"),
    ];
    const r = unlinkedMentions("a", notes);
    expect(r).toHaveLength(1);
    expect(r[0].note.id).toBe("b");
  });

  it("não acusa quem já ligou", () => {
    const notes = [
      nota("a", "Contrato padrão", "corpo"),
      nota("b", "Reunião", "usamos o [[Contrato padrão]]"),
    ];
    expect(unlinkedMentions("a", notes)).toEqual([]);
  });

  it("respeita fronteira de palavra com acento", () => {
    // "produção" não pode casar dentro de "produções" tratado como outra coisa,
    // mas "produção" solto tem de casar mesmo terminando em letra acentuada.
    const notes = [
      nota("a", "Produção", "corpo"),
      nota("b", "Outra", "a produção da semana foi boa"),
    ];
    expect(unlinkedMentions("a", notes)).toHaveLength(1);
  });

  it("não casa pedaço no meio de outra palavra", () => {
    const notes = [
      nota("a", "Ana", "corpo"),
      nota("b", "Outra", "conversamos sobre ananás e banana"),
    ];
    expect(unlinkedMentions("a", notes)).toEqual([]);
  });

  it("ignora título curto demais para evitar ruído", () => {
    const notes = [
      nota("a", "Ok", "corpo"),
      nota("b", "Outra", "ok, combinado"),
    ];
    expect(unlinkedMentions("a", notes)).toEqual([]);
  });
});

describe("localGraph", () => {
  const notes = [
    nota("a", "A", "[[B]]"),
    nota("b", "B", "[[C]]"),
    nota("c", "C", "[[D]]"),
    nota("d", "D", "fim"),
    nota("z", "Z", "isolada"),
  ];

  it("distância 1 traz só os vizinhos diretos", () => {
    const g = localGraph("b", notes, 1);
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("distância 2 alcança mais longe", () => {
    const g = localGraph("a", notes, 2);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("nota isolada mostra só ela", () => {
    expect(localGraph("z", notes, 2).nodes.map((n) => n.id)).toEqual(["z"]);
  });

  it("id inexistente devolve grafo vazio", () => {
    expect(localGraph("nada", notes, 1).nodes).toEqual([]);
  });
});

describe("orphanNotes", () => {
  it("acusa a nota que ninguém cita e que não cita ninguém", () => {
    const notes = [
      nota("a", "A", "[[B]]"),
      nota("b", "B", "corpo"),
      nota("z", "Z", "sozinha de verdade"),
    ];
    expect(orphanNotes(notes).map((n) => n.id)).toEqual(["z"]);
  });
});

describe("blocos", () => {
  const texto = "Primeiro parágrafo. ^intro\n\nSegundo parágrafo sem âncora.\n\nTerceiro. ^fim";

  it("separa parágrafos e lê a âncora", () => {
    const b = splitBlocks(texto);
    expect(b).toHaveLength(3);
    expect(b[0]).toMatchObject({ anchor: "intro", text: "Primeiro parágrafo." });
    expect(b[1].anchor).toBe("");
  });

  it("acha o bloco pela âncora", () => {
    expect(findBlock({ content: texto }, "fim").text).toBe("Terceiro.");
  });

  it("âncora que não existe devolve nulo", () => {
    expect(findBlock({ content: texto }, "nada")).toBeNull();
  });
});

describe("resolveTransclusions", () => {
  it("traz o conteúdo da nota embutida", () => {
    const notes = [nota("b", "Receita", "Bolo de fubá simples")];
    const r = resolveTransclusions("Anotação: ![[Receita]]", notes);
    expect(r.text).toContain("Bolo de fubá simples");
    expect(r.warnings).toEqual([]);
  });

  it("traz só o bloco pedido", () => {
    const notes = [nota("b", "Receita", "Ingredientes aqui. ^ing\n\nModo de fazer. ^modo")];
    const r = resolveTransclusions("![[Receita#^modo]]", notes);
    expect(r.text).toContain("Modo de fazer.");
    expect(r.text).not.toContain("Ingredientes");
  });

  it("ciclo entre duas notas para em vez de travar", () => {
    const notes = [
      nota("a", "A", "começo ![[B]]"),
      nota("b", "B", "volta ![[A]]"),
    ];
    const r = resolveTransclusions("![[A]]", notes);
    expect(r.warnings.some((w) => w.type === "ciclo")).toBe(true);
    expect(r.text).toContain("se embute em si mesma");
  });

  it("nota que embute ela mesma para na hora", () => {
    const notes = [nota("a", "A", "eu sou ![[A]]")];
    const r = resolveTransclusions("![[A]]", notes);
    expect(r.warnings.some((w) => w.type === "ciclo")).toBe(true);
  });

  it("avisa quando a nota embutida não existe", () => {
    const r = resolveTransclusions("![[Fantasma]]", []);
    expect(r.warnings[0].type).toBe("ausente");
    expect(r.text).toContain("ainda não existe");
  });

  it("avisa quando o bloco não existe", () => {
    const notes = [nota("b", "Receita", "só isso")];
    const r = resolveTransclusions("![[Receita#^nada]]", notes);
    expect(r.warnings[0].type).toBe("bloco-ausente");
  });

  it("texto sem embed volta igual", () => {
    expect(resolveTransclusions("texto puro", []).text).toBe("texto puro");
  });
});

describe("nota diária", () => {
  it("monta o título no formato brasileiro", () => {
    expect(dailyTitle("2026-07-30")).toBe("Diário 30/07/2026");
  });

  it("cria a nota do dia quando ainda não existe", () => {
    const r = ensureDailyNote([], "2026-07-30", "b1");
    expect(r.created).toBe(true);
    expect(r.note.kind).toBe("diaria");
    expect(r.note.content).toContain("O foco de hoje");
    expect(r.notes).toHaveLength(1);
  });

  it("não duplica a nota do mesmo dia", () => {
    const primeira = ensureDailyNote([], "2026-07-30");
    const segunda = ensureDailyNote(primeira.notes, "2026-07-30");
    expect(segunda.created).toBe(false);
    expect(segunda.notes).toHaveLength(1);
    expect(segunda.note.id).toBe(primeira.note.id);
  });

  it("data inválida não cria nada", () => {
    expect(ensureDailyNote([], "sem data").created).toBe(false);
  });
});

describe("flashcards", () => {
  it("tira cartão das linhas com ::", () => {
    const n = nota("a", "Fiscal", "- MEI :: microempreendedor individual\ntexto solto\nDAS :: imposto mensal");
    const cards = cardsFromNote(n);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("MEI");
    expect(cards[0].back).toBe("microempreendedor individual");
  });

  it("não repete cartão que já existe da mesma nota", () => {
    const n = nota("a", "Fiscal", "MEI :: microempreendedor individual");
    const existente = makeCard("c1", { front: "MEI", back: "x", noteId: "a" });
    expect(cardsFromNote(n, [existente])).toHaveLength(0);
  });

  it("linha sem resposta é ignorada", () => {
    expect(cardsFromNote(nota("a", "X", "MEI ::"))).toHaveLength(0);
  });
});

describe("reviewCard", () => {
  const base = makeCard("c1", { front: "f", back: "v" });

  it("acerto na primeira volta em 1 dia", () => {
    const r = reviewCard(base, 4, "2026-07-30");
    expect(r.reps).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.due).toBe("2026-07-31");
  });

  it("segundo acerto vai para 6 dias", () => {
    const r = reviewCard(reviewCard(base, 4, "2026-07-30"), 4, "2026-07-31");
    expect(r.interval).toBe(6);
    expect(r.due).toBe("2026-08-06");
  });

  it("erro volta para hoje e conta a falha", () => {
    const acertou = reviewCard(base, 5, "2026-07-30");
    const errou = reviewCard(acertou, 0, "2026-07-31");
    expect(errou.due).toBe("2026-07-31");
    expect(errou.interval).toBe(0);
    expect(errou.reps).toBe(0);
    expect(errou.lapses).toBe(1);
  });

  it("facilidade nunca cai abaixo de 1.3, senão o cartão nunca sai do mesmo dia", () => {
    let c = base;
    for (let i = 0; i < 15; i += 1) c = reviewCard(c, 0, "2026-07-30");
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("intervalo nunca fica negativo nem zero depois de acerto", () => {
    let c = { ...base, ease: 1.3, interval: 0 };
    c = reviewCard(c, 3, "2026-07-30");
    expect(c.interval).toBeGreaterThan(0);
  });

  it("nota fácil abre mais a facilidade que nota apertada", () => {
    const facil = reviewCard(base, 5, "2026-07-30");
    const apertado = reviewCard(base, 3, "2026-07-30");
    expect(facil.ease).toBeGreaterThan(apertado.ease);
  });

  it("nota inválida é tratada como erro, não vira NaN", () => {
    const r = reviewCard(base, "abacaxi", "2026-07-30");
    expect(Number.isFinite(r.ease)).toBe(true);
    expect(r.due).toBe("2026-07-30");
  });
});

describe("dueCards e cardStats", () => {
  const cards = [
    { ...makeCard("c1", {}), due: "" },
    { ...makeCard("c2", {}), due: "2026-07-29", reps: 2 },
    { ...makeCard("c3", {}), due: "2026-08-15", reps: 3 },
    { ...makeCard("c4", {}), due: "2026-07-30", reps: 1, lapses: 4 },
  ];

  it("cartão novo e vencido entram na fila de hoje", () => {
    expect(dueCards(cards, "2026-07-30").map((c) => c.id)).toEqual(["c1", "c2", "c4"]);
  });

  it("resume o baralho", () => {
    const s = cardStats(cards, "2026-07-30");
    expect(s).toMatchObject({ total: 4, novos: 1, paraHoje: 3, dificeis: 1 });
  });
});

describe("suggestConnections", () => {
  it("sugere nota que divide termo raro", () => {
    const notes = [
      nota("a", "Orçamento padaria", "proposta de fornecimento de brigadeiro gourmet"),
      nota("b", "Cliente novo", "pediu brigadeiro gourmet para o casamento"),
      nota("c", "Sem relação", "trocar a lâmpada da sala"),
    ];
    const r = suggestConnections("a", notes);
    expect(r[0].note.id).toBe("b");
    expect(r.map((x) => x.note.id)).not.toContain("c");
  });

  it("não sugere nota que já está ligada", () => {
    const notes = [
      nota("a", "A", "brigadeiro gourmet e [[B]]"),
      nota("b", "B", "brigadeiro gourmet também"),
    ];
    expect(suggestConnections("a", notes)).toEqual([]);
  });

  it("não sugere nota que já aponta para esta, que já aparece em 'citada em'", () => {
    const notes = [
      nota("a", "A", "brigadeiro gourmet casamento"),
      nota("b", "B", "brigadeiro gourmet casamento e [[A]]"),
    ];
    expect(suggestConnections("a", notes)).toEqual([]);
  });

  it("palavra comum demais não conecta nada", () => {
    const notes = [
      nota("a", "A", "sobre para com isso"),
      nota("b", "B", "sobre para com isso"),
    ];
    expect(suggestConnections("a", notes)).toEqual([]);
  });
});

describe("markdown", () => {
  it("exporta com cabeçalho legível", () => {
    const n = nota("a", "Minha nota", "corpo aqui", {
      date: "2026-07-30",
      tags: ["fiscal"],
    });
    const md = toMarkdown(n);
    expect(md).toContain("titulo: Minha nota");
    expect(md).toContain("etiquetas: fiscal");
    expect(md).toContain("# Minha nota");
  });

  it("gera nome de arquivo seguro", () => {
    const arquivos = exportAll([nota("a", "Contrato: v1/final", "x")]);
    expect(arquivos[0].filename).not.toMatch(/[/:]/);
    expect(arquivos[0].filename.endsWith(".md")).toBe(true);
  });

  it("importa de volta o que exportou", () => {
    const original = nota("a", "Minha nota", "corpo aqui", {
      date: "2026-07-30",
      tags: ["fiscal", "urgente"],
    });
    const volta = fromMarkdown(toMarkdown(original), "b");
    expect(volta.title).toBe("Minha nota");
    expect(volta.date).toBe("2026-07-30");
    expect(volta.tags).toEqual(["fiscal", "urgente"]);
    expect(volta.content).toContain("corpo aqui");
  });

  it("markdown sem cabeçalho aproveita o primeiro título", () => {
    const n = fromMarkdown("# Título solto\n\ntexto", "b");
    expect(n.title).toBe("Título solto");
    expect(n.content).toBe("texto");
  });

  it("markdown sem nada vira nota sem título, não quebra", () => {
    expect(fromMarkdown("", "b").title).toBe("Sem título");
  });
});

describe("duplicateTitles", () => {
  it("acusa dois títulos iguais, que fazem a ligação ficar ambígua", () => {
    const notes = [
      nota("a", "Contrato", "x"),
      nota("b", "contrato", "y"),
      nota("c", "Outro", "z"),
    ];
    const r = duplicateTitles(notes);
    expect(r).toHaveLength(1);
    expect(r[0].notes.map((n) => n.id)).toEqual(["a", "b"]);
  });
});
