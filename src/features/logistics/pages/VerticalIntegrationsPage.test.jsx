/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VerticalIntegrationsPage from "./VerticalIntegrationsPage.jsx";

describe("Integrações da vertical", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("mostra o estado real da pesquisa, Tracker e canais sem incluir PIX", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url === "/api/status") return new Response(JSON.stringify({ capabilities: { webSearch: { configured: true } } }), { status: 200 });
      return new Response(JSON.stringify({ integration: { status: "active" }, summary: { linkedVehicles: 4 } }), { status: 200 });
    }));
    const { container } = render(<VerticalIntegrationsPage authHeaders={() => ({})} clients={[
      { id: "1", portalEnabled: true, crm: { contacts: [{ name: "Ana", phone: "+5511999999999" }] } },
    ]} />);

    expect(await screen.findByText("Operacional")).toBeInTheDocument();
    expect(screen.getByText("4 veículo(s) conectado(s).")).toBeInTheDocument();
    expect(screen.getByText("1 contato(s) com canal")).toBeInTheDocument();
    expect(container.textContent.toLowerCase()).not.toMatch(/\bpix\b/);
  });
});
