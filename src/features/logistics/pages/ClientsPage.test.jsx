/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "./ClientsPage.jsx";

describe("página de clientes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("explica e exibe somente a carteira devolvida para o vendedor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientes: [{ id: "client-1", name: "Cliente atribuído", document: "", segment: "Varejo", status: "active", vendedores: [{ email: "vendedor@empresa.com" }] }],
      acesso: { podeGerenciar: false, somenteCarteira: true },
    }), { status: 200 })));

    render(<ClientsPage authHeaders={() => ({ authorization: "Bearer teste" })} />);

    expect(await screen.findByRole("heading", { name: "Meus clientes" })).toBeInTheDocument();
    expect(screen.getByText("Cliente atribuído")).toBeInTheDocument();
    expect(screen.queryByText("Definir responsável comercial")).not.toBeInTheDocument();
  });
});
