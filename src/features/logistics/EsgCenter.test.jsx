/* @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EsgCenter from "./EsgCenter.jsx";

// A Central ESG não calcula no navegador: ela manda calcular e o servidor grava
// com memória. Estes testes garantem que a tela não faz conta por conta própria
// e que o que ela mostra veio do registro auditável.

const resposta = (dados, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(dados) });

const fatores = {
  versao: "2026.1",
  vigenciaInicio: "2026-01-01",
  responsavel: "Sustentabilidade",
  fatores: {
    diesel_b10_kgco2e_por_litro: {
      valor: 2.68,
      unidade: "kgCO2e/L",
      fonte: "Inventário nacional",
    },
  },
};

const pesos = {
  versao: "v1.2026",
  pesos: { reducaoEmissoes: 40, ocupacao: 20, eficienciaEnergetica: 15, qualidadeDados: 15, ocorrencias: 10 },
  metodologia: "Média ponderada de cinco componentes.",
  responsavel: "Sustentabilidade",
};

const historico = {
  historico: [
    {
      score: 78.4,
      versaoPesos: "v1.2026",
      qualidadeDados: 88,
      explicacaoVariacao: "O score caiu 3 ponto(s). Ocupação puxou para baixo 2 ponto(s).",
      calculadoEm: "2026-08-01T00:00:00.000Z",
      componentes: {},
    },
  ],
  benchmark: { posicao: 60, total: 4, mediana: 70, texto: "Acima de 60% dos escopos comparáveis." },
};

const montarFetch = (extra = {}) =>
  vi.fn((url, opcoes) => {
    const texto = String(url);
    if (texto.includes("/clients")) return resposta({ clientes: [{ id: "c1", name: "Cliente A" }] });
    if (texto.includes("/esg/fatores")) return resposta({ fatores, pesos });
    if (texto.includes("/esg/historico")) return resposta(extra.historico ?? historico);
    if (texto.includes("/esg/calcular"))
      return extra.calcular
        ? extra.calcular(opcoes)
        : resposta({
            greenScore: { valor: 81.2, versaoPesos: "v1.2026", componentes: {}, ressalva: "Não é certificação." },
            calculos: [{ id: "x", impacto: { co2AvoidedKg: 100 } }],
            variacao: { texto: "O score subiu 3 ponto(s)." },
          });
    return resposta({}, false);
  });

const authHeaders = () => ({ authorization: "Bearer t" });

beforeEach(() => {
  vi.stubGlobal("localStorage", { getItem: () => "t", setItem: () => {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Central ESG", () => {
  it("mostra a régua em vigor com a versão e o total", async () => {
    vi.stubGlobal("fetch", montarFetch());
    render(<EsgCenter authHeaders={authHeaders} />);
    expect(await screen.findByText("v1.2026")).toBeTruthy();
    expect(screen.getByText(/Somam 100%/)).toBeTruthy();
  });

  it("explica que mudar peso não reescreve o histórico", async () => {
    vi.stubGlobal("fetch", montarFetch());
    render(<EsgCenter authHeaders={authHeaders} />);
    await screen.findByText("v1.2026");
    expect(screen.getByText(/não muda de forma retroativa/i)).toBeTruthy();
  });

  it("lista cada fator com fonte e unidade", async () => {
    vi.stubGlobal("fetch", montarFetch());
    render(<EsgCenter authHeaders={authHeaders} />);
    await screen.findByText("Inventário nacional");
    expect(screen.getByText("kgCO2e/L")).toBeTruthy();
  });

  it("mostra o histórico com a explicação de cada variação", async () => {
    vi.stubGlobal("fetch", montarFetch());
    render(<EsgCenter authHeaders={authHeaders} />);
    expect(await screen.findByText(/Ocupação puxou para baixo/)).toBeTruthy();
    expect(screen.getByText(/Acima de 60%/)).toBeTruthy();
  });

  it("sem score calculado, convida a calcular em vez de mostrar zero", async () => {
    vi.stubGlobal(
      "fetch",
      montarFetch({ historico: { historico: [], benchmark: { texto: "Ainda não há base." } } }),
    );
    render(<EsgCenter authHeaders={authHeaders} />);
    expect(
      await screen.findByText(/Nenhum Green Score calculado para este cliente/),
    ).toBeTruthy();
  });

  it("manda calcular no servidor, com a origem do dado junto", async () => {
    let corpo = null;
    const fetchMock = montarFetch({
      calcular: (opcoes) => {
        corpo = JSON.parse(opcoes.body);
        return resposta({
          greenScore: { valor: 81.2, versaoPesos: "v1", componentes: {}, ressalva: "" },
          calculos: [],
          variacao: { texto: "" },
        });
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    const setToast = vi.fn();
    render(<EsgCenter authHeaders={authHeaders} setToast={setToast} />);
    await screen.findByText("v1.2026");

    screen.getByRole("button", { name: /Calcular e gravar/ }).click();

    await waitFor(() => expect(corpo).toBeTruthy());
    // A origem do dado vai junto: é ela que define a qualidade, e qualidade
    // baixa muda o que o relatório pode afirmar.
    expect(corpo.operacoes[0].origens.distancia).toBeTruthy();
    expect(corpo.clienteId).toBe("c1");
    await waitFor(() => expect(setToast).toHaveBeenCalled());
    expect(setToast.mock.calls[0][0]).toMatch(/memória de cálculo/i);
  });

  it("deixa claro que o indicador não é certificação", async () => {
    vi.stubGlobal("fetch", montarFetch());
    render(<EsgCenter authHeaders={authHeaders} />);
    await screen.findByText("v1.2026");
    expect(screen.getByText(/não constituem certificação/i)).toBeTruthy();
  });

  it("erro do servidor vira aviso, não tela em branco", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => resposta({ error: "Sem permissão para ver os fatores." }, false)),
    );
    render(<EsgCenter authHeaders={authHeaders} />);
    await waitFor(() =>
      expect(screen.getByText(/Sem permissão para ver os fatores/)).toBeTruthy(),
    );
  });
});
