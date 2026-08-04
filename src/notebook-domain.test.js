import { describe, expect, it } from "vitest";
import {
  COMMANDS,
  RECIPES,
  SOURCES,
  formatCell,
  loadSource,
  makeCell,
  makeNotebook,
  moveCell,
  parsePipeline,
  removeCell,
  runPipeline,
  sourceById,
  suggestChart,
  toCsv,
  updateCell,
} from "./features/notebook/notebookDomain";

const rodar = (dados, consulta, opcoes = {}) => {
  const { passos, erros } = parsePipeline(consulta);
  expect(erros).toEqual([]);
  return runPipeline(dados, passos, { sourceId: "transacoes", ...opcoes });
};

const LANCAMENTOS = [
  { tipo: "receita", valor: 100, categoria: "bolo", data: "2026-06-10" },
  { tipo: "receita", valor: 250, categoria: "bolo", data: "2026-07-05" },
  { tipo: "receita", valor: 50, categoria: "doce", data: "2026-07-20" },
  { tipo: "despesa", valor: 80, categoria: "insumo", data: "2026-07-12" },
];

describe("fontes de dados", () => {
  it("lê da coleção que já existe no espaço de trabalho", () => {
    const db = {
      transactions: [
        { type: "income", amount: 120, category: "bolo", date: "2026-07-01" },
      ],
    };
    expect(loadSource(db, "transacoes")).toEqual([
      {
        tipo: "receita",
        valor: 120,
        categoria: "bolo",
        descricao: "",
        data: "2026-07-01",
      },
    ]);
  });

  it("respeita o negócio aberto", () => {
    const db = {
      transactions: [
        { type: "income", amount: 1, businessId: "b1" },
        { type: "income", amount: 2, businessId: "b2" },
      ],
    };
    expect(loadSource(db, "transacoes", "b1")).toHaveLength(1);
  });

  it("coleção vazia não quebra", () => {
    expect(loadSource({}, "transacoes")).toEqual([]);
    expect(loadSource(null, "transacoes")).toEqual([]);
  });

  it("o campo de data de cada fonte existe DEPOIS do mapeamento", () => {
    // Apontar para o nome da coleção crua ("date") em vez do nome traduzido
    // ("data") faz "periodo" e "agrupar mes" devolverem zero sem erro nenhum:
    // a pessoa acha que não tem dado. Já aconteceu uma vez.
    for (const fonte of SOURCES) {
      const linha = fonte.map({});
      expect({ fonte: fonte.id, temCampoDeData: fonte.dateField in linha }).toEqual({
        fonte: fonte.id,
        temCampoDeData: true,
      });
    }
  });

  it("os campos anunciados são os que a fonte realmente devolve", () => {
    for (const fonte of SOURCES) {
      expect({ fonte: fonte.id, campos: [...fonte.fields].sort() }).toEqual({
        fonte: fonte.id,
        campos: Object.keys(fonte.map({})).sort(),
      });
    }
  });

  it("fonte desconhecida cai na primeira em vez de explodir", () => {
    expect(sourceById("inventada")).toBe(SOURCES[0]);
  });

  it("registro estranho é descartado sem derrubar o resto", () => {
    const db = { transactions: [null, { type: "income", amount: 5 }] };
    expect(loadSource(db, "transacoes")).toHaveLength(1);
  });
});

describe("parsePipeline", () => {
  it("entende os comandos básicos", () => {
    const { passos, erros } = parsePipeline(
      "filtrar tipo = receita\nagrupar mes\nsomar valor\nlimite 5",
    );
    expect(erros).toEqual([]);
    expect(passos.map((p) => p.tipo)).toEqual([
      "filtrar",
      "agrupar",
      "somar",
      "limite",
    ]);
  });

  it("ignora linha em branco e comentário", () => {
    const { passos } = parsePipeline("# minha conta\n\ncontar\n");
    expect(passos).toHaveLength(1);
  });

  it("aponta a linha exata do erro", () => {
    const { erros } = parsePipeline("contar\nfiltrarr tipo = x");
    expect(erros[0].linha).toBe(2);
    expect(erros[0].texto).toContain("filtrarr");
  });

  it("erro de comando lista o que existe, em vez de só reclamar", () => {
    const { erros } = parsePipeline("xyz");
    for (const c of COMMANDS.slice(0, 3))
      expect(erros[0].texto).toContain(c.nome);
  });

  it("filtrar sem operador explica o formato certo", () => {
    const { erros } = parsePipeline("filtrar tipo receita");
    expect(erros[0].texto).toContain("filtrar campo = valor");
  });

  it("aceita valor com espaço no filtro", () => {
    const { passos } = parsePipeline("filtrar status = em aberto");
    expect(passos[0].valor).toBe("em aberto");
  });

  it("ordenar aceita desc e crescente", () => {
    expect(parsePipeline("ordenar total desc").passos[0].desc).toBe(true);
    expect(parsePipeline("ordenar total crescente").passos[0].desc).toBe(false);
  });

  it("ordenar sem direção não engole o nome do campo", () => {
    expect(parsePipeline("ordenar total").passos[0].campo).toBe("total");
  });

  it("limite sem número é recusado", () => {
    expect(parsePipeline("limite muitos").erros).toHaveLength(1);
  });

  it("consulta vazia não gera passo nem erro", () => {
    expect(parsePipeline("")).toEqual({ passos: [], erros: [] });
  });
});

describe("runPipeline", () => {
  it("filtra", () => {
    const r = rodar(LANCAMENTOS, "filtrar tipo = receita");
    expect(r.linhas).toHaveLength(3);
  });

  it("soma", () => {
    const r = rodar(LANCAMENTOS, "filtrar tipo = receita\nsomar valor");
    expect(r.linhas).toEqual([{ total: 400 }]);
  });

  it("conta", () => {
    expect(rodar(LANCAMENTOS, "contar").linhas).toEqual([{ quantidade: 4 }]);
  });

  it("agrupa por mês somando", () => {
    const r = rodar(LANCAMENTOS, "filtrar tipo = receita\nagrupar mes\nsomar valor");
    expect(r.linhas).toEqual([
      { mes: "2026-06", total: 100 },
      { mes: "2026-07", total: 300 },
    ]);
  });

  it("agrupa por categoria", () => {
    const r = rodar(LANCAMENTOS, "agrupar categoria\nsomar valor");
    expect(r.linhas).toContainEqual({ categoria: "bolo", total: 350 });
  });

  it("tira média", () => {
    expect(rodar(LANCAMENTOS, "filtrar tipo = receita\nmedia valor").linhas[0].media).toBeCloseTo(
      133.33,
      1,
    );
  });

  it("acha o maior e o menor", () => {
    expect(rodar(LANCAMENTOS, "maximo valor").linhas).toEqual([{ maximo: 250 }]);
    expect(rodar(LANCAMENTOS, "minimo valor").linhas).toEqual([{ minimo: 50 }]);
  });

  it("ordena e limita", () => {
    const r = rodar(
      LANCAMENTOS,
      "agrupar categoria\nsomar valor\nordenar total desc\nlimite 2",
    );
    expect(r.linhas.map((l) => l.categoria)).toEqual(["bolo", "insumo"]);
  });

  it("filtra por período contando a partir de hoje", () => {
    const r = rodar(LANCAMENTOS, "periodo ultimos 30 dias\ncontar", {
      now: "2026-07-25",
    });
    expect(r.linhas).toEqual([{ quantidade: 3 }]);
  });

  it("agrupar sem conta nenhuma conta as linhas, e explica", () => {
    // É o engano mais comum de quem está começando. Devolver vazio sem dizer
    // nada faria a pessoa achar que não tem dado.
    const r = rodar(LANCAMENTOS, "agrupar categoria");
    expect(r.linhas).toContainEqual({ categoria: "bolo", quantidade: 2 });
    expect(r.avisos[0]).toContain("somar valor");
  });

  it("campo que não existe vira aviso, não resultado silencioso", () => {
    const r = rodar(LANCAMENTOS, "filtrar cor = azul");
    expect(r.avisos[0]).toContain("não existe");
    expect(r.avisos[0]).toContain("categoria");
  });

  it("comparação de texto ignora acento e maiúscula", () => {
    const dados = [{ categoria: "Serviço" }, { categoria: "produto" }];
    expect(rodar(dados, "filtrar categoria = servico").linhas).toHaveLength(1);
  });

  it("contem procura pedaço do texto", () => {
    const dados = [{ descricao: "Bolo de cenoura" }, { descricao: "Pão" }];
    expect(rodar(dados, "filtrar descricao contem cenoura").linhas).toHaveLength(1);
  });

  it("maior e menor funcionam com número", () => {
    expect(rodar(LANCAMENTOS, "filtrar valor > 90\ncontar").linhas).toEqual([
      { quantidade: 2 },
    ]);
  });

  it("dado vazio devolve resultado vazio sem quebrar", () => {
    const r = rodar([], "agrupar categoria\nsomar valor");
    expect(r.linhas).toEqual([]);
    expect(r.colunas).toEqual([]);
  });

  it("valor em texto com R$ e vírgula ainda soma certo", () => {
    const dados = [{ valor: "R$ 1.234,50" }, { valor: "R$ 0,50" }];
    expect(rodar(dados, "somar valor").linhas).toEqual([{ total: 1235 }]);
  });
});

describe("apresentação", () => {
  it("sugere gráfico quando ele diz alguma coisa", () => {
    const r = rodar(LANCAMENTOS, "agrupar categoria\nsomar valor");
    expect(suggestChart(r)).toMatchObject({ rotulo: "categoria", valor: "total" });
  });

  it("não sugere gráfico de uma linha só", () => {
    expect(suggestChart(rodar(LANCAMENTOS, "contar"))).toBeNull();
  });

  it("não sugere gráfico de 300 barras, que não é leitura", () => {
    const muitos = Array.from({ length: 300 }, (_, i) => ({
      categoria: `c${i}`,
      total: i,
    }));
    expect(suggestChart({ linhas: muitos, colunas: ["categoria", "total"] })).toBeNull();
  });

  it("formata número no padrão brasileiro", () => {
    expect(formatCell(1234.5)).toBe("1.234,5");
    expect(formatCell("texto")).toBe("texto");
    expect(formatCell(null)).toBe("");
  });

  it("exporta CSV protegendo separador e aspas", () => {
    const csv = toCsv({
      colunas: ["nome", "obs"],
      linhas: [{ nome: 'Ana "A"', obs: "a;b" }],
    });
    expect(csv).toBe('nome;obs\n"Ana ""A""";"a;b"');
  });

  it("CSV de resultado vazio é vazio", () => {
    expect(toCsv({})).toBe("");
  });
});

describe("células do notebook", () => {
  it("notebook novo já vem com uma célula", () => {
    expect(makeNotebook({}).cells).toHaveLength(1);
  });

  it("tipo inválido vira consulta", () => {
    expect(makeCell({ tipo: "planilha" }).tipo).toBe("consulta");
  });

  it("sobe e desce a célula", () => {
    const a = makeCell({ id: "a" });
    const b = makeCell({ id: "b" });
    expect(moveCell([a, b], "b", "cima").map((c) => c.id)).toEqual(["b", "a"]);
    expect(moveCell([a, b], "a", "baixo").map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("na ponta, não sai da lista", () => {
    const a = makeCell({ id: "a" });
    expect(moveCell([a], "a", "cima").map((c) => c.id)).toEqual(["a"]);
  });

  it("apagar a última deixa uma em branco, para não virar tela sem saída", () => {
    const a = makeCell({ id: "a" });
    expect(removeCell([a], "a")).toHaveLength(1);
  });

  it("atualiza só a célula pedida", () => {
    const cells = [makeCell({ id: "a" }), makeCell({ id: "b" })];
    const r = updateCell(cells, "a", { consulta: "contar" });
    expect(r[0].consulta).toBe("contar");
    expect(r[1].consulta).toBe("");
  });
});

describe("receitas prontas", () => {
  it("toda receita é uma consulta válida", () => {
    for (const receita of RECIPES) {
      const { erros } = parsePipeline(receita.consulta);
      expect({ receita: receita.label, erros }).toEqual({
        receita: receita.label,
        erros: [],
      });
    }
  });

  it("toda receita aponta para uma fonte que existe", () => {
    for (const receita of RECIPES)
      expect(SOURCES.some((s) => s.id === receita.fonte)).toBe(true);
  });

  it("toda receita usa campos que a fonte realmente tem", () => {
    for (const receita of RECIPES) {
      const fonte = sourceById(receita.fonte);
      const { passos } = parsePipeline(receita.consulta);
      for (const passo of passos) {
        if (passo.tipo !== "filtrar") continue;
        expect({ receita: receita.label, campo: passo.campo }).toEqual({
          receita: receita.label,
          campo: fonte.fields.includes(passo.campo) ? passo.campo : "CAMPO INEXISTENTE",
        });
      }
    }
  });
});
