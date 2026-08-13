/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        id: "client-1", accountCode: "TDG-000001", name: "Rede Alfa", segment: "Varejo", status: "ativo", revision: 2,
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
    expect(screen.getAllByText("TDG-000001").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Pesquisar empresa/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Ver como cliente/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Mapear ao menos um contato de Procurement/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Marcar feita e ver próxima" })).toBeEnabled();
    expect(screen.getByText("Reunião com compras")).toBeInTheDocument();
  });

  it("reconhece os contatos salvos sem fingir que são procurement logístico", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientes: [{
        id: "adidas", name: "Adidas", segment: "Varejo", status: "ativo", revision: 2,
        vendedores: [], crm: {
          contacts: [{ id: "1", name: "Thiago Souza", department: "Operações", email: "fernanda.pereira@adidas.com", phone: "+5519982414440" }],
          intelligence: {
            version: 9,
            checkedAt: "2026-08-11T00:00:00.000Z", esg: { relevance: "Alta", signals: [] },
            companyNews: [{ title: "adidas records strong start to the year", url: "https://www.adidas-group.com/news", snippet: "Continued operating working capital investments and strong business growth across the company." }],
            segmentNews: [], procurementPeople: [], supplierLinks: [], openRfqs: [], nextActions: [],
          },
        },
      }],
      acesso: { podeGerenciar: true, podeEditar: true, somenteCarteira: false },
    }), { status: 200 })));

    render(<ClientsPage authHeaders={() => ({})} />);
    fireEvent.click(await screen.findByRole("button", { name: /Adidas/ }));
    expect(await screen.findByText("1 contato(s) cadastrado(s); nenhum de Procurement logístico confirmado.")).toBeInTheDocument();
    expect(screen.getAllByText(/Pedir a Thiago Souza a indicação/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thiago Souza").length).toBeGreaterThan(0);
    expect(screen.queryByText("Contato ainda não mapeado")).not.toBeInTheDocument();
    expect(screen.getByText(/Fonte pública · adidas-group.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Continued operating working capital/)).not.toBeInTheDocument();
  });

  it("não reapresenta pesquisa antiga nem contatos web sem comprovação brasileira", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientes: [{
        id: "adidas", name: "Adidas", segment: "Varejo", status: "ativo", revision: 3,
        vendedores: [], crm: {
          contacts: [
            { id: "historico", name: "Contato salvo", department: "Operações", email: "salvo@adidas.com" },
            { id: "web-contact-1", name: "Ian Aranjo", source: "Pesquisa web", linkedinUrl: "https://ca.linkedin.com/in/ian-aranjo" },
          ],
          intelligence: {
            version: 1, checkedAt: "2026-08-10T00:00:00.000Z", esg: { relevance: "Alta", signals: [] },
            procurementPeople: [{ title: "Ian Aranjo", url: "https://ca.linkedin.com/in/ian-aranjo" }],
            rfqWatchlist: [{ title: "O que é RFQ", url: "https://example.com/o-que-e-rfq" }],
          },
        },
      }],
      acesso: { podeGerenciar: true, podeEditar: true, somenteCarteira: false },
    }), { status: 200 })));

    render(<ClientsPage authHeaders={() => ({})} />);
    fireEvent.click(await screen.findByRole("button", { name: /Adidas/ }));
    expect((await screen.findAllByText("Contato salvo")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Ian Aranjo")).not.toBeInTheDocument();
    expect(screen.queryByText("O que é RFQ")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Pesquisar empresa/ }).length).toBeGreaterThan(0);
  });

  it("marca a sugestão como feita e apresenta a próxima ação", async () => {
    const firstClient = {
      id: "conta-1", name: "Conta Um", segment: "Varejo", status: "ativo", revision: 2,
      vendedores: [], crm: { contacts: [{ id: "1", name: "Marina", department: "Operações", email: "marina@empresa.com" }] },
    };
    const nextClient = {
      ...firstClient,
      revision: 3,
      crm: { ...firstClient.crm, completedSuggestedActions: ["request-procurement-referral"] },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ clientes: [firstClient], acesso: { podeEditar: true } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, id: "conta-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ clientes: [nextClient], acesso: { podeEditar: true } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientsPage authHeaders={() => ({})} />);
    fireEvent.click(await screen.findByRole("button", { name: /Conta Um/ }));
    expect(await screen.findAllByText(/Pedir a Marina a indicação/i)).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Marcar feita e ver próxima" }));

    expect(await screen.findAllByText(/Confirmar o decisor econômico/i)).not.toHaveLength(0);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const patchRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(patchRequest.crm.completedSuggestedActions).toContain("request-procurement-referral");
  });
});
