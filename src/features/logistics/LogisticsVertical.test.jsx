/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TODO_GREEN_FEATURE_COUNT } from "./logisticsVerticalDomain.js";
import LogisticsVertical from "./LogisticsVertical.jsx";

const baseDb = {
  user: { id: "u1", name: "Bruna", email: "bruna@example.com" },
  businesses: [],
  tasks: [],
  notifications: [],
};

const authorizedDb = {
  ...baseDb,
  tenantAccess: { todogreen: { role: "admin", active: true } },
};

describe("LogisticsVertical", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("blocks users without tenant access even when they know the URL", () => {
    render(<LogisticsVertical db={baseDb} update={vi.fn()} />);
    expect(screen.getByText("Vertical To Do Green protegida")).toBeTruthy();
    expect(screen.queryByText(/Logística sustentável/)).toBeNull();
  });

  it("renders the private hub for authorized To Do Green users", () => {
    render(<LogisticsVertical db={authorizedDb} update={vi.fn()} />);
    expect(screen.getByText(/Logística sustentável com preço/)).toBeTruthy();
    expect(screen.getByText(String(TODO_GREEN_FEATURE_COUNT))).toBeTruthy();
    expect(screen.getByText("Middle Mile")).toBeTruthy();
    expect(screen.getByText("Operação a granel")).toBeTruthy();
    expect(screen.getByText("Inteligência ESG")).toBeTruthy();
  });

  it("does not show fake production indicators when no real data exists", () => {
    render(<LogisticsVertical db={authorizedDb} update={vi.fn()} />);
    expect(screen.getByText("Nenhum indicador real carregado ainda.")).toBeTruthy();
    expect(screen.queryByText("Cliente enterprise")).toBeNull();
    expect(screen.queryByText("Operação e-commerce")).toBeNull();
    expect(screen.queryByText(/demonstração ativo/i)).toBeNull();
  });

  it("renders product-specific pricing fields instead of one generic form", () => {
    window.history.pushState({}, "", "/todogreen/precificacao");
    render(<LogisticsVertical db={authorizedDb} update={vi.fn()} />);
    expect(screen.getByText("Middle Mile enterprise")).toBeTruthy();
    expect(screen.getByText("Origem *")).toBeTruthy();
    expect(screen.getByText("Pedágio por viagem R$")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Last Mile")[0]);
    expect(screen.getByText("Last Mile e-commerce")).toBeTruthy();
    expect(screen.getByText("Pacotes *")).toBeTruthy();
    expect(screen.getByText("Sucesso entrega (%)")).toBeTruthy();
  });

  it("shows pricing results in a readable decision layout", () => {
    window.history.pushState({}, "", "/todogreen/precificacao/dedicated");
    const { container } = render(<LogisticsVertical db={authorizedDb} update={vi.fn()} />);
    expect(screen.getByText("Custo mensal")).toBeTruthy();
    expect(screen.getByText("Menor preço recomendado")).toBeTruthy();
    expect(screen.getByText("Preço recomendado")).toBeTruthy();
    expect(screen.getByText(/Recomendação comercial/i)).toBeTruthy();
    expect(container.querySelectorAll(".tdg-price-summary > div")).toHaveLength(4);
    expect(screen.queryByText("Governança")).toBeNull();
  });

  it("creates real CRM records instead of only showing module cards", () => {
    window.history.pushState({}, "", "/todogreen/clientes");
    const update = vi.fn();
    render(<LogisticsVertical db={authorizedDb} update={update} setToast={vi.fn()} />);
    fireEvent.change(screen.getByText("Cliente").closest("label").querySelector("input"), {
      target: { value: "Cliente real" },
    });
    fireEvent.click(screen.getByText("Cadastrar cliente"));
    expect(update).toHaveBeenCalled();
  });

  it("filters functions while preserving real workflow navigation", async () => {
    render(<LogisticsVertical db={authorizedDb} update={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Buscar funções da vertical To Do Green"), {
      target: { value: "Green Score" },
    });
    expect(screen.getAllByText("Green Score").length).toBeGreaterThan(0);
    expect(screen.getByText("Pipeline")).toBeTruthy();
    expect(screen.queryByText("Remuneração Variável")).toBeNull();
  });

  it("shows the access panel for admins", async () => {
    window.history.pushState({}, "", "/todogreen/acessos");
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            emails: [
              {
                email: "teste@teste.com.br",
                role: "admin",
                status: "active",
                note: "Conta de teste",
              },
            ],
          }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LogisticsVertical
        db={authorizedDb}
        update={vi.fn()}
        authHeaders={() => ({ authorization: "Bearer token" })}
      />,
    );
    expect(await screen.findByText("teste@teste.com.br")).toBeTruthy();
    expect(screen.getByText(/sem novo deploy/i)).toBeTruthy();
  });
});
