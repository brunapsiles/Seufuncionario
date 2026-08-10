/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Semente from "./Semente.jsx";

// A regra que originou esta tela: a Semente não pode atrapalhar. Estes testes
// existem para que ela continue não atrapalhando quando alguém mexer no
// componente daqui a seis meses — recolhida por padrão, silenciosa depois de
// fechada, e sempre chamando o especialista da tela em que a pessoa está.

const resposta = (dados, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(dados) });

const authHeaders = () => ({ authorization: "Bearer t" });

const corpoEnviado = () => JSON.parse(global.fetch.mock.calls.at(-1)[1].body);

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn(() => resposta({ content: "Três contas estão abaixo do piso." }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const abrir = () => fireEvent.click(screen.getByRole("button", { name: /Abrir Semente/i }));

describe("ela não ocupa a tela sem ser chamada", () => {
  it("começa recolhida, num botão só", () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    expect(screen.getByRole("button", { name: /Abrir Semente/i })).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByPlaceholderText(/Pergunte sobre esta tela/i)).toBeNull();
  });

  it("não pergunta nada ao servidor enquanto ninguém abriu", () => {
    render(<Semente pagina="precificacao" resumo={{ margem: 9 }} authHeaders={authHeaders} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("quem fechou não a encontra aberta de novo na próxima tela", async () => {
    // Este é o comportamento que separa assistente de incômodo: a escolha de
    // fechar vale para as próximas telas, não só para aquela.
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

  it("quem deixou aberta a reencontra aberta", async () => {
    const { unmount } = render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await screen.findByRole("complementary");
    unmount();

    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    await screen.findByRole("complementary");
  });

  it("sobrevive a localStorage bloqueado", async () => {
    // Janela anônima ou política do navegador. Perder a memória da escolha é
    // aceitável; quebrar a vertical inteira não é.
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

describe("quem responde é o especialista da tela", () => {
  it("na precificação, o especialista de precificação", async () => {
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
      target: { value: "Este preço se sustenta?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(corpoEnviado().specialist).toBe("Especialista em Precificação Logística");
  });

  it("no ESG, o especialista de ESG", async () => {
    render(<Semente pagina="green-score" authHeaders={authHeaders} />);
    abrir();
    fireEvent.click((await screen.findAllByRole("button")).find((botao) =>
      /Green Score/i.test(botao.textContent),
    ));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(corpoEnviado().specialist).toBe("Especialista ESG");
  });

  it("manda a sessão junto, senão a resposta não é do espaço de quem perguntou", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    fireEvent.click((await screen.findAllByRole("button")).find((botao) =>
      /carteira/i.test(botao.textContent),
    ));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls.at(-1)[1].headers.authorization).toBe("Bearer t");
  });

  it("leva os dados da tela na pergunta", async () => {
    render(
      <Semente pagina="receita" resumo={{ receitaPrevista: 480000 }} authHeaders={authHeaders} />,
    );
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
      target: { value: "A receita está concentrada?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(corpoEnviado().prompt).toContain("480000");
  });
});

describe("conversa", () => {
  it("mostra a resposta do servidor, não um texto pronto", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
      target: { value: "O que está parado?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
    expect(await screen.findByText("Três contas estão abaixo do piso.")).toBeTruthy();
    expect(screen.getByText("O que está parado?")).toBeTruthy();
  });

  it("diz que falhou em vez de fingir que respondeu", async () => {
    global.fetch = vi.fn(() => resposta({ error: "Cota mensal de IA esgotada." }, false));
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
      target: { value: "O que está parado?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
    expect(await screen.findByText("Cota mensal de IA esgotada.")).toBeTruthy();
  });

  it("não envia pergunta curta demais", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
      target: { value: "oi" },
    });
    expect(screen.getByRole("button", { name: /Enviar pergunta/i }).disabled).toBe(true);
    fireEvent.submit(screen.getByPlaceholderText(/Pergunte sobre esta tela/i).closest("form"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("os atalhos somem depois da primeira pergunta", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    const atalho = (await screen.findAllByRole("button")).find((botao) =>
      /carteira/i.test(botao.textContent),
    );
    fireEvent.click(atalho);
    await screen.findByText("Três contas estão abaixo do piso.");
    expect(screen.queryByText(atalho.textContent, { selector: "button" })).toBeNull();
  });
});

// ===== A API inteira, não uma fatia =====
//
// A Semente usa /api/ai/stream com queda para /api/ai, manda o espaço ativo, a
// conversa anterior e a busca web, e mostra fontes e contingência. Cada um
// desses pedaços some sem quebrar nada visivelmente — por isso todos têm teste.

const sse = (quadros) => ({
  ok: true,
  headers: { get: () => "text/event-stream; charset=utf-8" },
  body: {
    getReader() {
      const codificador = new TextEncoder();
      let indice = 0;
      return {
        read: () =>
          Promise.resolve(
            indice < quadros.length
              ? { done: false, value: codificador.encode(quadros[indice++]) }
              : { done: true, value: undefined },
          ),
      };
    },
  },
});

const semStream = () => ({
  ok: false,
  status: 503,
  headers: { get: () => "application/json" },
  json: () => Promise.resolve({ error: "Streaming indisponível.", fallback: true }),
});

const perguntarPor = async (texto) => {
  fireEvent.change(await screen.findByPlaceholderText(/Pergunte sobre esta tela/i), {
    target: { value: texto },
  });
  fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta/i }));
};

describe("streaming", () => {
  it("mostra a resposta chegando em pedaços, sem esperar o fim", async () => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream"
        ? Promise.resolve(
            sse(['data: {"t":"A margem "}\n\n', 'data: {"t":"caiu em três contratos."}\n\n']),
          )
        : Promise.reject(new Error("não deveria cair para /api/ai")),
    );
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Onde a margem caiu?");
    expect(await screen.findByText("A margem caiu em três contratos.")).toBeTruthy();
  });

  it("um quadro partido pela rede não perde texto", async () => {
    // O chunk da rede corta o JSON no meio: é o caso que quebra leitor ingênuo.
    global.fetch = vi.fn(() =>
      Promise.resolve(sse(['data: {"t":"Meta', 'de"}\n\ndata: {"t":" batida."}\n\n'])),
    );
    render(<Semente pagina="metas" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("A meta fecha?");
    expect(await screen.findByText("Metade batida.")).toBeTruthy();
  });

  it("mostra as fontes quando a busca na internet trouxe alguma", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        sse([
          'data: {"t":"O diesel subiu."}\n\n',
          'data: {"done":true,"sources":[{"title":"ANP - preços","url":"https://anp.gov.br/x"}]}\n\n',
        ]),
      ),
    );
    render(<Semente pagina="custos" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O diesel subiu?");
    const fonte = await screen.findByRole("link", { name: "ANP - preços" });
    expect(fonte.getAttribute("href")).toBe("https://anp.gov.br/x");
    expect(fonte.getAttribute("rel")).toContain("noopener");
  });

  it("cai para /api/ai quando o streaming não está disponível", async () => {
    // O streaming fala só com o Gemini. Sem esta queda, uma falha dele viraria
    // falha da Semente — e a cadeia de 14 provedores do /api/ai ficaria parada.
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream"
        ? Promise.resolve(semStream())
        : resposta({ content: "Respondi pela cadeia completa." }),
    );
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    expect(await screen.findByText("Respondi pela cadeia completa.")).toBeTruthy();
    expect(global.fetch.mock.calls.map((chamada) => chamada[0])).toEqual([
      "/api/ai/stream",
      "/api/ai",
    ]);
  });

  it("cai para /api/ai quando o streaming abre e morre sem texto", async () => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream"
        ? Promise.resolve(sse(['data: {"error":"Falha no streaming.","fallback":true}\n\n']))
        : resposta({ content: "Segunda tentativa respondeu." }),
    );
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    expect(await screen.findByText("Segunda tentativa respondeu.")).toBeTruthy();
  });

  it("a rede caindo no streaming não impede a resposta", async () => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream"
        ? Promise.reject(new Error("rede"))
        : resposta({ content: "Respondi mesmo assim." }),
    );
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    expect(await screen.findByText("Respondi mesmo assim.")).toBeTruthy();
  });
});

describe("contexto do espaço de trabalho", () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream" ? Promise.resolve(semStream()) : resposta({ content: "ok" }),
    );
  });

  it("manda o espaço ativo, não o espaço pessoal de quem perguntou", async () => {
    // A vertical é operada dentro do espaço do tenant. Sem workspaceOwnerId o
    // servidor assume o espaço pessoal: perfil do negócio, memórias aprovadas
    // e cota iriam todos para o lugar errado.
    localStorage.setItem("sf-space", "espaco-todogreen");
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(corpoEnviado().workspaceOwnerId).toBe("espaco-todogreen");
  });

  it("sem espaço ativo não inventa um", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(corpoEnviado().workspaceOwnerId).toBeUndefined();
  });

  it("a segunda pergunta leva a primeira junto", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Primeira pergunta minha");
    await screen.findByText("ok");
    await perguntarPor("E o segundo caso?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));
    const { messages } = corpoEnviado();
    expect(messages.map((item) => item.content)).toEqual([
      "Primeira pergunta minha",
      "ok",
      "E o segundo caso?",
    ]);
  });

  it("o mesmo corpo vai para os dois endpoints", async () => {
    render(<Semente pagina="esg" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Onde falta evidência?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch.mock.calls[0][1].body).toBe(global.fetch.mock.calls[1][1].body);
  });
});

describe("busca na internet", () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream" ? Promise.resolve(semStream()) : resposta({ content: "ok" }),
    );
  });

  it("desligada por padrão, deixa o servidor decidir", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("O que está parado?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(corpoEnviado().webSearch).toBeUndefined();
  });

  it("ligada, manda a pergunta crua como consulta externa", async () => {
    render(
      <Semente
        pagina="clientes"
        resumo={{ clienteCritico: "Transportes Alfa" }}
        authHeaders={authHeaders}
      />,
    );
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: /Buscar na internet/i }));
    await perguntarPor("Qual o preço atual do diesel?");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const corpo = corpoEnviado();
    expect(corpo.webSearch).toBe(true);
    expect(corpo.webSearchQuery).toBe("Qual o preço atual do diesel?");
    expect(corpo.webSearchQuery).not.toContain("Transportes Alfa");
  });

  it("o interruptor diz em que estado está", async () => {
    render(<Semente pagina="clientes" authHeaders={authHeaders} />);
    abrir();
    const globo = await screen.findByRole("button", { name: /Buscar na internet/i });
    expect(globo.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(globo);
    await waitFor(() => expect(globo.getAttribute("aria-pressed")).toBe("true"));
  });
});

describe("honestidade da resposta", () => {
  it("avisa quando o texto é contingência e não análise dos dados", async () => {
    // Entregar roteiro de emergência com cara de análise é a mentira mais cara
    // que uma assistente pode contar para quem está decidindo preço.
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream"
        ? Promise.resolve(semStream())
        : resposta({ content: "Plano inicial...", degraded: true }),
    );
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Este preço se sustenta?");
    expect(await screen.findByText(/roteiro de contingência/i)).toBeTruthy();
  });

  it("resposta normal não ganha aviso de contingência", async () => {
    global.fetch = vi.fn((url) =>
      url === "/api/ai/stream" ? Promise.resolve(semStream()) : resposta({ content: "Sustenta." }),
    );
    render(<Semente pagina="precificacao" authHeaders={authHeaders} />);
    abrir();
    await perguntarPor("Este preço se sustenta?");
    await screen.findByText("Sustenta.");
    expect(screen.queryByText(/roteiro de contingência/i)).toBeNull();
  });
});
