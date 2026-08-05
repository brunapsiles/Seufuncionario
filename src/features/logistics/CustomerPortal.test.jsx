/* @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerPortal from "./CustomerPortal.jsx";

// A tela do portal nunca decide o que mostrar: ela pergunta ao servidor de quem
// é a sessão e desenha o que voltou. Estes testes garantem que ela não inventa
// nada por conta própria — nem cliente, nem número, nem item de menu.

const resposta = (dados, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(dados) });

const sessaoPadrao = {
  cliente: { id: "cli-a", nome: "Cliente A" },
  papel: "cliente_gestor",
  permissoes: ["portal:read", "portal:report:export"],
  menu: [
    { id: "inicio", label: "Início" },
    { id: "operacoes", label: "Operações" },
    { id: "relatorios", label: "Relatórios" },
  ],
  usuario: { nome: "Pessoa A", email: "pessoa@clientea.com.br" },
};

const resumoComDados = {
  resumo: {
    operacoes: { total: 3, entregas: 300, distanciaKm: 900, ocupacaoMedia: 80 },
    ambiental: { co2EvitadoKg: 4200, dieselEvitadoL: 1600, reducaoPercent: 22, qualidadeDados: 85, calculos: 2 },
    greenScore: { valor: 78.5, versaoPesos: "v1", calculadoEm: "2026-08-01" },
    semDados: false,
  },
};

const montarFetch = (mapa) =>
  vi.fn((url) => {
    const chave = String(url).split("/portal/")[1]?.split("?")[0];
    if (chave in mapa) return resposta(mapa[chave], mapa[chave] !== null);
    return resposta({ error: "não encontrado" }, false);
  });

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: () => "token-de-teste",
    setItem: () => {},
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Sala do Cliente", () => {
  it("mostra o cliente que o servidor devolveu", async () => {
    vi.stubGlobal("fetch", montarFetch({ sessao: sessaoPadrao, resumo: resumoComDados }));
    render(<CustomerPortal />);
    expect(await screen.findByText("Cliente A")).toBeTruthy();
    expect(screen.getByText(/Pessoa A/)).toBeTruthy();
  });

  it("desenha só os itens de menu que vieram do servidor", async () => {
    vi.stubGlobal("fetch", montarFetch({ sessao: sessaoPadrao, resumo: resumoComDados }));
    render(<CustomerPortal />);
    await screen.findByText("Cliente A");
    expect(screen.getByRole("button", { name: /Operações/ })).toBeTruthy();
    // Nada interno aparece, porque o servidor não mandou.
    expect(screen.queryByRole("button", { name: /Precificação/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Comissões/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Oportunidades/ })).toBeNull();
  });

  it("sem dado, convida a esperar o registro em vez de inventar número", async () => {
    vi.stubGlobal(
      "fetch",
      montarFetch({
        sessao: sessaoPadrao,
        resumo: {
          resumo: {
            operacoes: { total: 0, entregas: 0, distanciaKm: 0, ocupacaoMedia: 0 },
            ambiental: { co2EvitadoKg: 0, dieselEvitadoL: 0, reducaoPercent: 0, qualidadeDados: 0, calculos: 0 },
            greenScore: null,
            semDados: true,
          },
        },
      }),
    );
    const { container } = render(<CustomerPortal />);
    expect(await screen.findByText(/Ainda não há operação registrada/)).toBeTruthy();
    // Nenhum indicador é desenhado: sem registro, não há número para mostrar.
    // (O rodapé cita Green Score no aviso legal, por isso a checagem é pelo
    // bloco de indicadores, não pelo texto.)
    expect(container.querySelectorAll(".cp-indicador")).toHaveLength(0);
  });

  it("avisa quando a qualidade dos dados é baixa demais para relatório regulatório", async () => {
    vi.stubGlobal(
      "fetch",
      montarFetch({
        sessao: sessaoPadrao,
        resumo: {
          resumo: {
            ...resumoComDados.resumo,
            ambiental: { ...resumoComDados.resumo.ambiental, qualidadeDados: 40 },
          },
        },
      }),
    );
    render(<CustomerPortal />);
    expect(await screen.findByText(/qualidade dos dados/i)).toBeTruthy();
  });

  it("deixa claro que Green Score não é certificação", async () => {
    vi.stubGlobal("fetch", montarFetch({ sessao: sessaoPadrao, resumo: resumoComDados }));
    render(<CustomerPortal />);
    await screen.findByText("Cliente A");
    expect(screen.getByText(/não constituem certificação/i)).toBeTruthy();
  });

  it("conta sem vínculo vê o motivo, não uma tela quebrada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: "Esta conta não está vinculada a nenhum cliente da To Do Green.",
            }),
        }),
      ),
    );
    render(<CustomerPortal />);
    await waitFor(() =>
      expect(screen.getByText(/não está vinculada a nenhum cliente/i)).toBeTruthy(),
    );
  });
});
