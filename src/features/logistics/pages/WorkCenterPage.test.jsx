/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkCenterPage from "./WorkCenterPage.jsx";

const board = { id: "owner:comercial-deal-desk", name: "Comercial e Deal Desk", types: ["rfq", "tarefa"] };
const item = {
  id: "task-1",
  boardId: board.id,
  type: "tarefa",
  title: "Falar com Procurement",
  description: "Validar operação Brasil",
  status: "novo",
  priority: "alta",
  responsible: "Bruna",
  client: "Adidas",
  dueDate: "2026-08-20",
  revision: 1,
};

describe("Central de Trabalho da To Do Green", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("alterna entre lista, Kanban e agenda usando os mesmos itens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      boards: [board], items: [item], access: { canWrite: true },
    }), { status: 200 })));

    render(<WorkCenterPage authHeaders={() => ({ authorization: "Bearer teste" })} />);
    expect(await screen.findByText("Falar com Procurement")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Kanban" }));
    expect(screen.getByRole("combobox", { name: "Mover Falar com Procurement" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByText("Falar com Procurement")).toBeInTheDocument();
    expect(screen.getByText(/agosto de 2026/i)).toBeInTheDocument();
  });

  it("cria uma tarefa vinculada ao quadro e ao cliente", async () => {
    const fetchMock = vi.fn(async (_url, options = {}) => {
      if (options.method === "POST") {
        const body = JSON.parse(options.body);
        return new Response(JSON.stringify({ item: { ...item, id: "task-2", title: body.title, client: body.client } }), { status: 201 });
      }
      return new Response(JSON.stringify({ boards: [board], items: [], access: { canWrite: true } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WorkCenterPage authHeaders={() => ({})} clients={[{ id: "adidas", name: "Adidas" }]} />);
    fireEvent.click(await screen.findByRole("button", { name: "Novo item" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), { target: { value: "Enviar proposta sustentável" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Cliente/operação" }), { target: { value: "Adidas" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar item" }));

    expect(await screen.findByText("Enviar proposta sustentável")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(request).toMatchObject({ boardId: board.id, client: "Adidas", type: "tarefa" });
  });
});
