// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { makeSite, makeSitePages, mergeSiteBrief } from "./App";

const user = {
  id: "user-flow",
  name: "Bruna Silva",
  email: "bruna@example.com",
};
const business = {
  id: "business-1",
  name: "Negócio Teste",
  stage: "Estou estruturando o negócio",
  segment: "Serviços",
};

const initialDb = () => ({
  user,
  onboarding: false,
  selectedBusinessId: business.id,
  businesses: [business],
  tasks: [],
  leads: [],
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
});

const response = (data) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

describe("fluxos de trabalho", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, "", "/");
    localStorage.setItem("seu-funcionario-auth-token", "token-flow");
    localStorage.setItem("seu-funcionario-active-user", user.id);
    localStorage.setItem(
      `seu-funcionario-v2:${user.id}`,
      JSON.stringify(initialDb()),
    );
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
    vi.restoreAllMocks();
  });

  it("cria, edita, vincula e arquiva uma tarefa", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Operação" }));
    expect(
      screen.getByRole("heading", { name: "Tarefas e projetos" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nova tarefa" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Preparar lançamento" },
    });
    fireEvent.change(screen.getByLabelText("Nome do responsável"), {
      target: { value: "Bruna" },
    });
    fireEvent.change(screen.getByLabelText("Projeto"), {
      target: { value: "Campanha de julho" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Criar tarefa" })).getByRole(
        "button",
        { name: "Criar tarefa" },
      ),
    );

    expect(screen.getByText("Preparar lançamento")).toBeInTheDocument();
    expect(screen.getAllByText(/Campanha de julho/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Editar tarefa" }));
    expect(
      screen.getByRole("dialog", { name: "Editar tarefa" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Preparar lançamento final" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByText("Preparar lançamento final")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(
      screen.queryByText("Preparar lançamento final"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar arquivamento"), {
      target: { value: "Arquivadas" },
    });
    expect(screen.getByText("Preparar lançamento final")).toBeInTheDocument();
  });

  it("delega uma tarefa a um colaborador digital e abre a execução no chat", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Operação" }));
    fireEvent.click(screen.getByRole("button", { name: "Nova tarefa" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Criar campanha de lançamento" },
    });
    fireEvent.change(screen.getByLabelText("Responsável"), {
      target: { value: "digital" },
    });
    fireEvent.change(screen.getByLabelText("Colaborador digital"), {
      target: { value: "Marketing" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Criar tarefa" })).getByRole(
        "button",
        { name: "Criar tarefa" },
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Iniciar tarefa com Marketing" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "A habilidade certa para cada desafio",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Funcionário")).toHaveValue("Marketing");
    expect(screen.getByLabelText("Mensagem para a IA").value).toContain(
      "Criar campanha de lançamento",
    );
  });

  it("só conclui um marco de jornada quando existe um entregável", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Começar do zero" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Começar jornada" })[0],
    );

    const validate = screen.getAllByRole("button", {
      name: "Validar marco",
    })[0];
    expect(validate).toBeDisabled();
    fireEvent.change(
      screen.getAllByPlaceholderText(
        "Descreva o entregável, decisão ou evidência produzida nesta etapa.",
      )[0],
      {
        target: { value: "Briefing da ideia registrado no documento inicial." },
      },
    );
    const enabledValidate = screen.getAllByRole("button", {
      name: "Validar marco",
    })[0];
    expect(enabledValidate).toBeEnabled();
    fireEvent.click(enabledValidate);

    await waitFor(() =>
      expect(
        screen.getByText("Briefing da ideia registrado no documento inicial."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Reabrir marco" }),
    ).toBeInTheDocument();
  });

  it("edita um lead e preserva o histórico de interações", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Vendas e Clientes" }));
    fireEvent.click(screen.getByRole("button", { name: "Novo lead" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Cliente Exemplo" },
    });
    fireEvent.change(screen.getByLabelText("Empresa"), {
      target: { value: "Empresa Exemplo" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Adicionar lead" })).getByRole(
        "button",
        { name: "Salvar lead" },
      ),
    );

    expect(screen.getByText("Cliente Exemplo")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Editar lead e ver interacoes" }),
    );
    fireEvent.change(
      screen.getByPlaceholderText("O que aconteceu e qual foi o combinado?"),
      { target: { value: "Reunião realizada; enviar proposta na sexta." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(
      screen.getByText("Reunião realizada; enviar proposta na sexta."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Editar lead e ver interacoes" }),
    );
    expect(
      screen.getByText("Reunião realizada; enviar proposta na sexta."),
    ).toBeInTheDocument();
  });
});

describe("construtor de sites", () => {
  it("nunca publica o briefing interno como texto para o visitante", () => {
    const brief = {
      name: "Seu Funcionário",
      segment: "Inteligência artificial",
      instructions:
        "Crie uma landing page premium e explique claramente tudo o que a plataforma faz.",
      description: "",
      services: "Planejamento\nConteúdo",
      color: "#6d38e0",
    };
    const html = makeSite(brief, "", "seu-funcionario");
    expect(html).not.toContain(brief.instructions);
    expect(html).toContain("Seu Funcionário oferece soluções");
  });

  it("gera páginas independentes e preserva campos não pedidos numa edição", () => {
    const brief = {
      name: "Estúdio Aurora",
      segment: "Design",
      headline: "Design que aproxima",
      description: "Identidades claras para marcas em crescimento.",
      services: "Marca\nSite",
      cta: "Conversar",
      color: "#6d38e0",
    };
    const pages = makeSitePages(brief, "estudio-aurora");
    expect(pages.map((page) => page.slug)).toEqual([
      "",
      "sobre",
      "servicos",
      "contato",
    ]);
    expect(pages[1].html).toContain("/s/estudio-aurora/servicos");
    const edited = mergeSiteBrief(brief, { headline: "Sua marca, mais viva" });
    expect(edited.headline).toBe("Sua marca, mais viva");
    expect(edited.description).toBe(brief.description);
    expect(edited.services).toBe(brief.services);
  });
});
