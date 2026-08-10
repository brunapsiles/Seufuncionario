import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TODO_GREEN_MODULE_CATALOG } from "./logisticsVerticalDomain.js";
import { NOMES_DOS_ESPECIALISTAS, especialistaDaVertical } from "./todoGreenAiSpecialists.js";
import {
  ESPECIALISTA_POR_TELA,
  HABILIDADES,
  SEMENTE,
  atalhosDaTela,
  corpoDaPergunta,
  especialistaDaTela,
  eventosDoTrecho,
  montarPergunta,
} from "./sementeDomain.js";

// O universo real de telas da vertical vem de duas fontes que já existem: o
// catálogo de módulos (que declara para onde cada item leva) e o mapa de
// implementação dentro do componente. O componente é lido como texto pelo
// mesmo motivo do teste de rótulos: importá-lo arrasta a árvore inteira.
const fonte = fs.readFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), "LogisticsVertical.jsx"),
  "utf8",
);
const blocoDosModulos = fonte.slice(
  fonte.indexOf("const MODULE_IMPLEMENTATION"),
  fonte.indexOf("const fieldLabels"),
);
const telasDoComponente = [...blocoDosModulos.matchAll(/^ {2}"?([a-z0-9-]+)"?: \{/gm)].map(
  (achado) => achado[1],
);
const telasDoCatalogo = TODO_GREEN_MODULE_CATALOG.map((modulo) =>
  String(modulo.workspaceRoute || modulo.route).replace("/todogreen/", ""),
);
const TELAS_REAIS = new Set([...telasDoComponente, ...telasDoCatalogo]);

describe("quem responde por cada tela", () => {
  it("não mapeia tela que não existe na vertical", () => {
    // Um apelido inventado aqui não quebra nada visivelmente: a pessoa só
    // recebe o especialista errado, calada. Por isso o mapa é conferido contra
    // as telas reais em vez de contra si mesmo.
    const inventadas = Object.keys(ESPECIALISTA_POR_TELA).filter(
      (tela) => !TELAS_REAIS.has(tela),
    );
    expect(inventadas).toEqual([]);
  });

  it("todo especialista escolhido existe no registro da vertical", () => {
    // Este é o defeito que acabou de ser corrigido no núcleo: nome fora do
    // registro cai no "Consultor" genérico, e a resposta perde a vertical.
    const foraDoRegistro = [...new Set(Object.values(ESPECIALISTA_POR_TELA))].filter(
      (nome) => !especialistaDaVertical(nome),
    );
    expect(foraDoRegistro).toEqual([]);
  });

  it("qualquer tela real resolve para um especialista registrado", () => {
    for (const tela of TELAS_REAIS) {
      expect(NOMES_DOS_ESPECIALISTAS).toContain(especialistaDaTela(tela));
    }
  });

  it("leva o assunto da tela, não um generalista", () => {
    expect(especialistaDaTela("precificacao")).toBe("Especialista em Precificação Logística");
    expect(especialistaDaTela("deal-desk")).toBe("Especialista em Precificação Logística");
    expect(especialistaDaTela("green-score")).toBe("Especialista ESG");
    expect(especialistaDaTela("rastreamento")).toBe("Especialista em Operações Logísticas");
    expect(especialistaDaTela("receita")).toBe("Especialista Financeiro");
  });

  it("sem tela conhecida atende o comercial, não um erro", () => {
    // A Semente é a inteligência comercial da vertical: sem contexto, o
    // comercial é o palpite honesto. O que ela não pode é deixar de responder.
    expect(especialistaDaTela(undefined)).toBe("Especialista Comercial");
    expect(especialistaDaTela("")).toBe("Especialista Comercial");
    expect(especialistaDaTela("tela-que-nao-existe")).toBe("Especialista Comercial");
    expect(especialistaDaTela("  precificacao  ")).toBe("Especialista em Precificação Logística");
  });
});

describe("atalhos de abertura", () => {
  it("toda tela real abre com perguntas, não com campo vazio", () => {
    for (const tela of TELAS_REAIS) {
      const atalhos = atalhosDaTela(tela);
      expect(atalhos.length).toBeGreaterThanOrEqual(3);
      for (const atalho of atalhos) expect(atalho.trim().length).toBeGreaterThan(10);
    }
  });

  it("os atalhos mudam com o especialista", () => {
    expect(atalhosDaTela("precificacao")).not.toEqual(atalhosDaTela("esg"));
  });

  it("todo especialista usado no mapa tem atalho próprio", () => {
    // Especialista sem atalho cai no conjunto do comercial em silêncio: quem
    // abre a Semente no ESG recebe três perguntas sobre carteira.
    const padraoComercial = atalhosDaTela("tela-que-nao-existe");
    const semAtalho = [];
    for (const [tela, nome] of Object.entries(ESPECIALISTA_POR_TELA)) {
      if (nome === "Especialista Comercial") continue;
      if (atalhosDaTela(tela) === padraoComercial) semAtalho.push(nome);
    }
    expect([...new Set(semAtalho)]).toEqual([]);
  });
});

describe("a pergunta que sai daqui", () => {
  it("recusa pergunta curta demais para significar alguma coisa", () => {
    expect(montarPergunta({ pergunta: "" }).valido).toBe(false);
    expect(montarPergunta({ pergunta: "  " }).valido).toBe(false);
    expect(montarPergunta({ pergunta: "oi" }).valido).toBe(false);
    expect(montarPergunta({}).valido).toBe(false);
    expect(montarPergunta().valido).toBe(false);
  });

  it("leva os dados da tela junto da pergunta", () => {
    // Sem isto a resposta vira conselho genérico de logística, que é o mesmo
    // que a pessoa teria digitando a pergunta em qualquer buscador.
    const { valido, prompt } = montarPergunta({
      pergunta: "Onde a margem está abaixo do piso?",
      tela: "precificacao",
      resumo: { margemOperacionalPercent: 11.4, receitaPrevista: 480000 },
    });
    expect(valido).toBe(true);
    expect(prompt).toContain("precificacao");
    expect(prompt).toContain("11.4");
    expect(prompt).toContain("480000");
    expect(prompt).toContain("Onde a margem está abaixo do piso?");
  });

  it("sem resumo não inventa contexto", () => {
    const { prompt } = montarPergunta({ pergunta: "Qual a próxima ação?", tela: "clientes" });
    expect(prompt.startsWith("Pergunta:")).toBe(true);
    expect(montarPergunta({ pergunta: "Qual a próxima ação?", resumo: {} }).prompt).toBe(prompt);
  });

  it("manda a Semente dizer o que falta em vez de estimar", () => {
    // O produto inteiro se apoia em dado real. Uma IA que preenche o buraco
    // com estimativa destrói exatamente a auditabilidade que a vertical vende.
    expect(montarPergunta({ pergunta: "Fecha o mês?" }).prompt).toContain(
      "diga qual falta em vez de estimar",
    );
  });
});

describe("identidade da Semente", () => {
  it("carrega o nome, a assinatura e o lema da marca", () => {
    expect(SEMENTE.nome).toBe("Semente");
    expect(SEMENTE.assinatura).toBe("A inteligência comercial da To Do Green");
    expect(SEMENTE.lema).toBe("Planta oportunidades. Colhe resultados.");
    expect(SEMENTE.saudacao.length).toBeGreaterThan(40);
  });

  it("anuncia só o que ela realmente faz pelos especialistas da vertical", () => {
    expect(HABILIDADES).toContain("Analisa empresas");
    expect(HABILIDADES).toContain("Avalia riscos ESG");
    expect(HABILIDADES.length).toBe(6);
  });
});

describe("o corpo que vai para /api/ai", () => {
  const base = { pergunta: "Onde a margem caiu?", tela: "precificacao" };

  it("recusa o mesmo que montarPergunta recusa", () => {
    expect(corpoDaPergunta({ pergunta: "oi", tela: "clientes" }).valido).toBe(false);
    expect(corpoDaPergunta().corpo).toBeNull();
  });

  it("manda o especialista da tela junto do prompt", () => {
    const { corpo } = corpoDaPergunta(base);
    expect(corpo.specialist).toBe("Especialista em Precificação Logística");
    expect(corpo.prompt).toContain("Onde a margem caiu?");
  });

  it("leva a conversa anterior, senão cada pergunta nasce amnésica", () => {
    // "E o segundo caso?" não quer dizer nada sem as mensagens anteriores.
    const { corpo } = corpoDaPergunta({
      ...base,
      historico: [
        { de: "voce", texto: "Quais contratos estão abaixo do piso?" },
        { de: "semente", texto: "Três: Alfa, Beta e Gama." },
      ],
    });
    expect(corpo.messages.map((item) => item.role)).toEqual(["user", "assistant", "user"]);
    expect(corpo.messages[1].content).toBe("Três: Alfa, Beta e Gama.");
  });

  it("a pergunta atual é a última mensagem, que é a que o servidor descarta", () => {
    // O servidor faz messages.slice(-9, -1): ele assume que a última é a
    // pergunta atual e a remove do histórico. Mandar sem ela perderia a
    // penúltima mensagem de verdade.
    const { corpo } = corpoDaPergunta({
      ...base,
      historico: [{ de: "voce", texto: "Pergunta anterior de verdade" }],
    });
    expect(corpo.messages.at(-1)).toEqual({ role: "user", content: "Onde a margem caiu?" });
  });

  it("não reenvia mensagem de erro como se fosse fala da assistente", () => {
    const { corpo } = corpoDaPergunta({
      ...base,
      historico: [
        { de: "voce", texto: "Pergunta que falhou" },
        { de: "semente", texto: "Cota mensal de IA esgotada.", falhou: true },
      ],
    });
    expect(corpo.messages.map((item) => item.content)).not.toContain(
      "Cota mensal de IA esgotada.",
    );
  });

  it("corta o histórico no limite que o servidor lê", () => {
    const historico = Array.from({ length: 40 }, (_, indice) => ({
      de: indice % 2 === 0 ? "voce" : "semente",
      texto: `mensagem ${indice}`,
    }));
    expect(corpoDaPergunta({ ...base, historico }).corpo.messages).toHaveLength(10);
  });

  it("sem escolha explícita, deixa o servidor decidir a busca web", () => {
    // O servidor já tem heurística própria (shouldSearchWeb). Mandar `false`
    // por omissão desligaria uma capacidade que existe.
    expect(corpoDaPergunta(base).corpo.webSearch).toBeUndefined();
  });

  it("com a busca ligada, procura pela pergunta crua e não pelos dados do cliente", () => {
    const { corpo } = corpoDaPergunta({
      ...base,
      resumo: { receitaPrevista: 480000, clienteCritico: "Transportes Alfa" },
      buscarNaWeb: true,
    });
    expect(corpo.webSearch).toBe(true);
    expect(corpo.webSearchQuery).toBe("Onde a margem caiu?");
    expect(corpo.webSearchQuery).not.toContain("Transportes Alfa");
    expect(corpo.webSearchQuery).not.toContain("480000");
  });

  it("com a busca desligada, o servidor não busca por conta própria", () => {
    expect(corpoDaPergunta({ ...base, buscarNaWeb: false }).corpo.webSearch).toBe(false);
    expect(corpoDaPergunta({ ...base, buscarNaWeb: false }).corpo.webSearchQuery).toBeUndefined();
  });
});

describe("leitura do streaming", () => {
  it("separa quadros completos e guarda o pedaço que ficou pela metade", () => {
    const { eventos, resto } = eventosDoTrecho(
      'data: {"t":"Olá"}\n\ndata: {"t":" mundo"}\n\ndata: {"t":"inc',
    );
    expect(eventos).toEqual([{ t: "Olá" }, { t: " mundo" }]);
    expect(resto).toBe('data: {"t":"inc');
  });

  it("um quadro quebrado não derruba a leitura do resto", () => {
    const { eventos } = eventosDoTrecho('data: nao-e-json\n\ndata: {"t":"segue"}\n\n');
    expect(eventos).toEqual([{ t: "segue" }]);
  });

  it("lê o encerramento com as fontes", () => {
    const { eventos } = eventosDoTrecho(
      'data: {"done":true,"provider":"Google Gemini","sources":[{"url":"https://a"}]}\n\n',
    );
    expect(eventos[0].done).toBe(true);
    expect(eventos[0].sources).toHaveLength(1);
  });

  it("aguenta buffer vazio e lixo sem quadro", () => {
    expect(eventosDoTrecho("")).toEqual({ eventos: [], resto: "" });
    expect(eventosDoTrecho(undefined).eventos).toEqual([]);
    expect(eventosDoTrecho(": keep-alive\n\n").eventos).toEqual([]);
  });
});
