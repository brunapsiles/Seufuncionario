import { describe, expect, it } from "vitest";
import {
  custoMedioPonderado,
  divergenciaDeContagem,
  isMovementKind,
  itensAbaixoDoMinimo,
  movementSigned,
  ordenarPorOcorrencia,
  resumoDaContagem,
  saldoDoItem,
  saldoPorItem,
  saldoPorItemEDeposito,
  situacaoDoEstoque,
  validateMovement,
  validateTransfer,
  valorDoEstoque,
} from "./stockDomain.js";

const mov = (kind, quantity, extra = {}) => ({
  id: extra.id || `${kind}-${quantity}-${extra.occurredAt || ""}`,
  itemId: extra.itemId || "pneu",
  warehouseId: extra.warehouseId || "matriz",
  kind,
  quantity,
  unitCost: extra.unitCost ?? 0,
  occurredAt: extra.occurredAt || "2026-01-01",
  createdAt: extra.createdAt || "2026-01-01T00:00:00.000Z",
});

describe("sinal do movimento", () => {
  it("entrada e ajuste positivo somam; saída e ajuste negativo subtraem", () => {
    expect(movementSigned(mov("entrada", 10))).toBe(10);
    expect(movementSigned(mov("ajuste_entrada", 3))).toBe(3);
    expect(movementSigned(mov("saida", 4))).toBe(-4);
    expect(movementSigned(mov("ajuste_saida", 2))).toBe(-2);
  });

  it("quantidade negativa não inverte o sinal do tipo", () => {
    // Sem o Math.abs, uma saída de -5 viraria entrada de 5.
    expect(movementSigned(mov("saida", -5))).toBe(-5);
    expect(movementSigned(mov("entrada", -5))).toBe(5);
  });

  it("tipo desconhecido conta zero, nunca como entrada", () => {
    // Melhor um saldo visivelmente baixo do que um silenciosamente inflado.
    expect(movementSigned({ kind: "inventado", quantity: 99 })).toBe(0);
    expect(movementSigned({})).toBe(0);
    expect(isMovementKind("inventado")).toBe(false);
    expect(isMovementKind("entrada")).toBe(true);
  });
});

describe("saldo", () => {
  const movimentos = [
    mov("entrada", 10),
    mov("saida", 4),
    mov("entrada", 5, { itemId: "oleo" }),
    mov("entrada", 7, { warehouseId: "filial" }),
  ];

  it("soma por item, atravessando depósitos", () => {
    const saldos = saldoPorItem(movimentos);
    expect(saldos.get("pneu")).toBe(13);
    expect(saldos.get("oleo")).toBe(5);
  });

  it("separa por depósito, porque peça na cidade errada não resolve", () => {
    const saldos = saldoPorItemEDeposito(movimentos);
    expect(saldos.get("pneu|matriz")).toBe(6);
    expect(saldos.get("pneu|filial")).toBe(7);
  });

  it("saldoDoItem responde com e sem depósito", () => {
    expect(saldoDoItem(movimentos, "pneu")).toBe(13);
    expect(saldoDoItem(movimentos, "pneu", "filial")).toBe(7);
    expect(saldoDoItem(movimentos, "inexistente")).toBe(0);
  });

  it("ignora movimento sem item ou sem depósito em vez de somar em chave vazia", () => {
    const saldos = saldoPorItem([...movimentos, { kind: "entrada", quantity: 100 }]);
    expect(saldos.get("")).toBeUndefined();
    expect(saldos.get("pneu")).toBe(13);
  });

  it("aceita saldo negativo no cálculo — ele denuncia lançamento faltando", () => {
    // Zerar por baixo aqui esconderia o erro; quem barra a saída é o servidor.
    expect(saldoDoItem([mov("saida", 3)], "pneu")).toBe(-3);
  });
});

describe("ordem cronológica", () => {
  it("ordena pelo que aconteceu, não pelo que foi digitado", () => {
    const lista = [
      mov("entrada", 1, { id: "b", occurredAt: "2026-03-01", createdAt: "2026-01-01T00:00:00.000Z" }),
      mov("entrada", 1, { id: "a", occurredAt: "2026-01-15", createdAt: "2026-05-01T00:00:00.000Z" }),
    ];
    expect(ordenarPorOcorrencia(lista).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("desempata por registro e depois por id, para ser determinístico", () => {
    const lista = [
      mov("entrada", 1, { id: "z", occurredAt: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z" }),
      mov("entrada", 1, { id: "a", occurredAt: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(ordenarPorOcorrencia(lista).map((m) => m.id)).toEqual(["a", "z"]);
  });
});

describe("custo médio móvel", () => {
  it("média ponderada de duas entradas com preços diferentes", () => {
    // 10 a 100 e 10 a 200 → 150.
    const movimentos = [
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("entrada", 10, { unitCost: 200, occurredAt: "2026-02-01" }),
    ];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(150);
  });

  it("a saída consome pela média vigente e NÃO altera a média", () => {
    // Se a saída mudasse a média, o custo passaria a depender de quando se
    // vendeu, não de quanto se pagou.
    const movimentos = [
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("entrada", 10, { unitCost: 200, occurredAt: "2026-02-01" }),
      mov("saida", 5, { occurredAt: "2026-03-01" }),
    ];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(150);
  });

  it("entrada retroativa entra na ordem certa", () => {
    // A entrada barata foi digitada depois, mas aconteceu antes.
    const movimentos = [
      mov("entrada", 10, { unitCost: 200, occurredAt: "2026-02-01", createdAt: "2026-02-01T00:00:00.000Z" }),
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01", createdAt: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(150);
  });

  it("devolve null quando nunca houve entrada, não zero", () => {
    // Zero é custo legítimo (doação, brinde) e não pode se confundir com
    // "nunca comprei isto".
    expect(custoMedioPonderado([], "pneu")).toBeNull();
    expect(custoMedioPonderado([mov("saida", 3)], "pneu")).toBeNull();
  });

  it("saldo zerado devolve 0 e a entrada seguinte não herda custo infinito", () => {
    const zerado = [
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("saida", 10, { occurredAt: "2026-02-01" }),
    ];
    expect(custoMedioPonderado(zerado, "pneu")).toBe(0);

    const recomprado = [...zerado, mov("entrada", 5, { unitCost: 300, occurredAt: "2026-03-01" })];
    expect(custoMedioPonderado(recomprado, "pneu")).toBe(300);
  });

  it("saída maior que o saldo não deixa valor residual preso", () => {
    const movimentos = [
      mov("entrada", 5, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("saida", 8, { occurredAt: "2026-02-01" }),
      mov("entrada", 2, { unitCost: 400, occurredAt: "2026-03-01" }),
    ];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(400);
  });

  it("ignora custo negativo em vez de subtrair do valor do estoque", () => {
    const movimentos = [mov("entrada", 10, { unitCost: -50, occurredAt: "2026-01-01" })];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(0);
  });

  it("ajuste positivo sem custo dilui a média, o que é o comportamento correto", () => {
    // Sobra encontrada em contagem não tem nota; entra a custo zero e baixa a
    // média — o estoque não pode ganhar valor por causa de um acerto de conta.
    const movimentos = [
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("ajuste_entrada", 10, { occurredAt: "2026-02-01" }),
    ];
    expect(custoMedioPonderado(movimentos, "pneu")).toBe(50);
  });
});

describe("valor do estoque", () => {
  it("saldo × custo médio", () => {
    const movimentos = [
      mov("entrada", 10, { unitCost: 100, occurredAt: "2026-01-01" }),
      mov("saida", 4, { occurredAt: "2026-02-01" }),
    ];
    expect(valorDoEstoque(movimentos, "pneu")).toBe(600);
  });

  it("null quando o custo é desconhecido, para a tela não escrever R$ 0,00", () => {
    expect(valorDoEstoque([mov("ajuste_entrada", 5)], "pneu")).toBe(0);
    expect(valorDoEstoque([], "pneu")).toBeNull();
  });
});

describe("ruptura e reposição", () => {
  const itens = [
    { id: "pneu", nome: "Pneu 295/80", unidade: "UN", estoqueMinimo: 4 },
    { id: "oleo", nome: "Óleo 15W40", unidade: "L", estoqueMinimo: 20 },
    { id: "filtro", nome: "Filtro de ar", unidade: "UN", estoqueMinimo: 2 },
  ];
  const movimentos = [
    mov("entrada", 10, { itemId: "pneu" }),
    mov("entrada", 15, { itemId: "oleo" }),
  ];

  it("classifica sem estoque, baixo e normal a partir do saldo derivado", () => {
    const { rows } = situacaoDoEstoque(itens, movimentos);
    expect(rows.find((r) => r.id === "pneu").status).toBe("normal");
    expect(rows.find((r) => r.id === "oleo").status).toBe("baixo");
    expect(rows.find((r) => r.id === "filtro").status).toBe("sem_estoque");
  });

  it("conta os agregados e leva a unidade junto do número", () => {
    const saude = situacaoDoEstoque(itens, movimentos);
    expect(saude.outOfStock).toBe(1);
    expect(saude.lowStock).toBe(1);
    expect(saude.healthy).toBe(1);
    // "12" sem unidade não é resposta para "quanto tem?".
    expect(saude.rows.find((r) => r.id === "oleo").unidade).toBe("L");
  });

  it("sugere reposição só para quem está fora do normal", () => {
    const fora = itensAbaixoDoMinimo(itens, movimentos).map((r) => r.id);
    expect(fora).toEqual(expect.arrayContaining(["oleo", "filtro"]));
    expect(fora).not.toContain("pneu");
  });
});

describe("contagem de inventário", () => {
  it("calcula a divergência e o ajuste com o sinal oposto à falta", () => {
    const linhas = [
      { itemId: "a", contado: 12, saldoSistema: 10 },
      { itemId: "b", contado: 7, saldoSistema: 9 },
      { itemId: "c", contado: 5, saldoSistema: 5 },
    ];
    const divergencias = divergenciaDeContagem(linhas);
    expect(divergencias[0]).toMatchObject({ diferenca: 2, ajuste: { kind: "ajuste_entrada", quantity: 2 } });
    expect(divergencias[1]).toMatchObject({ diferenca: -2, ajuste: { kind: "ajuste_saida", quantity: 2 } });
    expect(divergencias[2].ajuste).toBeNull();
  });

  it("linha sem contagem informada é pendente, nunca zero contado", () => {
    // Tratar "não contei" como "contei e não tinha" zeraria o estoque de todo
    // item que ficou de fora da contagem.
    const linhas = [
      { itemId: "a", contado: 10, saldoSistema: 10 },
      { itemId: "b", contado: null, saldoSistema: 8 },
      { itemId: "c", contado: "", saldoSistema: 4 },
      { itemId: "d", saldoSistema: 3 },
    ];
    expect(divergenciaDeContagem(linhas)).toHaveLength(1);
    expect(resumoDaContagem(linhas)).toMatchObject({ contadas: 1, pendentes: 3, divergentes: 0 });
  });

  it("contado zero é uma contagem de verdade", () => {
    const linhas = [{ itemId: "a", contado: 0, saldoSistema: 6 }];
    const resumo = resumoDaContagem(linhas);
    expect(resumo.contadas).toBe(1);
    expect(resumo.faltas).toBe(1);
    expect(resumo.ajustes).toEqual([{ itemId: "a", kind: "ajuste_saida", quantity: 6 }]);
  });

  it("resume sobras e faltas", () => {
    const resumo = resumoDaContagem([
      { itemId: "a", contado: 12, saldoSistema: 10 },
      { itemId: "b", contado: 7, saldoSistema: 9 },
      { itemId: "c", contado: 5, saldoSistema: 5 },
    ]);
    expect(resumo).toMatchObject({ contadas: 3, pendentes: 0, divergentes: 2, sobras: 1, faltas: 1 });
    expect(resumo.ajustes).toHaveLength(2);
  });
});

describe("validação", () => {
  it("movimento exige material, depósito, tipo, quantidade e data", () => {
    const ok = { itemId: "a", warehouseId: "m", kind: "entrada", quantity: 1, occurredAt: "2026-01-01" };
    expect(validateMovement(ok)).toBe("");
    expect(validateMovement({ ...ok, itemId: "" })).toMatch(/material/i);
    expect(validateMovement({ ...ok, warehouseId: "" })).toMatch(/depósito/i);
    expect(validateMovement({ ...ok, kind: "outro" })).toMatch(/entrada/i);
    expect(validateMovement({ ...ok, quantity: 0 })).toMatch(/maior que zero/i);
    expect(validateMovement({ ...ok, occurredAt: "" })).toMatch(/data/i);
  });

  it("movimento recusa custo negativo", () => {
    const ok = { itemId: "a", warehouseId: "m", kind: "entrada", quantity: 1, occurredAt: "2026-01-01" };
    expect(validateMovement({ ...ok, unitCost: -1 })).toMatch(/negativo/i);
  });

  it("transferência exige depósitos diferentes", () => {
    const ok = { itemId: "a", fromWarehouseId: "m", toWarehouseId: "f", quantity: 2 };
    expect(validateTransfer(ok)).toBe("");
    expect(validateTransfer({ ...ok, toWarehouseId: "m" })).toMatch(/diferentes/i);
    expect(validateTransfer({ ...ok, quantity: 0 })).toMatch(/maior que zero/i);
  });
});
