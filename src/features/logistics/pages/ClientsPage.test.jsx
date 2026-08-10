/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "./ClientsPage.jsx";

describe("página de clientes", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); window.history.replaceState({}, "", "/"); });

  it("explica e exibe somente a carteira devolvida para o vendedor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientes: [{ id: "client-1", name: "Cliente atribuído", document: "", segment: "Varejo", status: "active", vendedores: [{ email: "vendedor@empresa.com" }] }],
      acesso: { podeGerenciar: false, somenteCarteira: true },
    }), { status: 200 })));

    render(<ClientsPage authHeaders={() => ({ authorization: "Bearer teste" })} />);

    expect(await screen.findByRole("heading", { name: "CRM e carteira 360º" })).toBeInTheDocument();
    expect(screen.getAllByText("Cliente atribuído").length).toBeGreaterThan(0);
    expect(screen.getByText("Contas na carteira")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cartões" })).toHaveClass("active");
    expect(screen.queryByText("Definir responsável comercial")).not.toBeInTheDocument();
  });

  it("conecta conta, forecast e próxima melhor ação", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientes: [{
        id: "client-1", name: "Rede Alfa", segment: "Varejo", status: "ativo", revision: 2,
        vendedores: [], crm: { stage: "Diagnóstico", nextAction: "Validar rota", nextActionAt: "2999-01-01", dataQuality: 80, contacts: [] },
      }],
      acesso: { podeGerenciar: true, podeEditar: true, somenteCarteira: false },
    }), { status: 200 })));

    render(<ClientsPage authHeaders={() => ({})} opportunities={[{
      id: "opp-1", clientId: "client-1", cliente: "Rede Alfa", estagio: "Proposta",
      valorContrato: 1_000_000, probabilidade: 60, nextStep: "Reunião com compras",
    }]} />);

    expect(await screen.findByText("Forecast ponderado")).toBeInTheDocument();
    expect(screen.getAllByText(/600\.000/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Rede Alfa/ }));
    expect(await screen.findByRole("heading", { name: "Rede Alfa" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Pesquisar empresa/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Ver como cliente/ })).toBeInTheDocument();
    expect(screen.getAllByText("Mapear e acessar o decisor econômico.").length).toBeGreaterThan(0);
    expect(screen.getByText("Reunião com compras")).toBeInTheDocument();
  });
});
