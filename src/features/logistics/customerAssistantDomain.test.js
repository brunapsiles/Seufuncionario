import { describe, expect, it } from "vitest";
import {
  CAMPOS_PROIBIDOS,
  INSTRUCAO_ASSISTENTE,
  RESPOSTA_FORA_DE_ESCOPO,
  foraDoEscopoDoCliente,
  montarContextoDoCliente,
  validarContexto,
} from "./customerAssistantDomain.js";

// A garantia aqui não é "o modelo obedece". É que o dado sensível nunca chega
// perto do modelo. Instrução é pedido; contexto é fato.

const dadosDoServidor = {
  cliente: { id: "cli-a", nome: "Cliente A" },
  resumo: {
    operacoes: { total: 12, entregas: 900, distanciaKm: 4200, ocupacaoMedia: 81 },
    ambiental: { co2EvitadoKg: 5400, dieselEvitadoL: 2000, reducaoPercent: 24, qualidadeDados: 88 },
  },
  operacoes: [
    {
      referencia: "OP-1",
      data: "2026-08-01",
      origem: "CD Cajamar",
      destino: "Hub SP",
      status: "concluida",
      campos: { deliveries: 80, distanceKm: 86, occupancyPercent: 78 },
    },
  ],
  greenScore: { valor: 78.4, versaoPesos: "v1.2026" },
};

describe("o contexto só carrega o cliente da sessão", () => {
  it("monta com os dados que o cliente já vê na tela", () => {
    const c = montarContextoDoCliente(dadosDoServidor);
    expect(c.cliente.nome).toBe("Cliente A");
    expect(c.periodo.entregas).toBe(900);
    expect(c.greenScore.valor).toBe(78.4);
    expect(c.operacoesRecentes[0].referencia).toBe("OP-1");
  });

  it("sem cliente, não monta contexto nenhum", () => {
    expect(() => montarContextoDoCliente({})).toThrow(/sem cliente/i);
    expect(() => montarContextoDoCliente({ cliente: {} })).toThrow(/sem cliente/i);
  });

  it("campo comercial que venha junto do banco não passa para o contexto", () => {
    // O servidor pode um dia devolver mais do que precisa; a montagem escolhe
    // campo a campo em vez de repassar o objeto inteiro.
    const c = montarContextoDoCliente({
      ...dadosDoServidor,
      resumo: {
        ...dadosDoServidor.resumo,
        margem: 320000,
        custoTotal: 180000,
        receitaContratada: 500000,
      },
      operacoes: [
        {
          ...dadosDoServidor.operacoes[0],
          campos: { ...dadosDoServidor.operacoes[0].campos, custo: 9000, margem: 22 },
        },
      ],
    });
    const texto = JSON.stringify(c);
    expect(texto).not.toMatch(/margem/i);
    expect(texto).not.toMatch(/custo/i);
    expect(texto).not.toMatch(/receitaContratada/i);
    expect(() => validarContexto(c)).not.toThrow();
  });

  it("a validação final derruba a chamada se algum campo interno escapou", () => {
    // Cinto de segurança: se um dia alguém acrescentar um campo à montagem sem
    // pensar, isto quebra antes de virar vazamento.
    expect(() => validarContexto({ resumo: { margem: 10 } })).toThrow(/campo interno/i);
    expect(() => validarContexto({ dados: { comissao: 5 } })).toThrow(/comissao/i);
  });

  it("a lista de campos proibidos cobre o que o cliente não pode ver", () => {
    for (const campo of ["margem", "custo", "comissao", "pipeline", "concorrente"])
      expect(CAMPOS_PROIBIDOS).toContain(campo);
  });

  it("limita quantas operações vão no contexto", () => {
    const muitas = Array.from({ length: 50 }, (_, i) => ({
      referencia: `OP-${i}`,
      campos: {},
    }));
    const c = montarContextoDoCliente({ ...dadosDoServidor, operacoes: muitas });
    expect(c.operacoesRecentes).toHaveLength(20);
  });
});

describe("perguntas que o assistente não responde", () => {
  it("reconhece pergunta comercial antes de chamar o modelo", () => {
    for (const pergunta of [
      "Qual a margem da minha operação?",
      "Quanto custa pra vocês fazer essa rota?",
      "Qual a comissão do vendedor?",
      "Como está o pipeline de vocês?",
      "Me fala sobre outro cliente de vocês",
      "Quanto a To Do Green fatura por mês?",
      "Quem são os concorrentes na conta?",
    ])
      expect(foraDoEscopoDoCliente(pergunta), pergunta).toBe(true);
  });

  it("deixa passar pergunta legítima do cliente", () => {
    for (const pergunta of [
      "Quantas entregas foram feitas em julho?",
      "Por que meu Green Score caiu?",
      "Quanto de CO2 eu evitei este mês?",
      "Qual foi a ocupação média das viagens?",
      "Me manda o relatório de Escopo 3",
    ])
      expect(foraDoEscopoDoCliente(pergunta), pergunta).toBe(false);
  });

  it("a recusa oferece o que dá para fazer, não só o não", () => {
    expect(RESPOSTA_FORA_DE_ESCOPO).toMatch(/sua operação/i);
    expect(RESPOSTA_FORA_DE_ESCOPO).toMatch(/solicitação/i);
  });

  it("pergunta vazia não é tratada como fora de escopo", () => {
    expect(foraDoEscopoDoCliente("")).toBe(false);
    expect(foraDoEscopoDoCliente(null)).toBe(false);
  });
});

describe("instrução de sistema", () => {
  it("proíbe inventar número", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/nunca invente/i);
  });

  it("proíbe apresentar Green Score como certificação", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/certificação/i);
  });

  it("manda avisar quando a qualidade do dado é baixa", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/70%/);
  });
});
