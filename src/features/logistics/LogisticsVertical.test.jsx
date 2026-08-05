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
    render(
      <LogisticsVertical
        db={{
          ...baseDb,
          tenantAccess: { todogreen: { role: "admin", active: true } },
        }}
        update={vi.fn()}
      />,
    );
    expect(screen.getByText(/Logística sustentável com preço/)).toBeTruthy();
    expect(screen.getByText(String(TODO_GREEN_FEATURE_COUNT))).toBeTruthy();
    expect(screen.getByText("Middle Mile")).toBeTruthy();
    expect(screen.getByText("Operação a granel")).toBeTruthy();
    expect(screen.getByText("Inteligência ESG")).toBeTruthy();
  });

  it("filters functions without inventing unrelated cards", async () => {
    render(
      <LogisticsVertical
        db={{
          ...baseDb,
          tenantAccess: { todogreen: { role: "admin", active: true } },
        }}
        update={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Buscar funções da vertical To Do Green"), {
      target: { value: "Green Score" },
    });
    expect(screen.getAllByText("Green Score").length).toBeGreaterThan(0);
    expect(screen.queryByText("Pipeline")).toBeNull();
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
        db={{
          ...baseDb,
          tenantAccess: { todogreen: { role: "admin", active: true } },
        }}
        update={vi.fn()}
        authHeaders={() => ({ authorization: "Bearer token" })}
      />,
    );
    expect(await screen.findByText("teste@teste.com.br")).toBeTruthy();
    expect(screen.getByText(/sem novo deploy/i)).toBeTruthy();
  });
});
