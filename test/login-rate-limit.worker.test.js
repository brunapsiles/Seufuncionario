import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `10.${Math.floor(requestNumber / 250) % 256}.${(requestNumber % 250) + 1}.1`;
};

async function createUser(email, password) {
  const response = await worker.fetch(
    new Request("https://app.test/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
      },
      body: JSON.stringify({ name: "Pessoa Teste", email, password }),
    }),
    env,
  );
  expect(response.status).toBe(201);
}

function login(email, password) {
  return worker.fetch(
    new Request("https://app.test/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
      },
      body: JSON.stringify({ email, password }),
    }),
    env,
  );
}

describe("limite de tentativas de login é por conta, não só por IP", () => {
  it("bloqueia tentativas repetidas contra a mesma conta mesmo vindas de IPs diferentes", async () => {
    const email = "vitima-brute-force@example.com";
    await createUser(email, "senha-correta-123");

    const statuses = [];
    for (let i = 0; i < 9; i++) {
      const response = await login(email, "senha-errada-qualquer");
      statuses.push(response.status);
    }
    // As primeiras tentativas (com senha errada) retornam 401; a partir do
    // limite por conta, passam a ser bloqueadas com 429 mesmo trocando de IP.
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses[8]).toBe(429);

    // Mesmo com a senha certa, a conta continua bloqueada até o limite expirar.
    const withCorrectPassword = await login(email, "senha-correta-123");
    expect(withCorrectPassword.status).toBe(429);
  });

  it("não bloqueia login de uma conta diferente que ainda não atingiu o próprio limite", async () => {
    const emailA = "conta-atacada@example.com";
    const emailB = "outra-conta-qualquer@example.com";
    await createUser(emailA, "senha-correta-123");
    await createUser(emailB, "senha-correta-456");

    for (let i = 0; i < 8; i++) await login(emailA, "senha-errada");
    const blocked = await login(emailA, "senha-errada");
    expect(blocked.status).toBe(429);

    const stillWorks = await login(emailB, "senha-correta-456");
    expect(stillWorks.status).toBe(200);
  });
});
