/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardBuilderPage from "./DashboardBuilderPage.jsx";

describe("página de criação de painéis", () => {
  afterEach(() => vi.restoreAllMocks());

  it("carrega painéis pessoais e mostra a prévia dos indicadores", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "widget-1" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      dashboards: [{ id: "dash-1", name: "Minha carteira", description: "", visibility: "personal", revision: 1, widgets: [{ id: "w-1", title: "Clientes", metric: "clientes", type: "metric", size: "medium" }] }],
      access: { canManageTeam: false },
    }), { status: 200 })));

    render(<DashboardBuilderPage authHeaders={() => ({ authorization: "Bearer teste" })} summary={{ clientes: 7 }} />);

    expect(await screen.findByText("Minha carteira")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meus painéis" })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/todogreen/dashboards", expect.any(Object)));
  });
});
