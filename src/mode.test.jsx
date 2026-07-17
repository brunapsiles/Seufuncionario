// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const user = {
  id: "user-mode",
  name: "Bruna Silva",
  email: "bruna@example.com",
};
const business = {
  id: "business-mode-1",
  name: "Negócio Teste",
  stage: "Estou estruturando o negócio",
  segment: "Serviços",
};

const baseDb = (overrides = {}) => ({
  user,
  onboarding: false,
  selectedBusinessId: null,
  businesses: [],
  tasks: [],
  leads: [],
  appointments: [],
  products: [],
  orders: [],
  timeEntries: [],
  transactions: [],
  financeSettings: {},
  documents: [],
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
  preferences: { theme: "light", specialist: "Diretor" },
  ...overrides,
});

const response = (data) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const stubFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url, options = {}) => {
      if (url === "/api/auth/session") return response({ user });
      if (String(url).startsWith("/api/workspace"))
        return options.method === "PUT" ? response({ ok: true }) : response({});
      if (url === "/api/config") return response({ videoEnabled: false });
      return response({});
    }),
  );
};

const seedLoggedIn = (db) => {
  localStorage.setItem("seu-funcionario-auth-token", "token-mode");
  localStorage.setItem("seu-funcionario-active-user", user.id);
  if (db)
    localStorage.setItem(`seu-funcionario-v2:${user.id}`, JSON.stringify(db));
};

const BUSINESS_ONLY_NAV = [
  "Vendas e Clientes",
  "Produtos e Pedidos",
  "Financeiro",
  "Horas e Faturamento",
  "Sites e Materiais",
  "Começar do zero",
  "Estratégia",
  "Marca e Marketing",
];
const SHARED_NAV = [
  "Início",
  "Operação",
  "Agendamentos",
  "Documentos",
  "Ferramentas",
  "Estúdio de IA",
  "Projetos",
  "Certificações",
];

describe("modos de uso: business e employee", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, "", "/");
    stubFetch();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. usuário antigo (dados sem preferences.mode) permanece em business sem ver a pergunta", async () => {
    const legacyDb = baseDb({
      selectedBusinessId: business.id,
      businesses: [business],
      // preferences sem mode/modeChosen simula conta anterior à funcionalidade
    });
    seedLoggedIn(legacyDb);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /Vamos fazer acontecer/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Como você pretende usar o Seu Funcionário?"),
    ).not.toBeInTheDocument();
    for (const label of BUSINESS_ONLY_NAV)
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("2. conta nova mostra a pergunta de onboarding e aplica o modo escolhido", async () => {
    seedLoggedIn(baseDb()); // workspace recém-criado, sem nenhum dado ainda
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Como você pretende usar o Seu Funcionário?",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Para me ajudar no meu trabalho" }),
    );

    expect(
      await screen.findByRole("heading", { name: /Vamos fazer acontecer/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Meu trabalho")).toBeInTheDocument();
    for (const label of BUSINESS_ONLY_NAV)
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
  });

  it("3. alterar o modo em Configurações atualiza a navegação imediatamente", async () => {
    seedLoggedIn(
      baseDb({
        selectedBusinessId: business.id,
        businesses: [business],
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "business",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    const modeCard = screen
      .getByRole("heading", { name: "Modo de uso" })
      .closest("section");
    fireEvent.click(
      within(modeCard).getByRole("button", {
        name: "Me ajudar no meu trabalho",
      }),
    );

    expect(
      screen.queryByRole("button", { name: "Vendas e Clientes" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Meu trabalho")).toBeInTheDocument();
  });

  it("4. navegação do modo funcionário esconde módulos de negócio e mantém os pessoais", async () => {
    seedLoggedIn(
      baseDb({
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "employee",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    for (const label of BUSINESS_ONLY_NAV)
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    for (const label of SHARED_NAV)
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("5. modo negócio preserva todos os módulos originais", async () => {
    seedLoggedIn(
      baseDb({
        selectedBusinessId: business.id,
        businesses: [business],
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "business",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    for (const label of [...BUSINESS_ONLY_NAV, ...SHARED_NAV])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("6. campo Cliente é opcional em Agendamentos no modo funcionário", async () => {
    seedLoggedIn(
      baseDb({
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "employee",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    fireEvent.click(screen.getByRole("button", { name: "Agendamentos" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Novo agendamento" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Novo agendamento",
    });
    expect(
      within(dialog).getByLabelText("Com quem (opcional)"),
    ).not.toBeRequired();
    fireEvent.change(within(dialog).getByLabelText("Serviço ou motivo"), {
      target: { value: "Bloco de foco" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Salvar agendamento" }),
    );

    expect(await screen.findByText("Bloco de foco")).toBeInTheDocument();
  });

  it("7. campo Cliente continua obrigatório em Agendamentos no modo negócio", async () => {
    seedLoggedIn(
      baseDb({
        selectedBusinessId: business.id,
        businesses: [business],
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "business",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    fireEvent.click(screen.getByRole("button", { name: "Agendamentos" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Novo agendamento" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Novo agendamento",
    });
    expect(within(dialog).getByLabelText("Cliente")).toBeRequired();
    fireEvent.change(within(dialog).getByLabelText("Serviço ou motivo"), {
      target: { value: "Consulta" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Salvar agendamento" }),
    );

    // sem preencher Cliente, o pedido não deve ser salvo (modal permanece aberto)
    expect(
      screen.getByRole("dialog", { name: "Novo agendamento" }),
    ).toBeInTheDocument();
  });

  it("8. a preferência de modo persiste entre recarregamentos", async () => {
    seedLoggedIn(
      baseDb({
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "employee",
          modeChosen: true,
        },
      }),
    );
    const { unmount } = render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });
    expect(screen.getByText("Meu trabalho")).toBeInTheDocument();
    unmount();

    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });
    expect(screen.getByText("Meu trabalho")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vendas e Clientes" }),
    ).not.toBeInTheDocument();
  });

  it("9. a troca entre modos é reversível sem perda de itens de navegação", async () => {
    seedLoggedIn(
      baseDb({
        selectedBusinessId: business.id,
        businesses: [business],
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "business",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    const goToModeCard = () =>
      screen.getByRole("heading", { name: "Modo de uso" }).closest("section");

    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    fireEvent.click(
      within(goToModeCard()).getByRole("button", {
        name: "Me ajudar no meu trabalho",
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Vendas e Clientes" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    fireEvent.click(
      within(goToModeCard()).getByRole("button", {
        name: "Administrar meu negócio",
      }),
    );
    for (const label of [...BUSINESS_ONLY_NAV, ...SHARED_NAV])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("10. o menu mobile abre e mostra a navegação do modo funcionário em largura de celular", async () => {
    seedLoggedIn(
      baseDb({
        preferences: {
          theme: "light",
          specialist: "Diretor",
          mode: "employee",
          modeChosen: true,
        },
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: /Vamos fazer acontecer/ });

    const openMobile = document.querySelector(".mobile-menu");
    expect(openMobile).toBeTruthy();
    fireEvent.click(openMobile);

    const aside = document.querySelector("aside.open");
    expect(aside).toBeTruthy();
    for (const label of SHARED_NAV)
      expect(
        within(aside).getByRole("button", { name: label }),
      ).toBeInTheDocument();
    for (const label of BUSINESS_ONLY_NAV)
      expect(
        within(aside).queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
  });
});
