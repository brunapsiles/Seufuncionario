import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it, vi } from "vitest";
import worker from "../worker-entry.js";
import {
  NOMES_DOS_ESPECIALISTAS,
  instrucaoDaVertical,
} from "../src/features/logistics/todoGreenAiSpecialists.js";

// A vertical mandava nomes de especialista que o núcleo não conhecia. A
// resolução caía no ramo final (`: "Consultor"`) e o nome era descartado antes
// de virar prompt: as dez cabeças da Central de Trabalho respondiam todas como
// o mesmo consultor genérico.
//
// Estes testes olham o SYSTEM PROMPT que chega no provedor — é o único lugar
// onde dá para provar que o especialista certo foi aplicado. Sem isso, a
// resposta "parece" certa e ninguém percebe que veio do Consultor.

let n = 0;
const nextIp = () => `198.22.0.${(++n % 240) + 1}`;

async function sha256(valor) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let usuario;

beforeAll(async () => {
  const agora = new Date().toISOString();
  const id = "ai-esp-user";
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'h', 's', ?)`,
  ).bind(id, "Pessoa IA", "ia@parceiro.com.br", agora).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  ).bind(`ses-${id}`, id, await sha256(`tok-${id}`), agora).run();
  usuario = { id, token: `tok-${id}` };
});

// Captura o system prompt entregue ao provedor. O worker tenta os provedores
// em cadeia; devolvemos uma resposta válida no primeiro para a cadeia parar.
function capturarPrompt() {
  const capturado = { system: "" };
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (entrada, init) => {
    const alvo = String(entrada?.url || entrada);
    if (alvo.includes("generativelanguage") || alvo.includes("/chat/completions")) {
      const corpo = JSON.parse(init?.body || "{}");
      capturado.system =
        corpo.system_instruction?.parts?.[0]?.text ||
        corpo.messages?.find((m) => m.role === "system")?.content ||
        "";
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return original(entrada, init);
  });
  return {
    capturado,
    restaurar: () => {
      globalThis.fetch = original;
    },
  };
}

const perguntar = (specialist) =>
  worker.fetch(
    new Request("https://app.test/api/ai", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
        authorization: `Bearer ${usuario.token}`,
      },
      body: JSON.stringify({
        specialist,
        prompt: "Analise a carteira e aponte o que está parado com responsável e prazo.",
      }),
    }),
    { ...env, GEMINI_API_KEY: "chave-de-teste" },
    { waitUntil() {}, passThroughOnException() {} },
  );

describe("especialistas da To Do Green chegam ao prompt", () => {
  it("o especialista da vertical entra no papel, em vez de virar Consultor", async () => {
    const { capturado, restaurar } = capturarPrompt();
    try {
      const r = await perguntar("Especialista em Precificação Logística");
      expect(r.status).toBe(200);
      // O nome sobrevive à resolução.
      expect(capturado.system).toContain("Especialista em Precificação Logística");
      // E a instrução aplicada é a da vertical, não a do Consultor.
      expect(capturado.system).toContain("custo carregado");
      expect(capturado.system).not.toContain(
        "Faça um diagnóstico objetivo e recomende ações práticas em ordem de prioridade.",
      );
    } finally {
      restaurar();
    }
  });

  it("cada especialista aplica a própria instrução, não uma compartilhada", async () => {
    const { capturado, restaurar } = capturarPrompt();
    try {
      await perguntar("Especialista ESG");
      // Marca exclusiva da instrução de ESG.
      expect(capturado.system).toContain("nunca certificação");
      expect(capturado.system).not.toContain("custo carregado");
    } finally {
      restaurar();
    }
  });

  it("nome desconhecido continua caindo no Consultor", async () => {
    const { capturado, restaurar } = capturarPrompt();
    try {
      await perguntar("Especialista em Coisa Nenhuma");
      expect(capturado.system).toContain("Consultor");
      expect(capturado.system).not.toContain("Especialista em Coisa Nenhuma");
    } finally {
      restaurar();
    }
  });

  it("os dez especialistas declarados têm instrução própria e distinta", () => {
    expect(NOMES_DOS_ESPECIALISTAS).toHaveLength(10);
    const instrucoes = NOMES_DOS_ESPECIALISTAS.map(instrucaoDaVertical);
    // Nenhuma vazia — um especialista sem instrução é o Consultor com outro nome.
    expect(instrucoes.every((i) => i.length > 120)).toBe(true);
    // Nenhuma repetida — dez nomes com a mesma instrução seria o mesmo defeito.
    expect(new Set(instrucoes).size).toBe(10);
  });
});
