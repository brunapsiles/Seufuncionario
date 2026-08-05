import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

// As solicitações são a primeira superfície do portal em que o cliente
// ESCREVE. Toda a preocupação de isolamento vale em dobro: um pedido gravado
// no cliente errado não é só um dado vazado — é um pedido que a equipe vai
// executar para a empresa errada.

let n = 0;
const nextIp = () => `198.51.100.${(++n % 240) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function criarUsuario(id, email) {
  const token = `tok-${id}`;
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'h', 's', ?)`,
  ).bind(id, `Pessoa ${id}`, email, agora).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  ).bind(`ses-${id}`, id, await sha256(token), agora).run();
  return { id, email, token };
}

async function criarCliente(id, nome) {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_clients
       (id, tenant_id, workspace_owner_id, name, status, portal_enabled,
        created_by, updated_by, created_at, updated_at)
     VALUES (?, 'todogreen', 'dono', ?, 'ativo', 1, 'seed', 'seed', ?, ?)`,
  ).bind(id, nome, agora, agora).run();
}

async function vincular(clientId, email, role = "cliente_gestor") {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_client_users
       (id, tenant_id, client_id, email, role, status, permissions_json,
        invited_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, ?, 'active', '[]', 'seed', ?, ?)`,
  ).bind(crypto.randomUUID(), clientId, email, role, agora, agora).run();
}

const pedir = (caminho, { method = "GET", token, body } = {}) => {
  const headers = { "cf-connecting-ip": nextIp() };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${caminho}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
};

const abrirPedido = (token, extra = {}) =>
  pedir("/api/todogreen/portal/solicitacoes", {
    method: "POST",
    token,
    body: {
      tipo: "nova_rota",
      assunto: "Incluir trecho para a nova filial",
      descricao: "Precisamos atender a filial de Ribeirão a partir de abril.",
      campos: { origem: "Campinas", destino: "Ribeirão Preto" },
      ...extra,
    },
  });

let pessoaA;
let pessoaB;
let leitorA;
let adminA;

beforeAll(async () => {
  await pedir("/api/todogreen/portal/sessao");
  await criarCliente("req-cli-a", "Cliente A");
  await criarCliente("req-cli-b", "Cliente B");
  pessoaA = await criarUsuario("req-u-a", "gestor@req-a.com.br");
  pessoaB = await criarUsuario("req-u-b", "gestor@req-b.com.br");
  leitorA = await criarUsuario("req-u-l", "leitor@req-a.com.br");
  adminA = await criarUsuario("req-u-adm", "admin@req-a.com.br");
  await vincular("req-cli-a", pessoaA.email);
  await vincular("req-cli-b", pessoaB.email);
  await vincular("req-cli-a", leitorA.email, "cliente_leitor");
  await vincular("req-cli-a", adminA.email, "cliente_admin");
});

describe("abrir solicitação", () => {
  it("sem sessão, não abre nada", async () => {
    expect((await abrirPedido(undefined)).status).toBe(401);
  });

  it("o gestor do cliente abre e o pedido nasce com prazo", async () => {
    const r = await abrirPedido(pessoaA.token);
    expect(r.status).toBe(201);
    const { id } = await r.json();

    const lista = await (await pedir("/api/todogreen/portal/solicitacoes", { token: pessoaA.token })).json();
    const pedido = lista.solicitacoes.find((s) => s.id === id);
    expect(pedido.status).toBe("aberta");
    expect(pedido.prazoEm).toBeTruthy();
    expect(new Date(pedido.prazoEm).getTime()).toBeGreaterThan(Date.now());
    expect(pedido.campos.origem).toBe("Campinas");
  });

  it("a descrição vira a primeira mensagem da conversa", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    const r = await pedir(`/api/todogreen/portal/solicitacoes?id=${id}`, { token: pessoaA.token });
    const { mensagens } = await r.json();
    // Sem isto a conversa começaria no meio, sem o que foi pedido.
    expect(mensagens[0].texto).toMatch(/filial de Ribeirão/);
    expect(mensagens[0].lado).toBe("cliente");
  });

  it("pedido incompleto é recusado com o nome do campo que o cliente viu", async () => {
    const r = await abrirPedido(pessoaA.token, { campos: {} });
    expect(r.status).toBe(400);
    const d = await r.json();
    expect(d.error).toMatch(/Origem|Destino/);
  });

  it("leitor não abre solicitação", async () => {
    expect((await abrirPedido(leitorA.token)).status).toBe(403);
  });
});

describe("isolamento entre clientes", () => {
  it("o pedido nasce no cliente da sessão, mesmo se o corpo mandar outro", async () => {
    const r = await abrirPedido(pessoaA.token, {
      clientId: "req-cli-b",
      client_id: "req-cli-b",
      cliente: "req-cli-b",
      tenant_id: "outro",
      assunto: "Pedido plantado",
    });
    expect(r.status).toBe(201);
    const { id } = await r.json();

    const linha = await env.DB.prepare(
      "SELECT client_id, tenant_id FROM todogreen_client_requests WHERE id = ?",
    ).bind(id).first();
    expect(linha.client_id).toBe("req-cli-a");
    expect(linha.tenant_id).toBe("todogreen");
  });

  it("o cliente B não enxerga o pedido do cliente A por nenhum parâmetro", async () => {
    const { id } = await (await abrirPedido(pessoaA.token, { assunto: "Segredo do A" })).json();

    for (const tentativa of [
      "/api/todogreen/portal/solicitacoes",
      "/api/todogreen/portal/solicitacoes?client=req-cli-a",
      "/api/todogreen/portal/solicitacoes?clientId=req-cli-a",
      "/api/todogreen/portal/solicitacoes?client_id=req-cli-a",
      "/api/todogreen/portal/solicitacoes?cliente=req-cli-a",
      `/api/todogreen/portal/solicitacoes?id=${id}`,
    ]) {
      const d = await (await pedir(tentativa, { token: pessoaB.token })).json();
      expect(JSON.stringify(d.solicitacoes || [])).not.toContain("Segredo do A");
      expect(d.mensagens || []).toHaveLength(0);
    }
  });

  it("o cliente B não move o pedido do cliente A", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "PATCH",
      token: pessoaB.token,
      body: { id, status: "cancelada" },
    });
    expect(r.status).toBe(404);

    const linha = await env.DB.prepare(
      "SELECT status FROM todogreen_client_requests WHERE id = ?",
    ).bind(id).first();
    expect(linha.status).toBe("aberta");
  });

  it("o cliente B não escreve na conversa do cliente A", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "POST",
      token: pessoaB.token,
      body: { solicitacaoId: id, mensagem: "mensagem plantada" },
    });
    expect(r.status).toBe(404);

    const linha = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM todogreen_client_request_messages WHERE request_id = ? AND body = ?",
    ).bind(id, "mensagem plantada").first();
    expect(linha.total).toBe(0);
  });
});

describe("conversa e estado", () => {
  it("nota interna da equipe não sai no portal do cliente", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    await env.DB.prepare(
      `INSERT INTO todogreen_client_request_messages
         (id, tenant_id, client_id, request_id, author_side, author_email, author_name,
          body, internal, created_at)
       VALUES (?, 'todogreen', 'req-cli-a', ?, 'equipe', 'time@todogreen', 'Time',
               'margem apertada, negociar', 1, ?)`,
    ).bind(crypto.randomUUID(), id, new Date().toISOString()).run();

    const { mensagens } = await (
      await pedir(`/api/todogreen/portal/solicitacoes?id=${id}`, { token: pessoaA.token })
    ).json();
    // Filtrada no SQL, não escondida na tela.
    expect(JSON.stringify(mensagens)).not.toContain("margem apertada");
  });

  it("responder devolve a bola para a equipe", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    await env.DB.prepare(
      "UPDATE todogreen_client_requests SET status = 'aguardando_cliente' WHERE id = ?",
    ).bind(id).run();

    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "POST",
      token: pessoaA.token,
      body: { solicitacaoId: id, mensagem: "Segue a planilha de volumes." },
    });
    expect(r.status).toBe(200);
    // Deixar em "aguardando cliente" esconderia o pedido da fila da equipe.
    expect((await r.json()).status).toBe("em_analise");
  });

  it("o cliente cancela o que abriu", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "PATCH",
      token: pessoaA.token,
      body: { id, status: "cancelada" },
    });
    expect(r.status).toBe(200);
    const linha = await env.DB.prepare(
      "SELECT status, closed_at, closed_by FROM todogreen_client_requests WHERE id = ?",
    ).bind(id).first();
    expect(linha.status).toBe("cancelada");
    expect(linha.closed_at).toBeTruthy();
    expect(linha.closed_by).toBe(pessoaA.email);
  });

  it("o cliente não conclui um pedido que ninguém respondeu", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "PATCH",
      token: pessoaA.token,
      body: { id, status: "concluida" },
    });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/Aberta/);
  });

  it("pedido encerrado não recebe mensagem nova", async () => {
    const { id } = await (await abrirPedido(pessoaA.token)).json();
    await pedir("/api/todogreen/portal/solicitacoes", {
      method: "PATCH",
      token: pessoaA.token,
      body: { id, status: "cancelada" },
    });
    const r = await pedir("/api/todogreen/portal/solicitacoes", {
      method: "POST",
      token: pessoaA.token,
      body: { solicitacaoId: id, mensagem: "mais uma coisa" },
    });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/nova/i);
  });

  it("a abertura fica registrada na trilha do cliente", async () => {
    const { id } = await (await abrirPedido(pessoaA.token, { assunto: "Auditável" })).json();
    // A trilha é do cliente, mas só o administrador dele a lê: histórico de
    // quem fez o quê não é dado de uso corrente.
    expect((await pedir("/api/todogreen/portal/trilha", { token: pessoaA.token })).status).toBe(403);
    const { eventos } = await (
      await pedir("/api/todogreen/portal/trilha", { token: adminA.token })
    ).json();
    expect(eventos.some((e) => e.action === "solicitacao_aberta" && e.target === id)).toBe(true);
  });
});

describe("catálogo e resumo", () => {
  it("a lista traz os tipos com prazo, para a tela não inventar o seu próprio", async () => {
    const d = await (
      await pedir("/api/todogreen/portal/solicitacoes", { token: pessoaB.token })
    ).json();
    const ocorrencia = d.tipos.find((t) => t.id === "ocorrencia");
    expect(ocorrencia.prazoHoras).toBe(4);
    expect(ocorrencia.rotulo).toBe("Ocorrência na entrega");
  });

  it("o resumo diz de quem é a vez", async () => {
    const d = await (
      await pedir("/api/todogreen/portal/solicitacoes", { token: pessoaA.token })
    ).json();
    expect(d.resumo.abertas).toBeGreaterThan(0);
    expect(d.resumo.texto).toBeTruthy();
  });

  it("leitor lê a própria caixa sem poder escrever", async () => {
    const r = await pedir("/api/todogreen/portal/solicitacoes", { token: leitorA.token });
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(Array.isArray(d.solicitacoes)).toBe(true);
  });
});
