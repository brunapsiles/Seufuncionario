/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CommunicationsPage from "./CommunicationsPage.jsx";

describe("Comunicação da To Do Green", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("mantém cada contato e cada WhatsApp associados à pessoa correta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 })));
    const clients = [{
      id: "renner",
      name: "Lojas Renner",
      crm: { contacts: [
        { id: "kamila", name: "Kamila Braggio", title: "Compras", phone: "+55 51 97665-8421", email: "kamila@renner.com.br" },
        { id: "kamila-duplicada", name: "Kamila Braggio", title: "Compras", phone: "+55 51 97665-8421", email: "kamila@renner.com.br" },
        { id: "caroline", name: "Caroline Schneider", title: "Suprimentos", phone: "+55 51 96935-6611", email: "caroline@renner.com.br" },
      ] },
    }];
    const navigate = vi.fn();

    render(<CommunicationsPage authHeaders={() => ({})} clients={clients} onNavigate={navigate} />);

    expect(screen.getAllByText("Kamila Braggio")).toHaveLength(1);
    expect(screen.getByText("Caroline Schneider")).toBeInTheDocument();
    const whatsapp = screen.getAllByRole("link", { name: "WhatsApp" });
    expect(whatsapp).toHaveLength(2);
    expect(whatsapp[0]).toHaveAttribute("href", "https://wa.me/5551976658421");
    expect(whatsapp[1]).toHaveAttribute("href", "https://wa.me/5551969356611");
    expect(whatsapp[0].getAttribute("href")).not.toContain("5551969356611");

    fireEvent.click(screen.getByRole("button", { name: /Kamila Braggio/ }));
    expect(navigate).toHaveBeenCalledWith("/todogreen/clientes?client=renner");
  });

  it("filtra por empresa, cargo e pessoa", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 })));
    render(<CommunicationsPage authHeaders={() => ({})} clients={[
      { id: "amazon", name: "Amazon", crm: { contacts: [{ id: "1", name: "Fernanda Vasco", title: "Procurement", email: "fevasco@amazon.com" }] } },
      { id: "adidas", name: "Adidas", crm: { contacts: [{ id: "2", name: "Thiago Souza", title: "Operações", email: "thiago@adidas.com" }] } },
    ]} />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar contato/), { target: { value: "Procurement" } });
    expect(screen.getByText("Fernanda Vasco")).toBeInTheDocument();
    expect(screen.queryByText("Thiago Souza")).not.toBeInTheDocument();
  });

  it("não reapresenta contato web estrangeiro ou antigo descartado pelo CRM", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 })));
    render(<CommunicationsPage authHeaders={() => ({})} clients={[{
      id: "adidas", name: "Adidas", crm: { contacts: [
        { id: "salvo", name: "Contato Brasil", email: "brasil@adidas.com" },
        { id: "estrangeiro", name: "Contato Exterior", source: "Pesquisa web", country: "Canadá", verifiedBrazil: false, researchVersion: 5 },
      ] },
    }]} />);
    expect(screen.getByText("Contato Brasil")).toBeInTheDocument();
    expect(screen.queryByText("Contato Exterior")).not.toBeInTheDocument();
  });
});
