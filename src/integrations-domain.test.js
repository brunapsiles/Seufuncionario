import { describe, expect, it } from "vitest";
import {
  CONNECTIONS,
  IMPORTS,
  appointmentsToEvents,
  buildFullExport,
  buildIcs,
  buildImport,
  connectionsByState,
  dedupe,
  detectDelimiter,
  exportableCollections,
  guessMapping,
  importById,
  looksLikeValidHook,
  parseCsv,
  parseDate,
  parseNumber,
  toCsv,
  withBom,
} from "./features/integrations/integrationsDomain";

describe("leitura de CSV", () => {
  it("descobre o separador da planilha brasileira", () => {
    expect(detectDelimiter("nome;telefone;email")).toBe(";");
  });

  it("descobre o separador da planilha em inglês", () => {
    expect(detectDelimiter("name,phone,email")).toBe(",");
  });

  it("uma coluna só não quebra a detecção", () => {
    expect(detectDelimiter("nome")).toBe(";");
  });

  it("lê cabeçalho e linhas", () => {
    const r = parseCsv("nome;telefone\nAna;11999\nBia;11888");
    expect(r.header).toEqual(["nome", "telefone"]);
    expect(r.rows).toEqual([
      { nome: "Ana", telefone: "11999" },
      { nome: "Bia", telefone: "11888" },
    ]);
  });

  it("respeita vírgula dentro de aspas", () => {
    // Sem isso, "Bolo, 2 andares" vira duas colunas e a linha sai torta.
    const r = parseCsv('produto,preco\n"Bolo, 2 andares",140');
    expect(r.rows[0]).toEqual({ produto: "Bolo, 2 andares", preco: "140" });
  });

  it("entende aspas duplas escapadas", () => {
    const r = parseCsv('nome\n"Ana ""A"""');
    expect(r.rows[0].nome).toBe('Ana "A"');
  });

  it("aceita quebra de linha do Windows", () => {
    expect(parseCsv("a;b\r\n1;2").rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("ignora o BOM que o Excel coloca na frente", () => {
    expect(parseCsv("\uFEFFnome;idade\nAna;30").header).toEqual([
      "nome",
      "idade",
    ]);
  });

  it("descarta linha totalmente vazia", () => {
    expect(parseCsv("a;b\n1;2\n\n;\n3;4").rows).toHaveLength(2);
  });

  it("arquivo vazio não quebra", () => {
    expect(parseCsv("")).toEqual({ header: [], rows: [] });
    expect(parseCsv(null)).toEqual({ header: [], rows: [] });
  });
});

describe("escrita de CSV", () => {
  it("protege separador, aspas e quebra de linha", () => {
    expect(
      toCsv([{ a: 'diz "oi"', b: "x;y", c: "linha\nnova" }]),
    ).toBe('a;b;c\n"diz ""oi""";"x;y";"linha\nnova"');
  });

  it("lista vazia vira texto vazio", () => {
    expect(toCsv([])).toBe("");
  });

  it("o BOM faz o Excel em português abrir com acento certo", () => {
    expect(withBom("nome\nServiço")).toMatch(/^\uFEFF/);
  });

  it("ida e volta preserva o conteúdo", () => {
    const original = [{ nome: 'Ana "A"', obs: "a;b" }];
    expect(parseCsv(toCsv(original)).rows).toEqual(original);
  });
});

describe("adivinhar as colunas", () => {
  it("acerta pelos apelidos mais comuns", () => {
    expect(guessMapping(["Nome", "Celular", "E-mail"], "contatos")).toEqual({
      name: "Nome",
      phone: "Celular",
      email: "E-mail",
    });
  });

  it("ignora acento e maiúscula", () => {
    expect(guessMapping(["OBSERVAÇÃO"], "contatos")).toEqual({
      notes: "OBSERVAÇÃO",
    });
  });

  it("não usa a mesma coluna para dois campos", () => {
    const mapa = guessMapping(["valor"], "produtos");
    expect(Object.values(mapa).filter((v) => v === "valor")).toHaveLength(1);
  });

  it("planilha sem nenhuma coluna reconhecível devolve mapa vazio", () => {
    expect(guessMapping(["col1", "col2"], "contatos")).toEqual({});
  });

  it("modelo desconhecido cai no primeiro", () => {
    expect(importById("nao-existe")).toBe(IMPORTS[0]);
  });
});

describe("número e data da planilha", () => {
  it("lê valor brasileiro", () => {
    expect(parseNumber("R$ 1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseNumber("0,50")).toBeCloseTo(0.5, 2);
  });

  it("lê valor em inglês", () => {
    expect(parseNumber("1,234.56")).toBeCloseTo(1234.56, 2);
    expect(parseNumber("99.90")).toBeCloseTo(99.9, 2);
  });

  it("texto sem número vira zero em vez de NaN na tela", () => {
    expect(parseNumber("grátis")).toBe(0);
    expect(parseNumber("")).toBe(0);
    expect(parseNumber(null)).toBe(0);
  });

  it("lê data brasileira", () => {
    expect(parseDate("31/12/2026")).toBe("2026-12-31");
    expect(parseDate("3/4/26")).toBe("2026-04-03");
  });

  it("lê data ISO", () => {
    expect(parseDate("2026-7-5")).toBe("2026-07-05");
  });

  it("data que não dá para entender fica vazia, e não vira data errada", () => {
    expect(parseDate("semana que vem")).toBe("");
    expect(parseDate("")).toBe("");
  });
});

describe("buildImport", () => {
  const linhas = [
    { Nome: "Ana", Celular: "11999" },
    { Nome: "", Celular: "11888" },
    { Nome: "Bia", Celular: "" },
  ];

  it("converte o que dá e recusa o que falta, dizendo a linha", () => {
    const r = buildImport(linhas, { name: "Nome", phone: "Celular" }, "contatos");
    expect(r.prontos).toEqual([
      { name: "Ana", phone: "11999", email: "", notes: "" },
      { name: "Bia", phone: "", email: "", notes: "" },
    ]);
    // Linha 2 do arquivo é a 3ª linha contando o cabeçalho.
    expect(r.recusados).toEqual([{ linha: 3, motivo: "sem Nome" }]);
  });

  it("converte número e data conforme o campo", () => {
    const r = buildImport(
      [{ Descrição: "Bolo", Valor: "R$ 140,00", Data: "05/07/2026" }],
      { description: "Descrição", amount: "Valor", date: "Data" },
      "lancamentos",
    );
    expect(r.prontos[0]).toMatchObject({
      description: "Bolo",
      amount: 140,
      date: "2026-07-05",
    });
  });

  it("planilha vazia não gera nada nem quebra", () => {
    expect(buildImport([], {}, "contatos").prontos).toEqual([]);
  });

  it("coluna não apontada vira campo vazio, não some", () => {
    const r = buildImport([{ Nome: "Ana" }], { name: "Nome" }, "contatos");
    expect(r.prontos[0]).toHaveProperty("email", "");
  });
});

describe("dedupe", () => {
  it("não importa de novo quem já está cadastrado", () => {
    const r = dedupe([{ name: "Ana" }, { name: "Bia" }], [{ name: "ana" }]);
    expect(r.entram.map((x) => x.name)).toEqual(["Bia"]);
    expect(r.repetidos).toHaveLength(1);
  });

  it("nem duas vezes dentro do mesmo arquivo", () => {
    const r = dedupe([{ name: "Ana" }, { name: "ANA" }], []);
    expect(r.entram).toHaveLength(1);
  });

  it("ignora acento na comparação", () => {
    const r = dedupe([{ name: "José" }], [{ name: "Jose" }]);
    expect(r.entram).toHaveLength(0);
  });

  it("item sem nome passa, em vez de sumir", () => {
    expect(dedupe([{ name: "" }], []).entram).toHaveLength(1);
  });
});

describe("agenda em .ics", () => {
  const evento = {
    id: "a1",
    titulo: "Entrega do bolo",
    inicio: "2026-07-05T14:00:00.000Z",
    fim: "2026-07-05T15:00:00.000Z",
    local: "Rua A, 10",
  };

  it("gera um calendário que os aplicativos leem", () => {
    const { conteudo, incluidos } = buildIcs([evento]);
    expect(conteudo).toContain("BEGIN:VCALENDAR");
    expect(conteudo).toContain("BEGIN:VEVENT");
    expect(conteudo).toContain("SUMMARY:Entrega do bolo");
    expect(conteudo).toContain("DTSTART:20260705T140000Z");
    expect(conteudo).toContain("END:VCALENDAR");
    expect(incluidos).toBe(1);
  });

  it("usa quebra de linha CRLF, senão parte dos calendários recusa o arquivo", () => {
    expect(buildIcs([evento]).conteudo).toContain("\r\n");
    expect(buildIcs([evento]).conteudo.endsWith("\r\n")).toBe(true);
  });

  it("escapa vírgula e ponto e vírgula, que separam campos no formato", () => {
    const { conteudo } = buildIcs([{ ...evento, local: "Rua A, 10; fundos" }]);
    expect(conteudo).toContain("LOCATION:Rua A\\, 10\\; fundos");
  });

  it("sem hora de fim, o compromisso dura uma hora", () => {
    const { conteudo } = buildIcs([{ ...evento, fim: undefined }]);
    expect(conteudo).toContain("DTEND:20260705T150000Z");
  });

  it("evento sem data é pulado em vez de gerar arquivo inválido", () => {
    const { incluidos, conteudo } = buildIcs([{ titulo: "sem data" }]);
    expect(incluidos).toBe(0);
    expect(conteudo).not.toContain("BEGIN:VEVENT");
  });

  it("data impossível também é pulada", () => {
    expect(buildIcs([{ titulo: "x", inicio: "não é data" }]).incluidos).toBe(0);
  });

  it("agenda vazia gera calendário vazio, e não erro", () => {
    expect(buildIcs([]).conteudo).toContain("END:VCALENDAR");
  });

  it("traduz os agendamentos do app para eventos", () => {
    const r = appointmentsToEvents([
      { id: "x", service: "Corte", client: "Ana", date: "2026-07-05T10:00:00Z" },
    ]);
    expect(r[0]).toMatchObject({ titulo: "Corte — Ana", inicio: "2026-07-05T10:00:00Z" });
  });

  it("agendamento sem cliente não vira título com traço solto", () => {
    expect(appointmentsToEvents([{ title: "Reunião" }])[0].titulo).toBe("Reunião");
  });
});

describe("levar tudo embora", () => {
  const db = {
    user: { id: "u1" },
    contacts: [{ id: "c1", name: "Ana", businessId: "b1" }],
    tasks: [],
    products: [{ id: "p1", businessId: "b2" }],
    preferences: { theme: "light" },
  };

  it("lista só as coleções que têm alguma coisa", () => {
    expect(exportableCollections(db).map((c) => c.chave)).toEqual([
      "contacts",
      "products",
    ]);
  });

  it("não exporta dados de sessão nem da conta", () => {
    expect(exportableCollections(db).map((c) => c.chave)).not.toContain("user");
  });

  it("exporta só o negócio aberto", () => {
    const saida = buildFullExport(db, { id: "b1", name: "Doces da Ana" });
    expect(saida.dados.contacts).toHaveLength(1);
    expect(saida.dados.products).toHaveLength(0);
    expect(saida.negocio).toBe("Doces da Ana");
  });

  it("sem negócio escolhido, leva tudo", () => {
    expect(buildFullExport(db, null).dados.products).toHaveLength(1);
  });

  it("espaço vazio não quebra a exportação", () => {
    expect(buildFullExport({}, null).dados).toEqual({});
  });
});

describe("checagem do endereço no navegador", () => {
  it("aceita endereço público", () => {
    expect(looksLikeValidHook("https://hooks.zapier.com/x").ok).toBe(true);
  });

  it("recusa http e endereço interno na hora, sem ida ao servidor", () => {
    for (const alvo of [
      "http://exemplo.com/x",
      "https://localhost/x",
      "https://192.168.0.1/x",
      "https://10.0.0.1/x",
      "https://api.internal/x",
      "https://user:pass@exemplo.com/x",
    ])
      expect({ alvo, ok: looksLikeValidHook(alvo).ok }).toEqual({ alvo, ok: false });
  });

  it("endereço vazio ou sem sentido não quebra", () => {
    expect(looksLikeValidHook("").ok).toBe(false);
    expect(looksLikeValidHook("qualquer coisa").ok).toBe(false);
  });
});

describe("catálogo de conexões", () => {
  it("separa o que funciona agora do que depende da titular", () => {
    expect(connectionsByState("pronto").length).toBeGreaterThan(0);
    expect(connectionsByState("depende").length).toBeGreaterThan(0);
  });

  it("toda conexão diz o estado e como se usa", () => {
    for (const c of CONNECTIONS) {
      expect(["pronto", "depende"]).toContain(c.estado);
      expect(c.como.length).toBeGreaterThan(20);
    }
  });

  it("o envio automático saiu de pendente quando passou a existir de verdade", () => {
    // Ele era "depende" enquanto faltava o lado do servidor. Agora existe
    // (worker/services/webhooks.js) e a tela pode oferecê-lo.
    expect(CONNECTIONS.find((c) => c.id === "webhook").estado).toBe("pronto");
  });

  it("o que continua dependendo da titular segue marcado como pendente", () => {
    // Anunciar integração que não liga é pior do que não ter. A cobrança
    // depende de um provedor de pagamento na conta dela — não de código.
    expect(CONNECTIONS.find((c) => c.id === "pagamento").estado).toBe("depende");
  });
});
