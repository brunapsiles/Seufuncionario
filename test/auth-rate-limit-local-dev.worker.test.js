import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

// O limite geral de `/api/auth/*` é por IP (`cf-connecting-ip`), separado do
// limite por conta que `login-rate-limit.worker.test.js` cobre. Em produção o
// Cloudflare sempre grava esse cabeçalho com o IP real do cliente — o cliente
// não escreve por cima dele.
//
// A primeira versão deste teste simulava "dev local" como cabeçalho ausente —
// e não é isso que `wrangler dev` faz. Rodando de verdade, ele carimba
// `cf-connecting-ip: 127.0.0.1` em toda requisição, então o antigo
// `ip ? 8 : 200` via IP presente e aplicava o teto de produção também em
// dev local. Era exatamente esse 429 silencioso, disparado assim que a
// suíte de E2E criava mais de 8 contas, que fazia `criarConta` travar nos
// 45s de `esperarEntrar` — parecia timing, era limite de taxa. edgeIp()
// (worker/lib/http.js) trata ausência e loopback (127.0.0.1/::1) como o
// mesmo "sem IP de borda".

const registrar = (email, { ip } = {}) =>
  worker.fetch(
    new Request("https://app.test/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ip ? { "cf-connecting-ip": ip } : {}),
      },
      body: JSON.stringify({ name: "Pessoa Teste", email, password: "SenhaForte2026!" }),
    }),
    env,
  );

describe("limite geral de /api/auth por IP", () => {
  it("com IP de borda, bloqueia depois de 8 pedidos no mesmo minuto", async () => {
    const statuses = [];
    for (let i = 0; i < 9; i += 1) {
      const r = await registrar(`ip-fixo-${i}-${crypto.randomUUID()}@exemplo.com.br`, { ip: "203.0.113.9" });
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 201)).toBe(true);
    expect(statuses[8]).toBe(429);
  });

  it("sem cabeçalho nenhum (harness de teste), o teto é bem mais largo", async () => {
    const statuses = [];
    for (let i = 0; i < 20; i += 1) {
      const r = await registrar(`sem-ip-${i}-${crypto.randomUUID()}@exemplo.com.br`);
      statuses.push(r.status);
    }
    expect(statuses.every((s) => s === 201)).toBe(true);
  });

  it("com o loopback que o wrangler dev real carimba (127.0.0.1), o teto também é largo", async () => {
    const statuses = [];
    for (let i = 0; i < 20; i += 1) {
      const r = await registrar(`loopback-${i}-${crypto.randomUUID()}@exemplo.com.br`, { ip: "127.0.0.1" });
      statuses.push(r.status);
    }
    expect(statuses.every((s) => s === 201)).toBe(true);
  });
});
