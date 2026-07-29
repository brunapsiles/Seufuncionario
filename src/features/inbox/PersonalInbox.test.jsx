// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PersonalInbox from "./PersonalInbox.jsx";

const response = (data, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(data) });

const items = [
  {
    id: "task-assigned:t1",
    kind: "task",
    title: "Tarefa atribuída",
    message: "Preparar proposta",
    link: "operacao",
    createdAt: "2026-07-29T12:00:00.000Z",
    groupKey: "tasks:assigned",
    sourceType: "task",
    sourceId: "t1",
    readAt: null,
    snoozedUntil: null,
    snoozed: false,
  },
  {
    id: "approval:t2",
    kind: "approval",
    title: "Entrega para revisar",
    message: "Revisar relatório",
    link: "operacao",
    createdAt: "2026-07-29T11:00:00.000Z",
    groupKey: "approvals:pending",
    sourceType: "task",
    sourceId: "t2",
    readAt: null,
    snoozedUntil: null,
    snoozed: false,
  },
];

describe("interface da caixa de entrada pessoal", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options = {}) =>
        options.method === "PATCH"
          ? response({ ok: true, updated: 1 })
          : response({ items }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra prioridades agrupadas e filtra por categoria", async () => {
    render(
      <PersonalInbox
        go={vi.fn()}
        setToast={vi.fn()}
        authHeaders={() => ({ authorization: "Bearer token" })}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Caixa de entrada pessoal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preparar proposta")).toBeInTheDocument();
    expect(screen.getByText("Revisar relatório")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Aprovações/ }));
    expect(screen.queryByText("Preparar proposta")).not.toBeInTheDocument();
    expect(screen.getByText("Revisar relatório")).toBeInTheDocument();
  });

  it("marca como lida e envia o estado pessoal ao servidor", async () => {
    const nativeRead = vi.fn();
    render(
      <PersonalInbox
        go={vi.fn()}
        setToast={vi.fn()}
        authHeaders={() => ({ authorization: "Bearer token" })}
        onNativeRead={nativeRead}
      />,
    );
    await screen.findByText("Preparar proposta");
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Marcar notificação como lida",
      })[0],
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/inbox/personal",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"action":"read"'),
        }),
      ),
    );
    expect(nativeRead).toHaveBeenCalledWith(["task-assigned:t1"]);
  });

  it("adia uma notificação e a remove da fila ativa", async () => {
    render(
      <PersonalInbox
        go={vi.fn()}
        setToast={vi.fn()}
        authHeaders={() => ({})}
      />,
    );
    await screen.findByText("Preparar proposta");
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Adiar notificação até amanhã",
      })[0],
    );
    await waitFor(() =>
      expect(screen.queryByText("Preparar proposta")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Adiadas/ }));
    expect(screen.getByText("Preparar proposta")).toBeInTheDocument();
  });
});
