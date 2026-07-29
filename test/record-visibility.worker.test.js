import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `192.0.2.${(requestNumber % 250) + 1}`;
};

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id) {
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users
      (id, name, email, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `session-${id}`,
      id,
      await sha256(token),
      "2099-01-01T00:00:00.000Z",
      now,
    )
    .run();
  return { id, token };
}

async function addMember(ownerId, memberId, role = "colaborador") {
  await env.DB.prepare(
    `INSERT INTO memberships (id, owner_id, member_id, role, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'ativo')`,
  )
    .bind(`membership-${ownerId}-${memberId}`, ownerId, memberId, role, new Date().toISOString())
    .run();
}

function workspaceRequest(user, { method = "GET", owner, body } = {}) {
  const suffix = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return worker.fetch(
    new Request(`https://app.test/api/workspace${suffix}`, {
      method,
      headers: {
        authorization: `Bearer ${user.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

describe("visibilidade de leads, documentos e sites com D1 local", () => {
  it("filtra leads, documentos e sites por dono/compartilhamento para colaborador", async () => {
    const owner = await createUser("rec-owner-1");
    const member = await createUser("rec-member-1");
    const stranger = await createUser("rec-stranger-1");
    await addMember(owner.id, member.id, "colaborador");

    const data = {
      leads: [
        { id: "lead-own", name: "Lead próprio", ownerId: member.id },
        { id: "lead-hidden", name: "Lead alheio", ownerId: stranger.id },
        { id: "lead-shared", name: "Lead compartilhado", ownerId: stranger.id, sharedWith: [member.id] },
      ],
      documents: [
        { id: "doc-own", title: "Doc próprio", ownerId: member.id },
        { id: "doc-hidden", title: "Doc alheio", ownerId: stranger.id },
      ],
      sites: [
        { id: "site-own", name: "Site próprio", ownerId: member.id },
        { id: "site-open", name: "Site do espaço todo", ownerId: stranger.id, visibility: "espaco_todo" },
        { id: "site-hidden", name: "Site alheio", ownerId: stranger.id },
      ],
    };
    await workspaceRequest(owner, { method: "PUT", body: { data, revision: 0 } });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.leads.map((l) => l.id).sort()).toEqual([
      "lead-own",
      "lead-shared",
    ]);
    expect(asMember.body.data.documents.map((d) => d.id)).toEqual(["doc-own"]);
    expect(asMember.body.data.sites.map((s) => s.id).sort()).toEqual([
      "site-open",
      "site-own",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.leads).toHaveLength(3);
    expect(asOwner.body.data.documents).toHaveLength(2);
    expect(asOwner.body.data.sites).toHaveLength(3);
  });

  it("colaborador cria um documento próprio sem apagar documentos ocultos", async () => {
    const owner = await createUser("rec-owner-2");
    const member = await createUser("rec-member-2");
    const stranger = await createUser("rec-stranger-2");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          documents: [
            { id: "doc-hidden-2", title: "Confidencial", ownerId: stranger.id },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.documents).toHaveLength(0);

    const newDoc = {
      id: "doc-new-by-member",
      title: "Meu documento",
      ownerId: member.id,
    };
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: { documents: [newDoc] },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.documents.map((d) => d.id).sort()).toEqual([
      "doc-hidden-2",
      "doc-new-by-member",
    ]);
  });

  it("colaborador só vê o próprio plano de desenvolvimento, gestor e dono veem todos", async () => {
    const owner = await createUser("rec-owner-3");
    const member = await createUser("rec-member-3");
    const other = await createUser("rec-other-3");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          developmentPlans: [
            {
              id: "plan-mine",
              title: "Meu plano",
              ownerId: owner.id,
              assigneeId: member.id,
            },
            {
              id: "plan-other",
              title: "Plano de outra pessoa",
              ownerId: owner.id,
              assigneeId: other.id,
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.developmentPlans.map((p) => p.id)).toEqual([
      "plan-mine",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.developmentPlans).toHaveLength(2);
  });

  it("filtra lançamentos financeiros por dono e protege legados sem dono definido", async () => {
    const owner = await createUser("rec-owner-4");
    const member = await createUser("rec-member-4");
    const other = await createUser("rec-other-4");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          transactions: [
            { id: "tx-mine", description: "Minha comissão", value: 100, ownerId: member.id },
            { id: "tx-other", description: "Comissão de outro", value: 200, ownerId: other.id },
            { id: "tx-legacy", description: "Lançamento antigo", value: 300 },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.transactions.map((t) => t.id).sort()).toEqual([
      "tx-mine",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.transactions).toHaveLength(3);
  });

  it("agendamentos, produtos, pedidos, veículos e fretes continuam visíveis a todos por padrão, mas podem ser restritos", async () => {
    const owner = await createUser("rec-owner-5");
    const member = await createUser("rec-member-5");
    const other = await createUser("rec-other-5");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          appointments: [
            { id: "appt-shared", title: "Corte", ownerId: owner.id, visibility: "espaco_todo" },
            { id: "appt-private", title: "Reunião reservada", ownerId: other.id, visibility: "privado" },
          ],
          products: [
            { id: "prod-shared", name: "Camiseta", ownerId: owner.id, visibility: "espaco_todo" },
            { id: "prod-private", name: "Amostra reservada", ownerId: other.id, visibility: "privado" },
          ],
          vehicles: [
            { id: "veh-shared", plate: "ABC1234", ownerId: owner.id, visibility: "espaco_todo" },
            { id: "veh-private", plate: "XYZ9999", ownerId: other.id, visibility: "privado" },
          ],
          trips: [
            { id: "trip-shared", origin: "SP", destination: "RJ", ownerId: owner.id, visibility: "espaco_todo" },
            { id: "trip-private", origin: "SP", destination: "MG", ownerId: other.id, visibility: "privado" },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.appointments.map((a) => a.id)).toEqual([
      "appt-shared",
    ]);
    expect(asMember.body.data.products.map((p) => p.id)).toEqual([
      "prod-shared",
    ]);
    expect(asMember.body.data.vehicles.map((v) => v.id)).toEqual([
      "veh-shared",
    ]);
    expect(asMember.body.data.trips.map((t) => t.id)).toEqual([
      "trip-shared",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.appointments).toHaveLength(2);
    expect(asOwner.body.data.products).toHaveLength(2);
    expect(asOwner.body.data.vehicles).toHaveLength(2);
    expect(asOwner.body.data.trips).toHaveLength(2);
  });

  it("mantém a configuração de cada dashboard privada ao usuário", async () => {
    const owner = await createUser("rec-owner-dashboard");
    const member = await createUser("rec-member-dashboard");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          dashboardConfigs: [
            {
              id: "dashboard-owner",
              name: "Painel do dono",
              ownerId: owner.id,
              visibility: "privado",
            },
            {
              id: "dashboard-member",
              name: "Painel do membro",
              ownerId: member.id,
              visibility: "privado",
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.dashboardConfigs.map((item) => item.id)).toEqual([
      "dashboard-member",
    ]);

    const changed = {
      ...asMember.body.data.dashboardConfigs[0],
      name: "Minha visão operacional",
    };
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: { dashboardConfigs: [changed] },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(
      asOwner.body.data.dashboardConfigs.find(
        (item) => item.id === "dashboard-owner",
      ).name,
    ).toBe("Painel do dono");
    expect(
      asOwner.body.data.dashboardConfigs.find(
        (item) => item.id === "dashboard-member",
      ).name,
    ).toBe("Minha visão operacional");
  });

  it("isola grupos e mensagens diretas, mas permite reação segura em canais visíveis", async () => {
    const owner = await createUser("rec-chat-owner");
    const member = await createUser("rec-chat-member");
    const other = await createUser("rec-chat-other");
    await addMember(owner.id, member.id, "colaborador");
    await addMember(owner.id, other.id, "colaborador");
    const now = "2026-07-29T18:00:00.000Z";
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          chatChannels: [
            {
              id: "chat-public",
              type: "channel",
              name: "geral",
              ownerId: owner.id,
              visibility: "espaco_todo",
            },
            {
              id: "chat-shared",
              type: "group",
              name: "Projeto compartilhado",
              ownerId: owner.id,
              visibility: "compartilhado",
              sharedWith: [owner.id, member.id],
              memberIds: [owner.id, member.id],
            },
            {
              id: "chat-private",
              type: "direct",
              name: "Conversa privada",
              ownerId: member.id,
              visibility: "compartilhado",
              sharedWith: [member.id, other.id],
              memberIds: [member.id, other.id],
            },
          ],
          chatMessages: [
            {
              id: "message-public",
              channelId: "chat-public",
              body: "Mensagem original",
              authorId: owner.id,
              authorName: "Dono",
              ownerId: owner.id,
              visibility: "espaco_todo",
              reactions: { "👍": [owner.id] },
              createdAt: now,
            },
            {
              id: "message-shared",
              channelId: "chat-shared",
              body: "Mensagem do grupo",
              authorId: owner.id,
              ownerId: owner.id,
              visibility: "compartilhado",
              sharedWith: [owner.id, member.id],
              createdAt: now,
            },
            {
              id: "message-private",
              channelId: "chat-private",
              body: "Segredo entre membros",
              authorId: member.id,
              ownerId: member.id,
              visibility: "compartilhado",
              sharedWith: [member.id, other.id],
              createdAt: now,
            },
          ],
          chatReadStates: [
            {
              id: "read-member",
              channelId: "chat-public",
              userId: member.id,
              ownerId: member.id,
              visibility: "privado",
            },
            {
              id: "read-other",
              channelId: "chat-private",
              userId: other.id,
              ownerId: other.id,
              visibility: "privado",
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.chatChannels.map((item) => item.id).sort()).toEqual([
      "chat-private",
      "chat-public",
      "chat-shared",
    ]);
    expect(asMember.body.data.chatMessages.map((item) => item.id).sort()).toEqual([
      "message-private",
      "message-public",
      "message-shared",
    ]);
    expect(asMember.body.data.chatReadStates.map((item) => item.id)).toEqual([
      "read-member",
    ]);

    const changedMessages = asMember.body.data.chatMessages.map((message) =>
      message.id === "message-public"
        ? {
            ...message,
            body: "Tentativa de alterar texto alheio",
            visibility: "privado",
            reactions: { "👍": [member.id] },
            pinnedAt: "2026-07-29T18:05:00.000Z",
            pinnedBy: member.id,
          }
        : message,
    );
    changedMessages.push({
      id: "message-new",
      channelId: "chat-public",
      body: "Nova mensagem do membro",
      authorId: "forjado",
      ownerId: member.id,
      visibility: "privado",
      sharedWith: [other.id],
      createdAt: "2026-07-29T18:06:00.000Z",
    });
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: {
          ...asMember.body.data,
          chatMessages: changedMessages,
        },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(
      asOwner.body.data.chatChannels.some((item) => item.id === "chat-private"),
    ).toBe(false);
    expect(
      asOwner.body.data.chatMessages.some((item) => item.id === "message-private"),
    ).toBe(false);
    const original = asOwner.body.data.chatMessages.find(
      (item) => item.id === "message-public",
    );
    expect(original).toMatchObject({
      body: "Mensagem original",
      visibility: "espaco_todo",
      pinnedBy: member.id,
    });
    expect(original.reactions["👍"].sort()).toEqual(
      [owner.id, member.id].sort(),
    );
    const created = asOwner.body.data.chatMessages.find(
      (item) => item.id === "message-new",
    );
    expect(created).toMatchObject({
      authorId: member.id,
      ownerId: member.id,
      visibility: "espaco_todo",
      sharedWith: [],
    });
  });

  it("isola conteúdo sincronizado e respeita a permissão separada de edição", async () => {
    const owner = await createUser("rec-sync-owner");
    const member = await createUser("rec-sync-member");
    const other = await createUser("rec-sync-other");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          syncedBlocks: [
            {
              id: "sync-own",
              name: "Componente do membro",
              content: "Versão inicial",
              ownerId: member.id,
              visibility: "privado",
            },
            {
              id: "sync-readonly",
              name: "Política para consulta",
              content: "Texto protegido",
              ownerId: other.id,
              visibility: "espaco_todo",
              sharingPermission: "visualizar",
            },
            {
              id: "sync-editable",
              name: "Texto compartilhado",
              content: "Texto anterior",
              ownerId: other.id,
              visibility: "espaco_todo",
              sharingPermission: "editar",
            },
            {
              id: "sync-hidden",
              name: "Componente reservado",
              content: "Segredo",
              ownerId: other.id,
              visibility: "privado",
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(
      asMember.body.data.syncedBlocks.map((item) => item.id).sort(),
    ).toEqual(["sync-editable", "sync-own", "sync-readonly"]);

    const changed = asMember.body.data.syncedBlocks.map((item) => ({
      ...item,
      content: `Alterado: ${item.id}`,
      visibility: "privado",
    }));
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: { ...asMember.body.data, syncedBlocks: changed },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    const byId = Object.fromEntries(
      asOwner.body.data.syncedBlocks.map((item) => [item.id, item]),
    );
    expect(byId["sync-own"].content).toBe("Alterado: sync-own");
    expect(byId["sync-readonly"].content).toBe("Texto protegido");
    expect(byId["sync-editable"].content).toBe("Alterado: sync-editable");
    expect(byId["sync-editable"].visibility).toBe("espaco_todo");
    expect(byId["sync-hidden"].content).toBe("Segredo");
  });
});
