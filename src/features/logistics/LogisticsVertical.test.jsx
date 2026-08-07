/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogisticsVertical from "./LogisticsVertical.jsx";

const baseDb = {
  user: { id: "u1", name: "Bruna", email: "bruna@example.com" },
  businesses: [],
  tasks: [],
  notifications: [],
};

const jsonOk = (corpo) =>
  Promise.resolve(new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

// A vertical só abre quando o servidor confirma. Todo teste que precisa da
// tela aberta passa por aqui — é a mesma resposta que o worker devolve.
const respostaDeAcesso = {
  tenant: { slug: "todogreen" },
  role: "admin",
  permissions: ["*"],
  ownerId: "u1",
  source: "vinculo",
};

// Stub de fetch com um roteador: a chamada de acesso é sempre atendida, e
// cada teste acrescenta o que mais precisar.
const stubDeRede = (rotas = {}) => {
  const chamadas = vi.fn((url, opcoes) => {
    const caminho = String(url);
    if (caminho.startsWith("/api/todogreen/access?")) return jsonOk(respostaDeAcesso);
    for (const [prefixo, resposta] of Object.entries(rotas))
      if (caminho.startsWith(prefixo)) return resposta(caminho, opcoes);
    return jsonOk({});
  });
  vi.stubGlobal("fetch", chamadas);
  return chamadas;
};

const authHeaders = () => ({ authorization: "Bearer teste" });

// Renderiza já autorizada e espera a confirmação chegar. Sem a espera, a
// asserção cai no cartão de "Confirmando seu acesso".
async function renderarAutorizada(props = {}) {
  const resultado = render(
    <LogisticsVertical db={baseDb} update={vi.fn()} setToast={vi.fn()} authHeaders={authHeaders} {...props} />,
  );
  await waitFor(() => expect(screen.queryByText(/Confirmando seu acesso/)).toBeNull());
  return resultado;
}

describe("LogisticsVertical", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/todogreen");
    stubDeRede();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  // ===== Quem entra =====
  //
  // Os quatro testes abaixo cobrem os quatro caminhos pelos quais a regra
  // antiga liberava a tela sem o servidor ter dito nada.

  it("não abre enquanto o servidor não confirmou o acesso", () => {
    render(<LogisticsVertical db={baseDb} update={vi.fn()} authHeaders={authHeaders} />);
    expect(screen.getByText(/Confirmando seu acesso/)).toBeTruthy();
    expect(screen.queryByText("Painel de Gerenciamento")).toBeNull();
  });

  it("bloqueia quem conhece a URL mas não tem sessão", () => {
    render(<LogisticsVertical db={baseDb} update={vi.fn()} />);
    expect(screen.getByText("Vertical To Do Green protegida")).toBeTruthy();
    expect(screen.queryByText("Painel de Gerenciamento")).toBeNull();
  });

  it("e-mail no domínio da empresa não abre a vertical sozinho", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 403 }))));
    render(
      <LogisticsVertical
        db={{ ...baseDb, user: { ...baseDb.user, email: "quemquer@todogreen.com.br" } }}
        update={vi.fn()}
        authHeaders={authHeaders}
      />,
    );
    expect(await screen.findByText("Vertical To Do Green protegida")).toBeTruthy();
  });

  it("negócio chamado To Do Green no espaço não abre a vertical", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 403 }))));
    render(
      <LogisticsVertical
        db={{ ...baseDb, businesses: [{ id: "b1", name: "To Do Green", tenantSlug: "todogreen" }] }}
        update={vi.fn()}
        authHeaders={authHeaders}
      />,
    );
    expect(await screen.findByText("Vertical To Do Green protegida")).toBeTruthy();
  });

  it("permissão guardada no estado local não abre a vertical", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 403 }))));
    render(
      <LogisticsVertical
        db={{ ...baseDb, tenantAccess: { todogreen: { role: "admin", active: true } } }}
        update={vi.fn()}
        authHeaders={authHeaders}
      />,
    );
    expect(await screen.findByText("Vertical To Do Green protegida")).toBeTruthy();
  });

  it("falha de rede fecha a vertical em vez de mantê-la aberta", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("rede fora"))));
    render(<LogisticsVertical db={baseDb} update={vi.fn()} authHeaders={authHeaders} />);
    expect(await screen.findByText("Vertical To Do Green protegida")).toBeTruthy();
  });

  it("resposta 200 sem papel conhecido também não libera", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonOk({ ownerId: "u1", permissions: ["*"] })));
    render(<LogisticsVertical db={baseDb} update={vi.fn()} authHeaders={authHeaders} />);
    expect(await screen.findByText("Vertical To Do Green protegida")).toBeTruthy();
  });

  it("renders the private hub for authorized To Do Green users", async () => {
    await renderarAutorizada();
    expect(screen.getAllByText("Painel de Gerenciamento").length).toBeGreaterThan(0);
    expect(screen.getByText("COMERCIAL & ESTRATÉGIA")).toBeTruthy();
    expect(screen.queryByText(/Painel operacional/i)).toBeNull();
    expect(screen.queryByText(/ativas.*planejado/i)).toBeNull();
    expect(screen.queryByText(/Recursos organizados por área/i)).toBeNull();
    expect(screen.getByText("Middle Mile")).toBeTruthy();
    expect(screen.getByText("Operação a granel")).toBeTruthy();
    expect(screen.getByText("Inteligência ESG")).toBeTruthy();
  });

  it("does not show fake production indicators when no real data exists", async () => {
    await renderarAutorizada();
    expect(screen.getByText("Nenhum indicador real carregado ainda.")).toBeTruthy();
    expect(screen.queryByText("Cliente enterprise")).toBeNull();
    expect(screen.queryByText("Operação e-commerce")).toBeNull();
    expect(screen.queryByText(/demonstração ativo/i)).toBeNull();
  });

  it("renders product-specific pricing fields instead of one generic form", async () => {
    window.history.pushState({}, "", "/todogreen/precificacao");
    const { container } = await renderarAutorizada();
    expect(screen.getByText("Middle Mile enterprise")).toBeTruthy();
    expect(screen.getByText("Origem *")).toBeTruthy();
    expect(screen.getByText("Pedágio por viagem R$")).toBeTruthy();
    expect(container.querySelectorAll(".tdg-section")).toHaveLength(0);
    expect(screen.queryByText("Calculadoras reais disponíveis")).toBeNull();
    fireEvent.click(screen.getAllByText("Last Mile")[0]);
    expect(screen.getByText("Last Mile e-commerce")).toBeTruthy();
    expect(screen.getByText("Pacotes *")).toBeTruthy();
    expect(screen.getByText("Sucesso entrega (%)")).toBeTruthy();
  });

  it("shows pricing results in a readable decision layout", async () => {
    window.history.pushState({}, "", "/todogreen/precificacao/dedicated");
    const { container } = await renderarAutorizada();
    expect(screen.getByText("Custo mensal")).toBeTruthy();
    expect(screen.getByText("Menor preço recomendado")).toBeTruthy();
    expect(screen.getByText("Preço recomendado")).toBeTruthy();
    expect(screen.getByText(/Recomendação comercial/i)).toBeTruthy();
    expect(container.querySelectorAll(".tdg-price-summary > div")).toHaveLength(4);
    expect(screen.queryByText("Governança")).toBeNull();
  });

  it("salvar uma simulação não concede acesso a quem salvou", async () => {
    window.history.pushState({}, "", "/todogreen/precificacao/dedicated");
    const update = vi.fn();
    await renderarAutorizada({ update });
    fireEvent.click(screen.getByText(/Salvar simulação/i));
    expect(update).toHaveBeenCalled();
    // A função de atualização recebe o estado atual e devolve o próximo. O que
    // ela devolve não pode conter concessão de acesso: era exatamente assim
    // que a tela se autoconcedia "admin".
    const proximo = update.mock.calls[0][0]({ todoGreenPricingScenarios: [] });
    expect(proximo.tenantAccess).toBeUndefined();
    expect(JSON.stringify(proximo)).not.toMatch(/tenantAccess/);
  });

  it("loads the independent client page from the real CRM service", async () => {
    window.history.pushState({}, "", "/todogreen/clientes");
    const fetchMock = stubDeRede({
      "/api/todogreen/clients": () => jsonOk({
        clientes: [{ id: "c1", name: "Cliente real", status: "active", vendedores: [] }],
        acesso: { podeGerenciar: true, somenteCarteira: false },
      }),
    });
    await renderarAutorizada();
    expect((await screen.findAllByText("Cliente real")).length).toBeGreaterThan(0);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/todogreen/clients", expect.any(Object)));
  });

  it("filters functions while preserving real workflow navigation", async () => {
    await renderarAutorizada();
    fireEvent.change(screen.getByLabelText("Buscar funções da vertical To Do Green"), {
      target: { value: "Green Score" },
    });
    expect(screen.getAllByText("Green Score").length).toBeGreaterThan(0);
    expect(screen.getByText("Pipeline")).toBeTruthy();
    expect(screen.queryByText("Remuneração Variável")).toBeNull();
  });

  it("opens a function in a new browser tab", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const { container } = await renderarAutorizada();
    const card = [...container.querySelectorAll(".tdg-module-card")].find((item) =>
      item.textContent.includes("Clientes"),
    );
    expect(card.textContent).not.toMatch(/abrir/i);
    fireEvent.click(card);
    expect(open).toHaveBeenCalledWith("/todogreen/clientes", "_blank", "noopener,noreferrer");
  });

  it("shows the access panel for admins", async () => {
    window.history.pushState({}, "", "/todogreen/acessos");
    stubDeRede({
      "/api/todogreen/access-list": () => jsonOk({
        emails: [
          { email: "teste@teste.com.br", role: "admin", status: "active", note: "Conta de teste" },
        ],
      }),
    });
    await renderarAutorizada();
    expect(await screen.findByText("teste@teste.com.br")).toBeTruthy();
    expect(screen.getByText(/sem novo deploy/i)).toBeTruthy();
  });

  it("o painel de acessos não promete liberação automática por domínio", async () => {
    window.history.pushState({}, "", "/todogreen/acessos");
    stubDeRede({ "/api/todogreen/access-list": () => jsonOk({ emails: [] }) });
    const { container } = await renderarAutorizada();
    await screen.findByText(/Nenhum e-mail autorizado ainda/);
    expect(container.textContent).not.toMatch(/continua liberado automaticamente/);
    expect(container.textContent).not.toMatch(/@todogreen\.com\.br/);
  });
});
