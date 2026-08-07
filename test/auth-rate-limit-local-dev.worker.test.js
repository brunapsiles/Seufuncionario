import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

// O limite geral de `/api/auth/*` é por IP (`cf-connecting-ip`), separado do
// limite por conta que `login-rate-limit.worker.test.js` cobre. Em produção
// o Cloudflare sempre grava esse cabeçalho — o cliente não escreve por cima
// dele. A ausência só acontece em dev local (`wrangler dev` não simula a
// borda), onde a suíte de E2E inteira bate no mesmo processo sem IP nenhum:
// sem um teto mais largo para esse caso, o limite pensado para um atacante
// de verdade travava a própria suíte de teste bem antes de travar qualquer
// ataque.

const registrar = (email, { comIp = true } = {}) =>
  worker.fetch(
    new Request("https://app.test/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(comIp ? { "cf-connecting-ip": "203.0.113.9" } : {}),
      },
      body: JSON.stringify({ name: "Pessoa Teste", email, password: "SenhaForte2026!" }),
    }),
    env,
  );

describe("limite geral de /api/auth por IP", () => {
  it("com IP de borda, bloqueia depois de 8 pedidos no mesmo minuto", async () => {
    const statuses = [];
    for (let i = 0; i < 9; i += 1) {
      const r = await registrar(`ip-fixo-${i}-${crypto.randomUUID()}@exemplo.com.br`);
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 201)).toBe(true);
    expect(statuses[8]).toBe(429);
  });

  it("sem IP de borda (dev local), o teto é bem mais largo — a suíte de E2E não bate nele", async () => {
    const statuses = [];
    for (let i = 0; i < 20; i += 1) {
      const r = await registrar(`sem-ip-${i}-${crypto.randomUUID()}@exemplo.com.br`, { comIp: false });
      statuses.push(r.status);
    }
    expect(statuses.every((s) => s === 201)).toBe(true);
  });
});
