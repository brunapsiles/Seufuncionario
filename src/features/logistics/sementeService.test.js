import { describe, expect, it } from "vitest";
import {
  ACOES,
  FERRAMENTAS,
  INSTRUCAO,
  catalogoTextual,
  escolherCliente,
  executarFerramenta,
  lerDecisao,
  montarIndice,
  respostaPareceEmIngles,
} from "../../../worker/services/todogreen-semente.js";

// O lado do servidor da Semente, na parte que é pura: ler a decisão do
// modelo, montar o índice da carteira, achar a conta certa pelo nome e
// executar as ferramentas que não tocam banco.

const linha = (id, nome, campos = {}, extra = {}) => ({
  id,
  name: nome,
  legal_name: "",
  document: "",
  segment: extra.segment || "",
  status: "ativo",
  notes: "",
  fields_json: JSON.stringify(campos),
  updated_at: "2026-08-01T00:00:00Z",
});

describe("ler a decisão do modelo", () => {
  it("lê o JSON limpo nos três formatos", () => {
    expect(lerDecisao('{"resposta":"Duas contas paradas."}')).toMatchObject({
      resposta: "Duas contas paradas.",
      consultar: null,
      acao: null,
    });
    expect(lerDecisao('{"consultar":{"ferramenta":"carteira","temperatura":"Quente"}}').consultar)
      .toMatchObject({ ferramenta: "carteira", temperatura: "Quente" });
    expect(
      lerDecisao('{"resposta":"Proponho a tarefa.","acao":{"tipo":"criar_tarefa","titulo":"Ligar"}}').acao,
    ).toMatchObject({ tipo: "criar_tarefa", titulo: "Ligar" });
  });

  it("aguenta cerca de código e texto antes do JSON", () => {
    // Modelo embrulha JSON em ```json``` ou escreve uma frase antes. Nada
    // disso pode virar erro na cara de quem perguntou.
    expect(lerDecisao('```json\n{"resposta":"ok"}\n```').resposta).toBe("ok");
    expect(lerDecisao('Claro! {"resposta":"ok"}').resposta).toBe("ok");
    expect(lerDecisao('{"resposta":"tem { chave } dentro"}').resposta).toBe("tem { chave } dentro");
  });

  it("texto puro vira resposta, não erro", () => {
    expect(lerDecisao("A carteira está saudável.").resposta).toBe("A carteira está saudável.");
    expect(lerDecisao("").resposta).toBe("");
  });

  it("ferramenta ou ação fora do catálogo é descartada", () => {
    // O modelo não inventa capacidades: o que não está no catálogo não
    // existe, mesmo que ele jure que sim.
    expect(lerDecisao('{"consultar":{"ferramenta":"apagar_banco"}}').consultar).toBeNull();
    expect(lerDecisao('{"resposta":"x","acao":{"tipo":"transferir_dinheiro"}}').acao).toBeNull();
  });
});

describe("idioma da resposta", () => {
  it("detecta resposta em inglês sem confundir cargos e siglas isolados", () => {
    expect(respostaPareceEmIngles("The company reports strong business growth and supply chain investments across their transportation network.")).toBe(true);
    expect(respostaPareceEmIngles("A empresa tem um Procurement Manager responsável por Supply Chain no Brasil.")).toBe(false);
  });
});

describe("o índice da carteira", () => {
  it("resume cada conta sem expor o cadastro inteiro", () => {
    const [item] = montarIndice([
      linha("c1", "Rede Alfa", {
        temperature: "Quente",
        stage: "Negociação",
        nextAction: "Enviar proposta",
        contacts: [
          { name: "Ana", email: "ana@alfa.com" },
          { name: "Beto" },
        ],
        intelligence: { checkedAt: "2026-08-01T00:00:00Z" },
      }),
    ]);
    expect(item).toMatchObject({
      id: "c1",
      nome: "Rede Alfa",
      temperatura: "Quente",
      proximaAcao: "Enviar proposta",
      contatos: 2,
      contatosComCanal: 1,
      pesquisaExterna: "2026-08-01T00:00:00Z",
    });
  });

  it("o que falta aparece como nulo, não como texto inventado", () => {
    const [item] = montarIndice([linha("c2", "Beta Log", {})]);
    expect(item.temperatura).toBeNull();
    expect(item.proximaAcao).toBeNull();
    expect(item.pesquisaExterna).toBeNull();
    expect(item.contatos).toBe(0);
  });
});

describe("achar a conta pelo que a pessoa escreveu", () => {
  const linhas = [
    linha("c1", "Rede Alfa"),
    linha("c2", "Alfa Transportes"),
    linha("c3", "Beta Logística"),
  ];

  it("nome exato e id ganham na hora", () => {
    expect(escolherCliente(linhas, "Rede Alfa").linha.id).toBe("c1");
    expect(escolherCliente(linhas, "c3").linha.id).toBe("c3");
    expect(escolherCliente(linhas, "beta logistica").linha.id).toBe("c3");
  });

  it("ambiguidade vira pergunta, não palpite", () => {
    // "Alfa" casa com duas contas. Escolher uma em silêncio gravaria a
    // próxima ação na conta errada.
    const { linha: escolhida, ambiguidade } = escolherCliente(linhas, "Alfa");
    expect(escolhida).toBeNull();
    expect(ambiguidade).toEqual(["Rede Alfa", "Alfa Transportes"]);
  });

  it("nada encontrado devolve vazio em vez de aproximar", () => {
    expect(escolherCliente(linhas, "Gama").linha).toBeNull();
    expect(escolherCliente(linhas, "Gama").ambiguidade).toEqual([]);
  });
});

describe("ferramentas que não tocam banco", () => {
  const linhas = [
    linha("c1", "Rede Alfa", {
      temperature: "Quente",
      contacts: [
        { name: "Ana Souza", title: "Gerente de Compras", email: "ana@alfa.com" },
        { name: "Caio Lima", title: "Analista ESG", linkedinUrl: "https://linkedin.com/in/caio" },
      ],
    }),
    linha("c2", "Beta Logística", { temperature: "Morno", contacts: [] }),
  ];

  it("carteira filtra por temperatura e situação", async () => {
    const quentes = await executarFerramenta({}, { access: {}, pedido: { ferramenta: "carteira", temperatura: "Quente" }, linhas });
    expect(quentes.total).toBe(1);
    expect(quentes.contas[0].nome).toBe("Rede Alfa");
    const semContato = await executarFerramenta({}, { access: {}, pedido: { ferramenta: "carteira", situacao: "sem-contato" }, linhas });
    expect(semContato.contas.map((item) => item.nome)).toEqual(["Beta Logística"]);
  });

  it("contatos procura por cargo em toda a carteira e mantém cada pessoa inteira", async () => {
    const compras = await executarFerramenta({}, { access: {}, pedido: { ferramenta: "contatos", termo: "compras" }, linhas });
    expect(compras.total).toBe(1);
    // A pessoa vem com os próprios canais, associados a ela — não a uma
    // string concatenada de carteira.
    expect(compras.contatos[0]).toMatchObject({
      conta: "Rede Alfa",
      nome: "Ana Souza",
      cargo: "Gerente de Compras",
      email: "ana@alfa.com",
      telefone: null,
    });
  });

  it("inteligencia sem pesquisa feita diz isso e sugere a ação", async () => {
    const resultado = await executarFerramenta({}, { access: {}, pedido: { ferramenta: "inteligencia", cliente: "Beta Logística" }, linhas });
    expect(resultado.pesquisa).toBeNull();
    expect(resultado.observacao).toContain("nunca foi pesquisada");
  });

  it("ferramenta desconhecida devolve erro legível", async () => {
    const resultado = await executarFerramenta({}, { access: {}, pedido: { ferramenta: "hackear" }, linhas });
    expect(resultado.erro).toBe("Ferramenta desconhecida.");
  });
});

describe("o contrato com o modelo", () => {
  it("o catálogo textual cobre todas as ferramentas e ações", () => {
    const texto = catalogoTextual();
    for (const nome of Object.keys(FERRAMENTAS)) expect(texto).toContain(`- ${nome}:`);
    for (const nome of Object.keys(ACOES)) expect(texto).toContain(`- ${nome}:`);
    expect(FERRAMENTAS).toHaveProperty("interacoes");
    expect(ACOES).toHaveProperty("registrar_interacao");
  });

  it("a instrução proíbe inventar e exige confirmação humana", () => {
    // São as duas frases que seguram o produto: sem elas a Semente vira
    // gerador de dado plausível com botão de gravar.
    expect(INSTRUCAO).toContain("Nunca estime");
    expect(INSTRUCAO).toContain("quem confirma é a pessoa");
    expect(INSTRUCAO).toContain("português do Brasil");
  });

  it("a instrução proíbe recomendar ferramenta externa", () => {
    // Aconteceu em produção: a Semente recomendou Google Sheets e HubSpot
    // dentro do próprio CRM, porque recebia só o resumo do painel e o
    // contexto do negócio errado. O dado certo resolve a causa; esta linha
    // resolve a recaída.
    expect(INSTRUCAO).toContain("Nunca recomende planilha");
    expect(INSTRUCAO).toContain("HubSpot");
  });
});
