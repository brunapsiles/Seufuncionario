// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = {
  id: "user-conflict",
  name: "Pessoa Teste",
  email: "pessoa@example.com",
};

function response(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("conflito de sincronização no cliente", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, "", "/");
    localStorage.setItem("seu-funcionario-auth-token", "token-conflict");
    localStorage.setItem("seu-funcionario-active-user", user.id);
    localStorage.setItem(
      `seu-funcionario-v2:${user.id}`,
      JSON.stringify({
        user,
        updatedAt: "2026-01-01T00:00:00.000Z",
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "business",
          modeChosen: true,
        },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("interrompe novos envios e preserva a versão local após HTTP 409", async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (url === "/api/auth/session") return response({ user });
      if (url === "/api/workspace" && options.method === "PUT")
        return response(
          {
            error: "Conflito",
            serverRevision: 5,
            serverUpdatedAt: "2026-02-02T00:00:00.000Z",
          },
          409,
        );
      if (url === "/api/workspace")
        return response({
          data: {
            preferences: {
              theme: "light",
              specialist: "Diretor",
              mode: "business",
              modeChosen: true,
            },
          },
          updatedAt: "2026-02-01T00:00:00.000Z",
          revision: 4,
        });
      if (url === "/api/config") return response({ videoEnabled: false });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await waitFor(() =>
      expect(localStorage.getItem(`sf-workspace-revision:${user.id}`)).toBe(
        "4",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));

    expect(
      await screen.findByRole("alert", {}, { timeout: 5_000 }),
    ).toHaveTextContent("continua salva neste navegador");

    const putCalls = fetchMock.mock.calls.filter(
      ([url, options]) => url === "/api/workspace" && options?.method === "PUT",
    );
    expect(putCalls).toHaveLength(1);
    expect(JSON.parse(putCalls[0][1].body).revision).toBe(4);

    const preserved = JSON.parse(
      localStorage.getItem(`sf-workspace-conflict:${user.id}`),
    );
    expect(preserved).toMatchObject({
      baseRevision: 4,
      serverRevision: 5,
      data: { preferences: { theme: "dark" } },
    });
    expect(
      JSON.parse(localStorage.getItem(`seu-funcionario-v2:${user.id}`))
        .preferences.theme,
    ).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Modo claro" }));
    await new Promise((resolve) => setTimeout(resolve, 2_700));
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) =>
          url === "/api/workspace" && options?.method === "PUT",
      ),
    ).toHaveLength(1);
  });
});
