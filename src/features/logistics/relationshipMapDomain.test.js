import { describe, expect, it } from "vitest";
import {
  DEGRAUS,
  POSICOES,
  areaDoContato,
  forcaDoRelacionamento,
  montarMapa,
  poderDoContato,
  posicaoDoContato,
} from "./relationshipMapDomain.js";

const contato = (extra = {}) => ({ id: "c", name: "Pessoa", active: true, ...extra });

describe("posição do contato", () => {
  it("apoio alto é aliado, apoio negativo é barreira", () => {
    expect(posicaoDoContato(contato({ supportLevel: 60 }))).toBe("aliado");
    expect(posicaoDoContato(contato({ supportLevel: -40 }))).toBe("barreira");
    expect(posicaoDoContato(contato({ supportLevel: 5 }))).toBe("neutro");
  });

  it("sem apoio informado é desconhecido, não neutro", () => {
    // "Contrário" e "não sei" são informações diferentes, e levam a ações
    // diferentes: uma pede plano de contorno, a outra pede uma conversa.
    expect(posicaoDoContato(contato())).toBe("desconhecido");
    expect(posicaoDoContato(contato({ supportLevel: "" }))).toBe("desconhecido");
    expect(posicaoDoContato(contato({ supportLevel: 0 }))).toBe("neutro");
  });

  it("toda posição tem rótulo e sinal visual", () => {
    for (const item of Object.values(POSICOES)) {
      expect(item.rotulo.length).toBeGreaterThan(3);
      expect(item.sinal.length).toBeGreaterThan(0);
    }
  });
});

describe("poder de decisão", () => {
  it("o papel declarado manda mais que o número", () => {
    // O papel foi escolhido por uma pessoa; o número costuma vir zerado do
    // cadastro e diria "usuário" para um decisor econômico.
    expect(poderDoContato(contato({ relationshipRole: "Decisor econômico", influence: 0 }))).toBe("decide");
    expect(poderDoContato(contato({ relationshipRole: "Patrocinador" }))).toBe("decide");
  });

  it("acesso ou influência altos também decidem", () => {
    expect(poderDoContato(contato({ relationshipRole: "Compras", accessLevel: 80 }))).toBe("decide");
    expect(poderDoContato(contato({ relationshipRole: "Compras", influence: 40 }))).toBe("influencia");
    expect(poderDoContato(contato({ relationshipRole: "Usuário" }))).toBe("usa");
  });
});

describe("área do contato", () => {
  it("agrupa pelo papel e pelo cargo, sem tropeçar em acento", () => {
    expect(areaDoContato(contato({ relationshipRole: "Compras" }))).toBe("Compras");
    expect(areaDoContato(contato({ title: "Gerente de Logística" }))).toBe("Logística");
    expect(areaDoContato(contato({ title: "Analista de Sustentabilidade" }))).toBe("ESG");
    expect(areaDoContato(contato({ title: "Supply Chain Manager" }))).toBe("Supply Chain");
  });

  it("o que não casa vai para Outros em vez de sumir do mapa", () => {
    expect(areaDoContato(contato({ title: "Estagiário" }))).toBe("Outros");
    expect(areaDoContato(contato())).toBe("Outros");
  });
});

describe("força do relacionamento", () => {
  it("um degrau por conquista real: canal, decisor e aliado", () => {
    const cheio = forcaDoRelacionamento([
      contato({ id: "1", relationshipRole: "Decisor econômico", supportLevel: 70, email: "a@x.com" }),
    ]);
    expect(cheio.nivel).toBe(DEGRAUS);
  });

  it("conta sem contato não tem degrau nenhum", () => {
    expect(forcaDoRelacionamento([]).nivel).toBe(0);
    expect(forcaDoRelacionamento([]).leitura).toBe("Nenhum contato mapeado.");
  });

  it("barreira conhecida não tira degrau — o que tira é não ter aliado", () => {
    // Saber quem é contra vale mais do que não saber.
    const comBarreira = forcaDoRelacionamento([
      contato({ id: "1", relationshipRole: "Decisor econômico", supportLevel: 80, email: "a@x.com" }),
      contato({ id: "2", relationshipRole: "Compras", supportLevel: -70, email: "b@x.com" }),
    ]);
    expect(comBarreira.nivel).toBe(DEGRAUS);
    expect(comBarreira.leitura).toContain("1 barreira(s)");
  });

  it("a leitura diz o que falta, não só o número", () => {
    const semDecisor = forcaDoRelacionamento([contato({ id: "1", relationshipRole: "Usuário", email: "a@x.com" })]);
    expect(semDecisor.nivel).toBe(1);
    expect(semDecisor.leitura).toContain("nenhum decisor mapeado");
    expect(semDecisor.leitura).toContain("nenhum aliado identificado");
  });
});

describe("o mapa montado", () => {
  const contatos = [
    contato({ id: "1", name: "Ana Souza", title: "Gerente de Compras", relationshipRole: "Compras", supportLevel: 60, influence: 80, email: "ana@x.com" }),
    contato({ id: "2", name: "Bruno Lima", title: "Diretor de Logística", relationshipRole: "Decisor econômico", supportLevel: -40, influence: 90 }),
    contato({ id: "3", name: "Carla Dias", title: "Analista de Sustentabilidade", relationshipRole: "Sustentabilidade" }),
  ];

  it("agrupa por área e ordena por poder dentro da área", () => {
    const mapa = montarMapa(contatos);
    expect(mapa.areas.map((item) => item.area)).toEqual(["Compras", "ESG", "Logística"]);
    expect(mapa.total).toBe(3);
  });

  it("conta quantos há de cada posição", () => {
    expect(montarMapa(contatos).porPosicao).toEqual({ aliado: 1, neutro: 0, barreira: 1, desconhecido: 1 });
  });

  it("aponta o buraco do mapa, que é a parte acionável", () => {
    // Mostra onde a venda trava antes de travar.
    const semDecisor = montarMapa([contato({ id: "1", name: "Ana", relationshipRole: "Usuário", email: "a@x.com" })]);
    expect(semDecisor.lacunas).toContain("Nenhum contato com poder de decisão.");
    expect(semDecisor.lacunas).toContain("Compras / Procurement não mapeado.");
    expect(semDecisor.lacunas).toContain("Nenhum aliado identificado.");
  });

  it("contato inativo ou sem nome não entra no mapa", () => {
    const mapa = montarMapa([...contatos, contato({ id: "4", name: "Fantasma", active: false }), contato({ id: "5", name: "" })]);
    expect(mapa.total).toBe(3);
  });

  it("conta vazia devolve mapa vazio em vez de quebrar", () => {
    const vazio = montarMapa();
    expect(vazio.total).toBe(0);
    expect(vazio.areas).toEqual([]);
    expect(vazio.lacunas).toEqual(["Nenhum contato mapeado nesta conta."]);
  });

  it("cada nó carrega os canais da própria pessoa", () => {
    const [compras] = montarMapa(contatos).areas.find((item) => item.area === "Compras").contatos;
    expect(compras.nome).toBe("Ana Souza");
    expect(compras.canais.email).toBe("ana@x.com");
    expect(compras.canais.telefone).toBeNull();
  });
});
