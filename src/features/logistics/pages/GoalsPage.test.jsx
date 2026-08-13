/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoalsPage from "./GoalsPage.jsx";

const catalogs = {
  categories: [{ id: "commercial", label: "Comercial" }],
  scopes: [{ id: "company", label: "Empresa" }],
  metrics: [{ id: "revenue", label: "Receita", category: "commercial", unit: "currency", source: "financial.revenue" }],
  directions: [{ id: "increase", label: "Quanto maior, melhor" }],
  cadences: [{ id: "monthly", label: "Mensal" }],
  units: [{ id: "number", label: "Número" }],
  sources: [{ id: "manual", label: "Check-in manual", mode: "manual" }],
};

describe("painel administrativo de metas", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("permite ao administrador criar uma métrica com critérios próprios", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ goals: [], summary: {}, access: { canCreate: true, canManageMetrics: true }, catalogs }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ metrics: catalogs.metrics, units: catalogs.units, sources: catalogs.sources, categories: catalogs.categories, directions: catalogs.directions, canManage: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ metric: { id: "renovacoes", label: "Renovações", custom: true } }), { status: 201 }))
      .mockResolvedValue(new Response(JSON.stringify({ goals: [], summary: {}, access: { canCreate: true, canManageMetrics: true }, catalogs }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<GoalsPage authHeaders={() => ({})} />);
    fireEvent.click(await screen.findByRole("button", { name: "Métricas e critérios" }));
    expect(await screen.findByRole("heading", { name: "Métricas e critérios" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da métrica"), { target: { value: "Renovações" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar critério" }));
    fireEvent.change(screen.getByLabelText("Nome do critério 1"), { target: { value: "Meta atingida" } });
    fireEvent.change(screen.getByLabelText("Valor do critério 1"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar métrica" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/todogreen/goals/metrics", expect.objectContaining({ method: "POST" })));
    const request = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(request[1].body).criteria).toEqual([expect.objectContaining({ label: "Meta atingida", value: 10 })]);
  });
});
