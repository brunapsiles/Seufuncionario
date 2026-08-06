/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TripViabilityPage from "./TripViabilityPage.jsx";

afterEach(cleanup);

const authHeaders = () => ({ authorization: "Bearer teste" });

const comRegua = (parametros = null) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            parametros
              ? { atual: { versao: "v9.2030", parametros } }
              : {},
          ),
      }),
    ),
  );
};

const abrir = () => render(<TripViabilityPage authHeaders={authHeaders} />);

const preencher = (rotulo, valor) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: String(valor) } });

// Os dois custos sem os quais o motor se recusa a recomendar.
const lancarCustosEssenciais = () => {
  preencher("Valor de Combustível ou energia", 1.8);
  preencher("Valor de Motorista", 320);
};

describe("aceito esta viagem?", () => {
  it("tela em branco pede o frete antes de qualquer outra coisa", () => {
    comRegua();
    abrir();
    expect(screen.getByText("Faltam dados")).toBeInTheDocument();
    expect(screen.getByText(/valor oferecido pelo frete/i)).toBeInTheDocument();
  });

  it("com frete mas sem custo, não arrisca uma recomendação", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    expect(screen.getByText("Faltam dados")).toBeInTheDocument();
    expect(screen.getByText(/Nenhum custo informado/i)).toBeInTheDocument();
  });

  it("custo essencial faltando aparece nomeado, não como erro genérico", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    preencher("Valor de Pedágio", 90);

    expect(screen.getByText("Faltam dados")).toBeInTheDocument();
    expect(screen.getByText(/Falta lançar: Combustível ou energia/)).toBeInTheDocument();
    expect(screen.getByText(/Falta lançar: Motorista/)).toBeInTheDocument();
  });

  it("com custo e frete, recomenda e mostra a margem calculada", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    // 2200 de frete contra 1040 de custo direto: margem bem acima do alvo.
    expect(screen.getByText("Aceitar")).toBeInTheDocument();
    expect(screen.getByText("Margem").closest("article")).toHaveTextContent("39,5%");
  });

  it("frete baixo vira recusa com contraproposta em reais", () => {
    comRegua();
    abrir();
    // Cobre o custo carregado (~1.276) mas fica abaixo do piso (~1.604).
    preencher("Frete oferecido por viagem (R$)", 1450);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    expect(screen.getByText("Não aceitar")).toBeInTheDocument();
    // Recusa sem contraproposta não fecha negócio.
    expect(screen.getByText(/Peça R\$/)).toBeInTheDocument();
  });

  it("frete entre o piso e o alvo aceita com ressalva", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 1700);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    expect(screen.getByText("Aceitar com ressalva")).toBeInTheDocument();
  });

  it("prejuízo é dito com todas as letras", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 500);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    expect(screen.getByText("Não aceitar")).toBeInTheDocument();
    expect(screen.getByText(/prejuízo de R\$/i)).toBeInTheDocument();
  });

  it("a conta fica aberta na tela, não escondida", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    expect(screen.getByText("Como a margem foi calculada")).toBeInTheDocument();
    expect(screen.getByText("Custo direto")).toBeInTheDocument();
    expect(screen.getByText("Comissão")).toBeInTheDocument();
    // E cada rubrica mostra a conta que a gerou.
    expect(screen.getByText(/1,8 × 400/)).toBeInTheDocument();
  });

  it("retorno vazio alto vira alerta de buscar carga de volta", () => {
    comRegua();
    abrir();
    preencher("Frete oferecido por viagem (R$)", 4000);
    preencher("Km com carga (ida)", 400);
    preencher("Km de retorno vazio", 400);
    lancarCustosEssenciais();

    expect(screen.getByText(/carga de retorno/i)).toBeInTheDocument();
  });

  it("spot e recorrente são escolhas diferentes, com campos diferentes", () => {
    comRegua();
    abrir();
    expect(screen.getByLabelText("Quantas viagens")).toBeInTheDocument();
    expect(screen.queryByLabelText("Viagens por mês")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Contrato recorrente/ }));
    expect(screen.getByLabelText("Viagens por mês")).toBeInTheDocument();
    expect(screen.getByLabelText("Veículos disponíveis")).toBeInTheDocument();
    expect(screen.queryByLabelText("Quantas viagens")).not.toBeInTheDocument();
  });

  it("no contrato, o preço aparece também por viagem", () => {
    comRegua();
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Contrato recorrente/ }));
    preencher("Frete oferecido por viagem (R$)", 500);
    preencher("Km com carga (ida)", 100);
    preencher("Viagens por mês", 20);
    preencher("Meses de contrato", 6);
    lancarCustosEssenciais();

    expect(screen.getByText("Frete no piso").closest("article")).toHaveTextContent(
      /por viagem/,
    );
  });

  it("a régua em vigor manda na decisão, não uma cópia da tela", async () => {
    // Régua com piso alto: o mesmo frete que passaria no padrão é recusado.
    comRegua({
      minimumMarginPercent: 45,
      targetMarginPercent: 55,
      opexPercent: 7,
      adminPercent: 4,
      taxPercent: 8.65,
      riskPercent: 3,
      commissionPercent: 2.5,
    });
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    await waitFor(() => {
      expect(screen.getByText("Não aceitar")).toBeInTheDocument();
      expect(screen.getByText(/piso de 45%/)).toBeInTheDocument();
    });
  });

  it("dá para acrescentar um custo que não estava na lista", () => {
    comRegua();
    abrir();
    const antes = screen.getAllByLabelText(/^Nome do custo/).length;
    fireEvent.click(screen.getByRole("button", { name: /Acrescentar custo/ }));
    expect(screen.getAllByLabelText(/^Nome do custo/).length).toBe(antes + 1);
  });

  it("custo essencial não pode ser removido por engano", () => {
    comRegua();
    abrir();
    expect(
      screen.queryByRole("button", { name: /Remover Combustível ou energia/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remover Pedágio/ })).toBeInTheDocument();
  });

  it("a régua indisponível não trava a tela: cai no padrão e segue calculando", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("rede caiu"))));
    abrir();
    preencher("Frete oferecido por viagem (R$)", 2200);
    preencher("Km com carga (ida)", 400);
    lancarCustosEssenciais();

    await waitFor(() => expect(screen.getByText("Aceitar")).toBeInTheDocument());
  });
});
