// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = { id: "user-db", name: "Bruna Silva", email: "bruna@example.com" };
const business = {
  id: "business-db-1",
  name: "Negócio Teste",
  stage: "Estou estruturando o negócio",
  segment: "Serviços",
};

const businessDb = () => ({
  user,
  onboarding: false,
  selectedBusinessId: business.id,
  businesses: [business],
  tasks: [],
  leads: [],
  appointments: [],
  products: [],
  orders: [],
  contacts: [],
  timeEntries: [],
  transactions: [],
  financeSettings: {},
  taxProfile: { isMEI: false, dueDay: 20, cnpj: "", dasHistory: {} },
  documents: [],
  presentations: [],
  contentPlan: [],
  sheets: [],
  analyses: [],
  brainstorms: [],
  signatures: [],
  pixCharges: [],
  databases: [],
  sites: [],
  history: [],
  certificates: [],
  conversations: [],
  media: [],
  emailDrafts: [],
  customSpecialists: [],
  pluggedTools: [],
  selectedConversationId: null,
  journeys: {},
  preferences: {
    theme: "light",
    specialist: "Diretor",
    mode: "business",
    modeChosen: true,
  },
});

const response = (data) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const seedLoggedIn = (db) => {
  localStorage.setItem("seu-funcionario-auth-token", "token-db");
  localStorage.setItem("seu-funcionario-active-user", user.id);
  localStorage.setItem(`seu-funcionario-v2:${user.id}`, JSON.stringify(db));
};

describe("Meus dados (banco de dados)", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn((url, options = {}) => {
        if (url === "/api/auth/session") return response({ user });
        if (String(url).startsWith("/api/workspace"))
          return options.method === "PUT"
            ? response({ ok: true })
            : response({});
        if (url === "/api/config") return response({ videoEnabled: false });
        return response({});
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("cria base a partir de um modelo, adiciona registro e edita célula", async () => {
    seedLoggedIn(businessDb());
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    fireEvent.click(screen.getByRole("button", { name: "Meus dados" }));
    await screen.findByRole("heading", { name: "Meus dados" });

    // Cria a base pelo modelo "Clientes" (dentro da grade de modelos).
    const grid = document.querySelector(".db-template-grid");
    fireEvent.click(within(grid).getByRole("button", { name: /Clientes/ }));

    // A base abre em Tabela; os campos do modelo viram cabeçalhos.
    expect(await screen.findByRole("button", { name: "Nome" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();

    // Adiciona um registro e preenche a célula "Nome".
    fireEvent.click(screen.getByRole("button", { name: /Registro/ }));
    const nameCells = screen.getAllByLabelText("Nome");
    fireEvent.change(nameCells[0], { target: { value: "Ana Souza" } });
    expect(screen.getByDisplayValue("Ana Souza")).toBeInTheDocument();

    // Alterna para o Quadro (kanban) — agrupa pelo campo Status.
    fireEvent.click(screen.getByRole("button", { name: "Quadro" }));
    const colTitles = [...document.querySelectorAll(".db-kanban-col h4")].map((h) =>
      h.textContent.trim(),
    );
    expect(colTitles.some((t) => t.startsWith("Novo"))).toBe(true);
    expect(colTitles.some((t) => t.startsWith("Ativo"))).toBe(true);
  });
});
