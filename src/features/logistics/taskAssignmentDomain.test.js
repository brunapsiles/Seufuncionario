import { describe, expect, it } from "vitest";
import { MOTIVOS, encontrarPessoa, pessoasAtribuiveis, resolverResponsavel } from "./taskAssignmentDomain.js";

const membros = [
  { userId: "u1", name: "Ana Souza", email: "Ana@Empresa.com" },
  { userId: "u2", name: "Bruno Lima", email: "bruno@empresa.com" },
];
const vendedores = [{ email: "bruno@empresa.com" }, { email: "carla@parceira.com" }];

describe("quem pode receber tarefa", () => {
  it("junta membros do espaço e vendedores da carteira, sem repetir", () => {
    const pessoas = pessoasAtribuiveis({ membros, vendedores });
    expect(pessoas.map((item) => item.email)).toEqual(["ana@empresa.com", "bruno@empresa.com", "carla@parceira.com"]);
  });

  it("quem é membro e vendedor mantém o id, que é o que permite notificar", () => {
    const bruno = pessoasAtribuiveis({ membros, vendedores }).find((item) => item.email === "bruno@empresa.com");
    expect(bruno.userId).toBe("u2");
    expect(bruno.origens).toEqual(["membro", "carteira"]);
  });

  it("vendedor sem cadastro de usuário entra assim mesmo, só sem id", () => {
    const carla = pessoasAtribuiveis({ membros, vendedores }).find((item) => item.email === "carla@parceira.com");
    expect(carla.userId).toBe("");
    expect(carla.nome).toBe("carla@parceira.com");
  });

  it("aguenta listas vazias ou ausentes", () => {
    expect(pessoasAtribuiveis()).toEqual([]);
    expect(pessoasAtribuiveis({ membros: [{ name: "Sem e-mail" }] })).toEqual([]);
  });
});

describe("encontrar a pessoa", () => {
  const pessoas = pessoasAtribuiveis({ membros, vendedores });
  it("acha por e-mail, id ou nome, sem se importar com caixa", () => {
    expect(encontrarPessoa(pessoas, "ANA@empresa.com").userId).toBe("u1");
    expect(encontrarPessoa(pessoas, "u2").email).toBe("bruno@empresa.com");
    expect(encontrarPessoa(pessoas, "ana souza").userId).toBe("u1");
  });
  it("não aproxima quem não existe", () => {
    expect(encontrarPessoa(pessoas, "Anna")).toBeNull();
    expect(encontrarPessoa(pessoas, "")).toBeNull();
  });
});

describe("a quem a tarefa vai", () => {
  const pessoas = pessoasAtribuiveis({ membros, vendedores });
  const criador = { userId: "u1", email: "ana@empresa.com", name: "Ana Souza" };

  it("sem responsável informado, vai para o dono da conta na carteira", () => {
    // Este é o defeito que originou o módulo: a tarefa ia sempre para quem
    // pediu, e o vendedor da conta a encontrava no nome de outra pessoa.
    const resultado = resolverResponsavel({ vendedoresDaConta: [{ email: "bruno@empresa.com" }], criador, pessoas });
    expect(resultado.label).toBe("Bruno Lima");
    expect(resultado.userId).toBe("u2");
    expect(resultado.motivo).toBe(MOTIVOS.carteira);
  });

  it("o responsável escolhido explicitamente ganha do dono da conta", () => {
    const resultado = resolverResponsavel({
      informado: "ana@empresa.com",
      vendedoresDaConta: [{ email: "bruno@empresa.com" }],
      criador,
      pessoas,
    });
    expect(resultado.userId).toBe("u1");
    expect(resultado.motivo).toBe(MOTIVOS.informado);
  });

  it("nome que não existe não vira responsável de mentira", () => {
    // Gravar texto que não aponta para ninguém é exatamente como a
    // atribuição se perdia antes: a tarefa parecia atribuída e não estava.
    const resultado = resolverResponsavel({ informado: "Fulano de Tal", criador, pessoas });
    expect(resultado.resolvido).toBe(false);
    expect(resultado.userId).toBe("");
    expect(resultado.motivo).toBe(MOTIVOS.naoResolvido);
    expect(resultado.informado).toBe("Fulano de Tal");
  });

  it("conta sem vendedor cai em quem criou, e diz isso", () => {
    const resultado = resolverResponsavel({ vendedoresDaConta: [], criador, pessoas });
    expect(resultado.userId).toBe("u1");
    expect(resultado.motivo).toBe(MOTIVOS.criador);
  });

  it("vendedor da carteira fora do espaço ainda é o dono da conta", () => {
    // Ele não tem id para notificar, mas continua sendo a resposta certa.
    const resultado = resolverResponsavel({ vendedoresDaConta: [{ email: "carla@parceira.com" }], criador, pessoas });
    expect(resultado.label).toBe("carla@parceira.com");
    expect(resultado.resolvido).toBe(true);
    expect(resultado.motivo).toBe(MOTIVOS.carteira);
  });

  it("sem ninguém atribuível, a tarefa fica em aberto em vez de mentir", () => {
    const resultado = resolverResponsavel({ pessoas: [] });
    expect(resultado.resolvido).toBe(false);
    expect(resultado.motivo).toBe(MOTIVOS.semNinguem);
  });

  it("todo caminho devolve um motivo legível", () => {
    for (const motivo of Object.values(MOTIVOS)) expect(motivo.length).toBeGreaterThan(20);
  });
});
