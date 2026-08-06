import { describe, expect, it } from "vitest";
import {
  MODALIDADES,
  RECOMENDACOES,
  REGUA_PADRAO,
  RUBRICAS_SUGERIDAS,
  UNIDADES_CUSTO,
  avaliarViagem,
  custoDireto,
  custosFaltando,
  modalidadeValida,
  resumirViagens,
  volumeDaOperacao,
} from "./tripViabilityDomain.js";

// Os dois custos essenciais. Sem eles o motor se recusa a recomendar, então
// quase todo teste precisa deles.
const custosBasicos = (extra = []) => [
  { id: "combustivel", rotulo: "Combustível", unidade: "por_km", valor: 1.8 },
  { id: "motorista", rotulo: "Motorista", unidade: "por_viagem", valor: 320 },
  ...extra,
];

const spot = (extra = {}) => ({
  modalidade: "spot",
  kmPorViagem: 400,
  kmRetornoVazio: 0,
  horasPorViagem: 8,
  freteOferecido: 2200,
  ...extra,
});

describe("modalidade", () => {
  it("spot e recorrente têm rótulo e explicação", () => {
    for (const modalidade of Object.values(MODALIDADES)) {
      expect(modalidade.rotulo).toBeTruthy();
      expect(modalidade.descricao).toBeTruthy();
    }
  });

  it("modalidade desconhecida cai em spot, o caso mais conservador", () => {
    expect(modalidadeValida("qualquer")).toBe("spot");
    expect(modalidadeValida(undefined)).toBe("spot");
    expect(modalidadeValida("recorrente")).toBe("recorrente");
  });
});

describe("volume da operação", () => {
  it("spot é uma viagem quando nada for informado", () => {
    expect(volumeDaOperacao({ modalidade: "spot", kmPorViagem: 300 }).viagens).toBe(1);
  });

  it("recorrente multiplica viagens por mês pelos meses de contrato", () => {
    const v = volumeDaOperacao({
      modalidade: "recorrente",
      kmPorViagem: 100,
      viagensPorMes: 20,
      meses: 12,
    });
    expect(v.viagens).toBe(240);
    expect(v.kmCarregado).toBe(24000);
  });

  it("o retorno vazio entra no km rodado, não no km faturado", () => {
    const v = volumeDaOperacao({ kmPorViagem: 500, kmRetornoVazio: 500 });
    // Quem cota 500 km e roda 1000 paga o dobro do combustível.
    expect(v.kmCarregado).toBe(500);
    expect(v.kmTotal).toBe(1000);
    expect(v.percentVazio).toBe(50);
  });

  it("sem retorno vazio, nada de percentual fantasma", () => {
    expect(volumeDaOperacao({ kmPorViagem: 500 }).percentVazio).toBe(0);
  });

  it("retorno vazio negativo não vira desconto de km", () => {
    const v = volumeDaOperacao({ kmPorViagem: 500, kmRetornoVazio: -300 });
    expect(v.kmTotal).toBe(500);
  });
});

describe("custo direto", () => {
  const volume = volumeDaOperacao({ kmPorViagem: 400, kmRetornoVazio: 100, horasPorViagem: 8 });

  it("cada unidade incide sobre a base certa", () => {
    const r = custoDireto(
      [
        { id: "comb", rotulo: "Combustível", unidade: "por_km", valor: 2 },
        { id: "ped", rotulo: "Pedágio", unidade: "por_viagem", valor: 90 },
        { id: "aju", rotulo: "Ajudante", unidade: "por_hora", valor: 25 },
        { id: "seg", rotulo: "Seguro", unidade: "fixo", valor: 150 },
      ],
      volume,
      1000,
    );
    const porId = Object.fromEntries(r.itens.map((i) => [i.id, i]));
    // 500 km rodados (400 + 100 vazio) × 2
    expect(porId.comb.subtotal).toBe(1000);
    expect(porId.ped.subtotal).toBe(90);
    expect(porId.aju.subtotal).toBe(200);
    expect(porId.seg.subtotal).toBe(150);
  });

  it("km com carga é base diferente de km rodado", () => {
    const r = custoDireto(
      [{ id: "x", rotulo: "Por km com carga", unidade: "por_km_carregado", valor: 1 }],
      volume,
      0,
    );
    // 400 com carga, não os 500 rodados.
    expect(r.itens[0].subtotal).toBe(400);
  });

  it("percentual sobre o frete usa a receita, não o custo", () => {
    const r = custoDireto(
      [{ id: "gris", rotulo: "Seguro da carga", unidade: "percentual_receita", valor: 3 }],
      volume,
      5000,
    );
    expect(r.itens[0].subtotal).toBe(150);
  });

  it("unidade inventada vira valor fechado em vez de quebrar", () => {
    const r = custoDireto([{ id: "x", rotulo: "X", unidade: "por_lua", valor: 80 }], volume, 0);
    expect(r.itens[0].subtotal).toBe(80);
    expect(r.itens[0].unidade).toBe("fixo");
  });

  it("rubrica zerada não polui a lista", () => {
    const r = custoDireto([{ id: "x", rotulo: "X", unidade: "fixo", valor: 0 }], volume, 0);
    expect(r.itens).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it("o que mais pesa vem primeiro: é onde a negociação começa", () => {
    const r = custoDireto(
      [
        { id: "pequeno", rotulo: "Pequeno", unidade: "fixo", valor: 50 },
        { id: "grande", rotulo: "Grande", unidade: "fixo", valor: 900 },
      ],
      volume,
      0,
    );
    expect(r.itens[0].id).toBe("grande");
  });

  it("cada rubrica carrega a conta escrita", () => {
    const r = custoDireto(
      [{ id: "comb", rotulo: "Combustível", unidade: "por_km", valor: 2 }],
      volume,
      0,
    );
    expect(r.itens[0].memoria).toMatch(/2 × 500/);
  });

  it("toda unidade sugerida existe no catálogo de unidades", () => {
    for (const rubrica of RUBRICAS_SUGERIDAS) {
      expect(UNIDADES_CUSTO[rubrica.unidade]).toBeTruthy();
    }
  });
});

describe("custos essenciais", () => {
  it("aponta combustível e motorista quando faltam", () => {
    const faltando = custosFaltando([{ id: "pedagio", unidade: "por_viagem", valor: 90 }]);
    expect(faltando.map((f) => f.id)).toEqual(["combustivel", "motorista"]);
  });

  it("rubrica com valor zero conta como não informada", () => {
    const faltando = custosFaltando([
      { id: "combustivel", unidade: "por_km", valor: 0 },
      { id: "motorista", unidade: "por_viagem", valor: 300 },
    ]);
    expect(faltando.map((f) => f.id)).toEqual(["combustivel"]);
  });

  it("com os dois lançados, não sobra pendência", () => {
    expect(custosFaltando(custosBasicos())).toEqual([]);
  });
});

describe("margem calculada", () => {
  it("a margem sai da conta, não de um campo digitado", () => {
    const a = avaliarViagem(spot(), custosBasicos());
    // custo direto = 1,8 × 400 + 320 = 1040
    expect(a.economia.custoDireto).toBe(1040);
    // encargos sobre o custo direto, pela régua padrão
    expect(a.economia.encargos.total).toBeGreaterThan(0);
    expect(a.economia.custoCarregado).toBeGreaterThan(a.economia.custoDireto);
    // resultado = frete − custo carregado − comissão
    expect(a.economia.resultado).toBe(
      Number(
        (
          a.economia.receitaBruta -
          a.economia.custoCarregado -
          a.economia.comissao
        ).toFixed(2),
      ),
    );
  });

  it("a comissão incide sobre o frete, não sobre o custo", () => {
    const a = avaliarViagem(spot({ freteOferecido: 2000 }), custosBasicos());
    expect(a.economia.comissao).toBe(
      Number(((2000 * REGUA_PADRAO.commissionPercent) / 100).toFixed(2)),
    );
  });

  it("recorrente cobra o frete por viagem, multiplicado pelo volume", () => {
    const a = avaliarViagem(
      {
        modalidade: "recorrente",
        kmPorViagem: 100,
        viagensPorMes: 20,
        meses: 6,
        freteOferecido: 500,
      },
      custosBasicos(),
    );
    expect(a.volume.viagens).toBe(120);
    expect(a.economia.receitaBruta).toBe(60000);
  });

  it("contrato fechado por valor global não multiplica o frete", () => {
    const a = avaliarViagem(
      {
        modalidade: "recorrente",
        kmPorViagem: 100,
        viagensPorMes: 20,
        meses: 6,
        freteOferecido: 60000,
        fretePorViagem: false,
      },
      custosBasicos(),
    );
    expect(a.economia.receitaBruta).toBe(60000);
  });

  it("devolve o preço mínimo e o alvo, por viagem também", () => {
    const a = avaliarViagem(
      { modalidade: "recorrente", kmPorViagem: 100, viagensPorMes: 10, meses: 2, freteOferecido: 400 },
      custosBasicos(),
    );
    expect(a.economia.precoMinimoPorViagem).toBe(
      Number((a.economia.precoMinimo / 20).toFixed(2)),
    );
  });

  it("o preço mínimo realmente entrega a margem mínima", () => {
    const a = avaliarViagem(spot(), custosBasicos());
    const noPiso = avaliarViagem(
      spot({ freteOferecido: a.economia.precoMinimo }),
      custosBasicos(),
    );
    expect(noPiso.economia.margemPercent).toBeCloseTo(REGUA_PADRAO.minimumMarginPercent, 0);
  });

  it("o preço alvo realmente entrega a margem alvo", () => {
    const a = avaliarViagem(spot(), custosBasicos());
    const noAlvo = avaliarViagem(
      spot({ freteOferecido: a.economia.precoAlvo }),
      custosBasicos(),
    );
    expect(noAlvo.economia.margemPercent).toBeCloseTo(REGUA_PADRAO.targetMarginPercent, 0);
  });

  it("guarda a versão da régua que decidiu", () => {
    const a = avaliarViagem(spot(), custosBasicos(), { ...REGUA_PADRAO, versao: "v2.2027" });
    expect(a.economia.versaoRegua).toBe("v2.2027");
  });
});

describe("recomendação", () => {
  it("frete acima do alvo: aceitar", () => {
    const base = avaliarViagem(spot(), custosBasicos());
    const bom = avaliarViagem(
      spot({ freteOferecido: base.economia.precoAlvo * 1.2 }),
      custosBasicos(),
    );
    expect(bom.recomendacao).toBe(RECOMENDACOES.aceitar);
    expect(bom.acao).toMatch(/aceite/i);
  });

  it("entre o piso e o alvo: aceitar com ressalva, dizendo quanto pedir", () => {
    const base = avaliarViagem(spot(), custosBasicos());
    const meio = (base.economia.precoMinimo + base.economia.precoAlvo) / 2;
    const a = avaliarViagem(spot({ freteOferecido: meio }), custosBasicos());
    expect(a.recomendacao).toBe(RECOMENDACOES.ressalva);
    expect(a.acao).toMatch(/R\$/);
  });

  it("abaixo do piso: recusar, com contraproposta em reais", () => {
    const base = avaliarViagem(spot(), custosBasicos());
    const a = avaliarViagem(
      spot({ freteOferecido: base.economia.precoMinimo * 0.85 }),
      custosBasicos(),
    );
    expect(a.recomendacao).toBe(RECOMENDACOES.recusar);
    // Recusa sem contraproposta não fecha negócio.
    expect(a.acao).toMatch(/Peça R\$/);
    expect(a.economia.faltaParaOPiso).toBeGreaterThan(0);
  });

  it("prejuízo: recusar dizendo quanto se perde", () => {
    const a = avaliarViagem(spot({ freteOferecido: 300 }), custosBasicos());
    expect(a.recomendacao).toBe(RECOMENDACOES.recusar);
    expect(a.economia.resultado).toBeLessThan(0);
    expect(a.motivo).toMatch(/prejuízo/i);
  });

  it("sem custo lançado, não recomenda nada", () => {
    const a = avaliarViagem(spot(), []);
    expect(a.recomendacao).toBe(RECOMENDACOES.semDados);
    expect(a.motivo).toMatch(/nenhum custo/i);
  });

  it("sem frete informado, não recomenda nada", () => {
    const a = avaliarViagem(spot({ freteOferecido: 0 }), custosBasicos());
    expect(a.recomendacao).toBe(RECOMENDACOES.semDados);
    expect(a.motivo).toMatch(/valor oferecido/i);
  });

  it("custo essencial faltando não vira 'aceitar' com margem inflada", () => {
    // Só pedágio lançado: a margem sairia altíssima e a viagem daria prejuízo.
    const a = avaliarViagem(spot(), [
      { id: "pedagio", rotulo: "Pedágio", unidade: "por_viagem", valor: 90 },
    ]);
    expect(a.recomendacao).toBe(RECOMENDACOES.semDados);
    expect(a.motivo).toMatch(/combustível/i);
    expect(a.acao).toMatch(/motorista/i);
  });

  it("contrato recorrente aprovado lembra de confirmar a frota", () => {
    const base = avaliarViagem(
      { modalidade: "recorrente", kmPorViagem: 100, viagensPorMes: 20, meses: 6, freteOferecido: 500 },
      custosBasicos(),
    );
    const bom = avaliarViagem(
      {
        modalidade: "recorrente",
        kmPorViagem: 100,
        viagensPorMes: 20,
        meses: 6,
        freteOferecido: (base.economia.precoAlvo / 120) * 1.3,
      },
      custosBasicos(),
    );
    expect(bom.recomendacao).toBe(RECOMENDACOES.aceitar);
    expect(bom.acao).toMatch(/capacidade|frota/i);
  });
});

describe("ressalvas", () => {
  it("retorno vazio alto vira alerta de buscar carga de retorno", () => {
    const a = avaliarViagem(spot({ kmRetornoVazio: 400, freteOferecido: 4000 }), custosBasicos());
    const alerta = a.ressalvas.find((r) => /retorno vazio/i.test(r.texto));
    expect(alerta.gravidade).toBe("alta");
    expect(alerta.texto).toMatch(/carga de retorno/i);
  });

  it("prazo longo de pagamento é dito sem inventar custo financeiro", () => {
    const a = avaliarViagem(spot({ prazoPagamentoDias: 60 }), custosBasicos());
    const alerta = a.ressalvas.find((r) => /60 dias/.test(r.texto));
    expect(alerta).toBeTruthy();
    // Sem taxa de capital cadastrada, não se fabrica um desconto.
    expect(alerta.texto).toMatch(/não desconta custo de capital/i);
  });

  it("contrato que não cabe na frota é alertado", () => {
    const a = avaliarViagem(
      {
        modalidade: "recorrente",
        kmPorViagem: 100,
        viagensPorMes: 220,
        meses: 6,
        freteOferecido: 900,
        veiculosDisponiveis: 3,
      },
      custosBasicos(),
    );
    expect(a.ressalvas.some((r) => /veículo/i.test(r.texto) && r.gravidade === "alta")).toBe(true);
  });

  it("as mais graves vêm primeiro", () => {
    const a = avaliarViagem(
      spot({ kmRetornoVazio: 400, prazoPagamentoDias: 60, freteOferecido: 4000 }),
      custosBasicos(),
    );
    const gravidades = a.ressalvas.map((r) => r.gravidade);
    expect(gravidades.indexOf("alta")).toBeLessThan(gravidades.indexOf("media"));
  });

  it("viagem limpa não gera ressalva inventada", () => {
    const base = avaliarViagem(spot(), custosBasicos());
    const a = avaliarViagem(
      spot({ freteOferecido: base.economia.precoAlvo * 1.3 }),
      custosBasicos(),
    );
    expect(a.ressalvas).toEqual([]);
  });
});

describe("consolidado", () => {
  const carteira = () => {
    const base = avaliarViagem(spot(), custosBasicos());
    return [
      avaliarViagem(spot({ freteOferecido: base.economia.precoAlvo * 1.2 }), custosBasicos()),
      avaliarViagem(spot({ freteOferecido: base.economia.precoMinimo * 0.8 }), custosBasicos()),
      avaliarViagem(spot(), []),
    ];
  };

  it("separa o que rendeu do que foi recusado", () => {
    const r = resumirViagens(carteira());
    expect(r.avaliadas).toBe(3);
    expect(r.recomendadas).toBe(1);
    expect(r.recusadas).toBe(1);
    expect(r.freteRecusado).toBeGreaterThan(0);
  });

  it("conta as que ainda não dá para decidir como fila de trabalho", () => {
    expect(resumirViagens(carteira()).semDados).toBe(1);
  });

  it("a margem média sai só do que foi recomendado", () => {
    const r = resumirViagens(carteira());
    expect(r.margemMediaPercent).toBeGreaterThan(0);
  });

  it("carteira vazia devolve zeros, não NaN", () => {
    expect(resumirViagens([])).toMatchObject({
      avaliadas: 0,
      recomendadas: 0,
      recusadas: 0,
      receita: 0,
      margemMediaPercent: 0,
    });
  });
});
