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

  it("campo econômico interno que venha junto do banco não passa para o contexto", () => {
    const c = montarContextoDoCliente({
      ...dadosDoServidor,
      resumo: {
        ...dadosDoServidor.resumo,
        margem: 320000,
        margemOperacional: 22,
        lucro: 140000,
        ebitda: 90000,
        custoTotal: 180000,
        receitaContratada: 500000,
      },
      operacoes: [
        {
          ...dadosDoServidor.operacoes[0],
          campos: {
            ...dadosDoServidor.operacoes[0].campos,
            custo: 9000,
            custoPorKm: 12,
            margem: 22,
            rentabilidade: 18,
          },
        },
      ],
    });
    const texto = JSON.stringify(c);
    expect(texto).not.toMatch(/margem/i);
    expect(texto).not.toMatch(/custo/i);
    expect(texto).not.toMatch(/lucro/i);
    expect(texto).not.toMatch(/ebitda/i);
    expect(texto).not.toMatch(/rentabilidade/i);
    expect(texto).not.toMatch(/receitaContratada/i);
    expect(() => validarContexto(c)).not.toThrow();
  });

  it("a validação final derruba a chamada se algum campo interno escapar", () => {
    expect(() => validarContexto({ resumo: { margem: 10 } })).toThrow(/campo interno/i);
    expect(() => validarContexto({ dados: { comissao: 5 } })).toThrow(/comissao/i);
    expect(() => validarContexto({ dados: { custoPorKm: 7 } })).toThrow(/custoPorKm/i);
    expect(() => validarContexto({ dados: { rentabilidade: 12 } })).toThrow(/rentabilidade/i);
  });

  it("a lista proibida cobre economia interna e inteligência comercial", () => {
    for (const campo of [
      "margem",
      "margemOperacional",
      "lucro",
      "rentabilidade",
      "ebitda",
      "custo",
      "custoPorKm",
      "comissao",
      "pipeline",
      "concorrente",
    ])
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
  it("reconhece pergunta econômica interna antes de chamar o modelo", () => {
    for (const pergunta of [
      "Qual a margem da minha operação?",
      "Quanto custa pra vocês fazer essa rota?",
      "Qual o custo por km dessa operação?",
      "Qual é a rentabilidade desse contrato?",
      "Quanto a To Do Green lucra comigo?",
      "Qual o EBITDA dessa conta?",
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
      "Podemos aumentar a frequência desta rota?",
      "Quais cargas podem migrar para veículos de menor emissão?",
    ])
      expect(foraDoEscopoDoCliente(pergunta), pergunta).toBe(false);
  });

  it("a recusa protege dados internos e redireciona para expansão", () => {
    expect(RESPOSTA_FORA_DE_ESCOPO).toMatch(/interna da To Do Green/i);
    expect(RESPOSTA_FORA_DE_ESCOPO).toMatch(/sua operação/i);
    expect(RESPOSTA_FORA_DE_ESCOPO).toMatch(/ampliar o volume|novas rotas/i);
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

  it("proíbe margem e demais informações econômicas internas", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/nunca informe, estime ou deduza margem/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/custo por km/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/EBITDA/i);
  });

  it("orienta continuidade e expansão com base em dados", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/continuidade da operação/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/expansão de volume/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/novas rotas/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/estudo de capacidade/i);
  });

  it("não permite promessa comercial sem comprovação", () => {
    expect(INSTRUCAO_ASSISTENTE).toMatch(/nunca prometa capacidade/i);
    expect(INSTRUCAO_ASSISTENTE).toMatch(/dado que sustenta/i);
  });
});
