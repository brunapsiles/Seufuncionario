/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Semente from "./Semente.jsx";

// A regra que originou esta tela: a Semente não pode atrapalhar. E a regra que
// originou esta versão: ela fala com /api/todogreen/semente — a carteira real,
// as ferramentas do CRM e as ações propostas — e nada é executado sem clique.

const resposta = (dados, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(dados) });

const authHeaders = () => ({ authorization: "Bearer t" });

const corpoEnviado = (indice = -1) => JSON.parse(global.fetch.mock.calls.at(indice)[1].body);

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn(() => resposta({ resposta: "Três contas estão paradas.", carteira: 12 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const abrir = () => fireEvent.click(screen.getByRole("button", { name: /Abrir Semente/i }));

const perguntarPor = async (texto) => {
  fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre a sua carteira/i), {
    target: { value: texto },
  });
  fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
};

describe("ela não ocupa a tela sem ser chamada", () => {
  it("começa recolhida, num botão só", () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    expect(screen.getByRole("button", { name: /Abrir Semente/i })).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("não pergunta nada ao servidor enquanto ninguém abriu", () => {
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("quem fechou não a encontra aberta de novo na próxima tela", async () => {
    const { unmount } = render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await screen.findByRole("complementary");
    fireEvent.click(screen.getByRole("button", { name: /Fechar a Semente/i }));
    await waitFor(() => expect(screen.queryByRole("complementary")).toBeNull());
    unmount();

    render(<Semente pagina="esg" authHeaders={authHeaders} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Abrir Semente/i })).toBeTruthy(),
    );
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("sobrevive a localStorage bloqueado", async () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("bloqueado");
      },
    });
    try {
      render(<Semente pagina="clientes" authHeaders={authHeaders} />);
      abrir();
      await screen.findByRole("complementary");
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });
});

describe("a pergunta vai para a vertical, com o contexto da tela", () => {
  it("chama /api/todogreen/semente com pergunta, tela e sessão", async () => {
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Onde a margem caiu?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, opcoes] = global.fetch.mock.calls.at(-1);
    expect(url).toBe("/api/todogreen/semente");
    expect(opcoes.headers.authorization).toBe("Bearer t");
    expect(corpoEnviado()).toMatchObject({ pergunta: "Onde a margem caiu?", tela: "precificacao" });
  });

  it("leva o cliente aberto na tela quando há um", async () => {
    render(<Semente pagina="clientes" clienteId="cli-42" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Qual a próxima ação para essa empresa?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(corpoEnviado().clienteId).toBe("cli-42");
  });

  it("a segunda pergunta leva a primeira junto", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Primeira pergunta minha");
    await screen.findByText("Três contas estão paradas.");
    await perguntarPor("E o segundo caso?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(corpoEnviado().historico).toEqual([
      { role: "user", content: "Primeira pergunta minha" },
      { role: "assistant", content: "Três contas estão paradas." },
    ]);
  });

  it("mostra qual ferramenta foi consultada, para a resposta ser conferível", async () => {
    global.fetch = vi.fn(() =>
      resposta({ resposta: "A conta Alfa está sem próxima ação.", consultou: { ferramenta: "carteira" } }),
    );
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    expect(await screen.findByText(/Consultei: carteira/i)).toBeTruthy();
  });

  it("formata negrito, títulos e listas sem mostrar os símbolos do Markdown", async () => {
    global.fetch = vi.fn(() => resposta({ resposta: "## Situação\nNão há conta **Quente**.\n- Revisar a carteira" }));
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Quais contas estão quentes?");
    expect(await screen.findByText("Quente")).toBeTruthy();
    expect(screen.getByText("Quente").tagName).toBe("STRONG");
    expect(screen.getByText("Situação")).toBeTruthy();
    expect(screen.getByText("Revisar a carteira").tagName).toBe("LI");
    expect(screen.queryByText(/\*\*Quente\*\*/)).toBeNull();
    expect(screen.queryByText(/## Situação/)).toBeNull();
  });

  it("diz que falhou em vez de fingir que respondeu", async () => {
    global.fetch = vi.fn(() => resposta({ error: "Os provedores de IA não responderam agora." }, false));
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    expect(await screen.findByText("Os provedores de IA não responderam agora.")).toBeTruthy();
  });

  it("não envia pergunta curta demais", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre a sua carteira/i), {
      target: { value: "oi" },
    });
    expect(screen.getByRole("button", { name: /Enviar pergunta/i }).disabled).toBe(true);
    fireEvent.submit(screen.getByPlaceholderText(/Pergunte sobre a sua carteira/i).closest("form"));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("proposta não é execução", () => {
  const proposta = { tipo: "definir_proxima_acao", cliente: "Rede Alfa", acao: "Enviar proposta", prazo: "2026-08-20" };

  it("a proposta chega como botão dizendo exatamente o que vai acontecer", async () => {
    global.fetch = vi.fn(() => resposta({ resposta: "Sugiro registrar a próxima ação.", proposta }));
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que faço com a Rede Alfa?");
    expect(await screen.findByText(/Definir próxima ação de Rede Alfa/)).toBeTruthy();
    expect(screen.getByText(/Nada foi gravado ainda/)).toBeTruthy();
    // E só a pergunta foi ao servidor — nenhuma execução aconteceu.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(corpoEnviado().executar).toBeUndefined();
  });

  it("confirmar dispara a execução e mostra o resumo do que foi feito", async () => {
    global.fetch = vi.fn((url, opcoes) => {
      const corpo = JSON.parse(opcoes.body);
      if (corpo.executar)
        return resposta({ ok: true, tipo: corpo.executar.tipo, resumo: "Próxima ação de Rede Alfa: Enviar proposta." });
      return resposta({ resposta: "Sugiro registrar a próxima ação.", proposta });
    });
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que faço com a Rede Alfa?");
    fireEvent.click(await screen.findByRole("button", { name: /Confirmar e executar/i }));
    expect(await screen.findByText("Próxima ação de Rede Alfa: Enviar proposta.")).toBeTruthy();
    // O corpo da execução é a proposta literal que estava na tela.
    expect(corpoEnviado()).toEqual({ executar: proposta });
    // O botão some: proposta executada não pode ser executada duas vezes.
    expect(screen.queryByRole("button", { name: /Confirmar e executar/i })).toBeNull();
  });

  it("execução recusada pelo servidor aparece como falha, e a proposta continua visível", async () => {
    global.fetch = vi.fn((url, opcoes) => {
      const corpo = JSON.parse(opcoes.body);
      if (corpo.executar) return resposta({ error: "Seu papel não cria itens na Central de Trabalho." }, false);
      return resposta({ resposta: "Sugiro criar a tarefa.", proposta: { tipo: "criar_tarefa", titulo: "Ligar" } });
    });
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Cria uma tarefa?");
    fireEvent.click(await screen.findByRole("button", { name: /Confirmar e executar/i }));
    expect(await screen.findByText("Seu papel não cria itens na Central de Trabalho.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Confirmar e executar/i })).toBeTruthy();
  });
});
