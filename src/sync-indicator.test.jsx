// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = {
  id: "user-sync",
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

describe("indicador de sincronização", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, "", "/");
    localStorage.setItem("seu-funcionario-auth-token", "token-sync");
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

  it("mostra 'Sincronizando...' enquanto a sincronização em segundo plano está em andamento", async () => {
    let resolvePut;
    const fetchMock = vi.fn((url, options = {}) => {
      if (url === "/api/auth/session") return response({ user });
      if (url === "/api/workspace" && options.method === "PUT")
        return new Promise((resolve) => {
          resolvePut = () => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ok: true, revision: 1 }),
          });
        });
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
          updatedAt: "2026-01-01T00:00:00.000Z",
          revision: 0,
        });
      if (url === "/api/config") return response({ videoEnabled: false });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    expect(screen.queryByText("Sincronizando...")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));

    expect(
      await screen.findByText("Sincronizando...", {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    resolvePut();
    await waitFor(() =>
      expect(screen.queryByText("Sincronizando...")).not.toBeInTheDocument(),
    );
  });
});
