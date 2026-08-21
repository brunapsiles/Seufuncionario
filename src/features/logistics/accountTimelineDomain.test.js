import { describe, expect, it } from "vitest";
import {
  TIPOS,
  TIPOS_DE_EVENTO,
  agruparPorDia,
  criarEvento,
  montarLinhaDoTempo,
  resumirLinhaDoTempo,
} from "./accountTimelineDomain.js";

const evento = (extra = {}) =>
  criarEvento({ id: "e1", tipo: "proposta", quando: "2026-08-10T12:00:00Z", titulo: "Proposta MM-234 enviada", ...extra });

describe("um evento da conta", () => {
  it("carrega o dia separado, para a tela agrupar sem recalcular", () => {
    expect(evento()).toMatchObject({ tipo: "proposta", dia: "2026-08-10", titulo: "Proposta MM-234 enviada" });
  });

  it("evento sem data não entra", () => {
    // Numa linha do tempo, "quando" não é campo opcional: um evento sem data
    // apareceria em qualquer lugar da ordem, e a ordem é o produto inteiro.
    expect(criarEvento({ tipo: "proposta", quando: "", titulo: "x" })).toBeNull();
    expect(criarEvento({ tipo: "proposta", quando: "data inválida", titulo: "x" })).toBeNull();
  });

  it("evento sem tipo conhecido ou sem título não entra", () => {
    expect(criarEvento({ tipo: "inventado", quando: "2026-08-10T12:00:00Z", titulo: "x" })).toBeNull();
    expect(criarEvento({ tipo: "proposta", quando: "2026-08-10T12:00:00Z", titulo: "  " })).toBeNull();
  });

  it("campo vazio vira nulo, não string vazia", () => {
    // A tela decide "mostrar ou não" por nulo. String vazia desenharia uma
    // linha em branco embaixo de cada evento sem detalhe.
    const item = evento({ detalhe: "", autor: "  ", valor: 0 });
    expect(item.detalhe).toBeNull();
    expect(item.autor).toBeNull();
    expect(item.valor).toBeNull();
  });

  it("todo tipo declarado tem rótulo e cor", () => {
    for (const tipo of TIPOS) {
      expect(TIPOS_DE_EVENTO[tipo].rotulo.length).toBeGreaterThan(2);
      expect(TIPOS_DE_EVENTO[tipo].cor.length).toBeGreaterThan(2);
    }
  });
});

describe("a linha do tempo", () => {
  const eventos = [
    criarEvento({ id: "a", tipo: "oportunidade", quando: "2026-08-08T09:00:00Z", titulo: "Reunião com Supply" }),
    criarEvento({ id: "b", tipo: "pesquisa", quando: "2026-08-09T09:00:00Z", titulo: "Plantû encontrou expansão em Cajamar" }),
    criarEvento({ id: "c", tipo: "proposta", quando: "2026-08-10T08:00:00Z", titulo: "Proposta MM-234 enviada" }),
    criarEvento({ id: "d", tipo: "portal", quando: "2026-08-10T18:00:00Z", titulo: "Cliente abriu proposta" }),
    criarEvento({ id: "e", tipo: "contrato", quando: "2026-08-20T10:00:00Z", titulo: "Contrato aprovado" }),
  ];

  it("mais recente primeiro — é como se lê antes de uma reunião", () => {
    expect(montarLinhaDoTempo(eventos).map((item) => item.id)).toEqual(["e", "d", "c", "b", "a"]);
  });

  it("junta módulos diferentes na mesma linha", () => {
    // O ponto do recurso: proposta, portal, contrato e Plantû vinham de
    // quatro telas separadas e agora contam uma história só.
    expect(new Set(montarLinhaDoTempo(eventos).map((item) => item.tipo)).size).toBe(5);
  });

  it("não repete o mesmo evento quando duas fontes o trazem", () => {
    const duplicado = [...eventos, criarEvento({ id: "c", tipo: "proposta", quando: "2026-08-10T08:00:00Z", titulo: "Proposta MM-234 enviada" })];
    expect(montarLinhaDoTempo(duplicado)).toHaveLength(5);
  });

  it("filtra por tipo e por período", () => {
    expect(montarLinhaDoTempo(eventos, { tipos: ["proposta", "contrato"] }).map((item) => item.id)).toEqual(["e", "c"]);
    expect(montarLinhaDoTempo(eventos, { desde: "2026-08-10T00:00:00Z" }).map((item) => item.id)).toEqual(["e", "d", "c"]);
    expect(montarLinhaDoTempo(eventos, { ate: "2026-08-09T23:59:59Z" }).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("descarta o que não é evento em vez de quebrar a lista", () => {
    expect(montarLinhaDoTempo([null, undefined, { tipo: "proposta" }, ...eventos])).toHaveLength(5);
    expect(montarLinhaDoTempo(null)).toEqual([]);
  });

  it("a ordem não dança entre dois carregamentos", () => {
    // Dois eventos no mesmo instante precisam de desempate estável, senão a
    // lista se reordena sozinha e a pessoa acha que perdeu alguma coisa.
    const mesmoInstante = [
      criarEvento({ id: "z", tipo: "tarefa", quando: "2026-08-11T10:00:00Z", titulo: "Tarefa Z" }),
      criarEvento({ id: "a", tipo: "tarefa", quando: "2026-08-11T10:00:00Z", titulo: "Tarefa A" }),
    ];
    expect(montarLinhaDoTempo(mesmoInstante).map((item) => item.id)).toEqual(["a", "z"]);
    expect(montarLinhaDoTempo([...mesmoInstante].reverse()).map((item) => item.id)).toEqual(["a", "z"]);
  });

  it("agrupa por dia, que é como a pessoa lê", () => {
    const dias = agruparPorDia(montarLinhaDoTempo(eventos));
    expect(dias.map((item) => item.dia)).toEqual(["2026-08-20", "2026-08-10", "2026-08-08", "2026-08-09"].sort().reverse());
    expect(dias.find((item) => item.dia === "2026-08-10").eventos).toHaveLength(2);
  });
});

describe("o que a linha do tempo diz sobre a conta", () => {
  it("conta parada é medida em dias desde o último evento", () => {
    const resumo = resumirLinhaDoTempo(
      [criarEvento({ id: "a", tipo: "tarefa", quando: "2026-08-01T10:00:00Z", titulo: "Tarefa" })],
      "2026-08-13T10:00:00Z",
    );
    expect(resumo.diasSemAtividade).toBe(12);
    expect(resumo.leitura).toBe("Última atividade há 12 dias.");
  });

  it("conta sem registro não é chamada de parada", () => {
    // Conta nova e conta abandonada parecem iguais no número, e não são a
    // mesma decisão comercial.
    const resumo = resumirLinhaDoTempo([]);
    expect(resumo.diasSemAtividade).toBeNull();
    expect(resumo.leitura).toBe("Nenhum registro nesta conta ainda.");
  });

  it("hoje e ontem são ditos por extenso", () => {
    const hoje = resumirLinhaDoTempo([criarEvento({ id: "a", tipo: "tarefa", quando: "2026-08-13T08:00:00Z", titulo: "T" })], "2026-08-13T20:00:00Z");
    expect(hoje.leitura).toBe("Houve atividade hoje.");
    const ontem = resumirLinhaDoTempo([criarEvento({ id: "a", tipo: "tarefa", quando: "2026-08-12T08:00:00Z", titulo: "T" })], "2026-08-13T20:00:00Z");
    expect(ontem.leitura).toBe("Última atividade ontem.");
  });

  it("conta quantos eventos de cada tipo", () => {
    const resumo = resumirLinhaDoTempo([
      criarEvento({ id: "a", tipo: "tarefa", quando: "2026-08-01T10:00:00Z", titulo: "T1" }),
      criarEvento({ id: "b", tipo: "tarefa", quando: "2026-08-02T10:00:00Z", titulo: "T2" }),
      criarEvento({ id: "c", tipo: "proposta", quando: "2026-08-03T10:00:00Z", titulo: "P" }),
    ], "2026-08-03T10:00:00Z");
    expect(resumo.porTipo).toEqual({ tarefa: 2, proposta: 1 });
    expect(resumo.ultimoEvento.id).toBe("c");
  });
});
