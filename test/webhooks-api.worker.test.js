import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let n = 0;
const nextIp = () => `198.51.100.${(++n % 240) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id) {
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

// O PUT do espaço usa controle de revisão: mandar sem a revisão atual devolve
// 409 de propósito, para não sobrescrever o que outra aba gravou.
const salvarEspaco = async (user, dados) => {
  const atual = await env.DB.prepare(
    "SELECT revision FROM workspaces WHERE user_id = ?",
  )
    .bind(user.id)
    .first();
  return request("/api/workspace", {
    method: "PUT",
    user,
    body: { data: dados, revision: atual?.revision ?? 0 },
  });
};

const request = (path, { method = "GET", user, body } = {}) => {
  const headers = { "cf-connecting-ip": nextIp() };
  if (user) headers.authorization = `Bearer ${user.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
};

describe("API de envio automático", () => {
  it("exige login: sem token não configura nada", async () => {
    // Um endereço que dispara requisições de saída jamais pode ficar aberto.
    const r = await request("/api/webhooks");
    expect(r.status).toBe(401);
  });

  it("lista vazia e o catálogo de avisos para quem acabou de entrar", async () => {
    const user = await createUser(`wh-${n}-novo`);
    const r = await request("/api/webhooks", { user });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d.webhooks).toEqual([]);
    expect(d.eventos.map((e) => e.id)).toContain("pedido.novo");
  });

  it("cadastra e mostra o segredo UMA vez", async () => {
    const user = await createUser(`wh-${n}-cria`);
    const r = await request("/api/webhooks", {
      method: "POST",
      user,
      body: { url: "https://hooks.exemplo.com/a", events: ["pedido.novo"] },
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d.secret).toMatch(/^[a-f0-9]{64}$/);

    const lista = await (await request("/api/webhooks", { user })).json();
    expect(lista.webhooks).toHaveLength(1);
    // O segredo não pode voltar na listagem: se vazasse, qualquer um forjaria
    // avisos para o destino.
    expect(JSON.stringify(lista)).not.toContain(d.secret);
  });

  it("recusa endereço interno, mesmo vindo de conta legítima", async () => {
    const user = await createUser(`wh-${n}-ssrf`);
    for (const url of [
      "http://exemplo.com/x",
      "https://127.0.0.1/x",
      "https://169.254.169.254/latest/meta-data/",
      "https://10.0.0.1/x",
      "https://app.test/api/ai",
    ]) {
      const r = await request("/api/webhooks", {
        method: "POST",
        user,
        body: { url, events: ["pedido.novo"] },
      });
      expect({ url, status: r.status }).toEqual({ url, status: 400 });
    }
  });

  it("recusa cadastro sem nenhum aviso escolhido", async () => {
    const user = await createUser(`wh-${n}-vazio`);
    const r = await request("/api/webhooks", {
      method: "POST",
      user,
      body: { url: "https://hooks.exemplo.com/a", events: [] },
    });
    expect(r.status).toBe(400);
  });

  it("descarta evento inventado em vez de gravar", async () => {
    const user = await createUser(`wh-${n}-forjado`);
    const r = await request("/api/webhooks", {
      method: "POST",
      user,
      body: {
        url: "https://hooks.exemplo.com/a",
        events: ["pedido.novo", "apagar.tudo"],
      },
    });
    expect(r.status).toBe(200);
    const lista = await (await request("/api/webhooks", { user })).json();
    expect(lista.webhooks[0].events).toEqual(["pedido.novo"]);
  });

  it("uma conta não enxerga nem apaga o envio de outra", async () => {
    const dono = await createUser(`wh-${n}-dono`);
    const outro = await createUser(`wh-${n}-outro`);
    const criado = await (
      await request("/api/webhooks", {
        method: "POST",
        user: dono,
        body: { url: "https://hooks.exemplo.com/dono", events: ["contato.novo"] },
      })
    ).json();

    const lista = await (await request("/api/webhooks", { user: outro })).json();
    expect(lista.webhooks).toEqual([]);

    await request(`/api/webhooks?id=${criado.id}`, { method: "DELETE", user: outro });
    const aindaLa = await (await request("/api/webhooks", { user: dono })).json();
    expect(aindaLa.webhooks).toHaveLength(1);
  });

  it("colaborador não configura envio no espaço de outra pessoa", async () => {
    const dono = await createUser(`wh-${n}-d2`);
    const membro = await createUser(`wh-${n}-m2`);
    await env.DB.prepare(
      `INSERT INTO memberships (id, owner_id, member_id, role, status, created_at)
       VALUES (?, ?, ?, 'colaborador', 'ativo', ?)`,
    )
      .bind(`mb-${n}`, dono.id, membro.id, new Date().toISOString())
      .run();
    const r = await request(`/api/webhooks?owner=${dono.id}`, { user: membro });
    expect(r.status).toBe(403);
  });

  it("o dono apaga o próprio envio", async () => {
    const user = await createUser(`wh-${n}-apaga`);
    const criado = await (
      await request("/api/webhooks", {
        method: "POST",
        user,
        body: { url: "https://hooks.exemplo.com/x", events: ["tarefa.nova"] },
      })
    ).json();
    await request(`/api/webhooks?id=${criado.id}`, { method: "DELETE", user });
    const lista = await (await request("/api/webhooks", { user })).json();
    expect(lista.webhooks).toEqual([]);
  });

  it("gravar o espaço de trabalho dispara o aviso de verdade", async () => {
    // É o coração da funcionalidade: comparar o espaço anterior com o novo, no
    // servidor, é o que permite avisar sem mexer em cada tela do app.
    const user = await createUser(`wh-${n}-fluxo`);
    const criado = await (
      await request("/api/webhooks", {
        method: "POST",
        user,
        body: { url: "https://hooks.exemplo.com/fluxo", events: ["pedido.novo"] },
      })
    ).json();

    const salvar = (dados) => salvarEspaco(user, dados);

    // Primeira gravação: nada é enviado, senão quem chega com 300 pedidos
    // receberia 300 avisos de uma vez.
    await salvar({ orders: [{ id: "p1", customer: "Ana", total: 10 }] });
    let linha = await env.DB.prepare("SELECT * FROM webhooks WHERE id = ?")
      .bind(criado.id)
      .first();
    expect(linha.last_at).toBeFalsy();

    // Segunda gravação, com um pedido novo: aí sim tenta entregar.
    await salvar({
      orders: [
        { id: "p1", customer: "Ana", total: 10 },
        { id: "p2", customer: "Bia", total: 20 },
      ],
    });
    linha = await env.DB.prepare("SELECT * FROM webhooks WHERE id = ?")
      .bind(criado.id)
      .first();
    expect(linha.last_at).toBeTruthy();
  });

  it("falha ao avisar não derruba a gravação dos dados", async () => {
    // O destino deste teste não existe. Ainda assim, salvar precisa funcionar:
    // perder os dados de quem usa porque um sistema externo caiu seria
    // inaceitável.
    const user = await createUser(`wh-${n}-resiliente`);
    await request("/api/webhooks", {
      method: "POST",
      user,
      body: { url: "https://destino-que-nao-existe.invalid/x", events: ["contato.novo"] },
    });
    await salvarEspaco(user, { contacts: [{ id: "c1", name: "Ana" }] });
    const r = await salvarEspaco(user, {
      contacts: [{ id: "c1", name: "Ana" }, { id: "c2", name: "Bia" }],
    });
    expect(r.status).toBe(200);
    const guardado = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(user.id)
      .first();
    expect(JSON.parse(guardado.data).contacts).toHaveLength(2);
  });

  it("tem teto de envios por espaço", async () => {
    const user = await createUser(`wh-${n}-teto`);
    for (let i = 0; i < 10; i++)
      await request("/api/webhooks", {
        method: "POST",
        user,
        body: { url: `https://hooks.exemplo.com/${i}`, events: ["tarefa.nova"] },
      });
    const r = await request("/api/webhooks", {
      method: "POST",
      user,
      body: { url: "https://hooks.exemplo.com/extra", events: ["tarefa.nova"] },
    });
    expect(r.status).toBe(400);
  });
});
