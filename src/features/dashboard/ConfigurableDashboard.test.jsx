// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import ConfigurableDashboard from "./ConfigurableDashboard.jsx";

const baseDb = {
  user: { id: "u1", name: "Ana" },
  dashboardConfigs: [],
  transactions: [
    {
      id: "tx1",
      type: "Receita",
      value: 1000,
      date: new Date().toISOString().slice(0, 10),
      businessId: "b1",
    },
  ],
  tasks: [],
  projects: [{ id: "p1", name: "Projeto Alfa", businessId: "b1" }],
  objectives: [],
  resourceProfiles: [],
  resourceAbsences: [],
  resourceAllocations: [],
  timeEntries: [],
  processes: [],
  processCases: [],
  impactFactors: [],
  impactEntries: [],
  pricingScenarios: [],
  vehicles: [],
  trips: [],
};

function Harness({ onChange = () => {}, go = () => {} }) {
  const [db, setDb] = useState(baseDb);
  const update = (producer) =>
    setDb((current) => {
      const next = producer(current);
      onChange(next);
      return next;
    });
  return (
    <ConfigurableDashboard
      db={db}
      update={update}
      business={{ id: "b1", name: "Empresa" }}
      go={go}
      setToast={() => {}}
    />
  );
}

afterEach(cleanup);

describe("interface de dashboards configuráveis", () => {
  it("mostra os indicadores universais e filtros do painel", () => {
    render(<Harness />);
    expect(
      screen.getByRole("heading", {
        name: "Decisões em um painel que se adapta à empresa",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("R$ 1.000,00")[0]).toBeInTheDocument();
    expect(screen.getByLabelText("Período")).toHaveValue("30");
    expect(screen.getByLabelText("Projeto")).toHaveValue("all");
    expect(screen.getByText("Operação logística")).toBeInTheDocument();
    expect(screen.getByText("Fila de atenção")).toBeInTheDocument();
  });

  it("persiste filtros e permite esconder um indicador", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Projeto"), {
      target: { value: "p1" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dashboardConfigs: [
          expect.objectContaining({
            filters: { period: "30", projectId: "p1" },
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    const dialog = screen.getByRole("dialog", { name: "Personalizar painel" });
    const picker = within(dialog)
      .getByText("Entradas financeiras no período")
      .closest("article");
    fireEvent.click(within(picker).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByText("Fechar").closest("button"));
    expect(
      document.querySelector('[data-widget-id="revenue"]'),
    ).not.toBeInTheDocument();
  });

  it("reposiciona cards, cria outro painel e abre o módulo vinculado", () => {
    const go = vi.fn();
    render(<Harness go={go} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Mover Margem para cima" }),
    );
    const ids = [...document.querySelectorAll("[data-widget-id]")].map(
      (item) => item.dataset.widgetId,
    );
    expect(ids.slice(0, 2)).toEqual(["margin", "revenue"]);

    fireEvent.click(screen.getByRole("button", { name: "Novo painel" }));
    expect(screen.getByLabelText("Painel").options).toHaveLength(2);

    const marginCard = document.querySelector('[data-widget-id="margin"]');
    fireEvent.click(within(marginCard).getByRole("button", { name: "Ver detalhes" }));
    expect(go).toHaveBeenCalledWith("financeiro");
  });
});
