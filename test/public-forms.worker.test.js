import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import {
  createPublicFormFromProcess,
  normalizePublicForm,
} from "../src/features/forms/publicFormDomain.js";
import { createProcessDefinition } from "../src/features/processes/processDomain.js";

let requestNumber = 0;
const nextIp = () => `198.51.100.${(++requestNumber % 240) + 1}`;

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
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

async function seedWorkspace(ownerId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
     VALUES (?, ?, ?, 0)`,
  )
    .bind(ownerId, JSON.stringify(data), new Date().toISOString())
    .run();
}

async function addMember(ownerId, memberId, role = "colaborador") {
  await env.DB.prepare(
    `INSERT INTO memberships
      (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, ?, ?, 'ativo')`,
  )
    .bind(
      `membership-${ownerId}-${memberId}`,
      ownerId,
      memberId,
      role,
      new Date().toISOString(),
    )
    .run();
}

function request(path, { method = "GET", user, body } = {}) {
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
}

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

describe("formulários públicos avançados", () => {
  it("publica por link e permite incorporação sem expor o app autenticado", async () => {
    const owner = await createUser("form-owner-link");
    const form = normalizePublicForm(
      {
        id: "form-link",
        name: "Solicitação externa",
        slug: "solicitacao-externa",
        fields: [
          { id: "subject", label: "Assunto", type: "text", required: true },
        ],
      },
      {
        ownerId: owner.id,
        workspaceOwnerId: owner.id,
        businessId: "business-1",
      },
    );
    await seedWorkspace(owner.id, { publicForms: [form] });

    const published = await readJson(
      await request("/api/forms/publish", {
        method: "POST",
        user: owner,
        body: { form },
      }),
    );
    expect(published.status).toBe(200);
    expect(published.body.url).toBe(
      "https://app.test/f/solicitacao-externa",
    );

    const page = await request("/f/solicitacao-externa");
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain(
      "frame-ancestors *",
    );
    expect(page.headers.get("x-frame-options")).toBeNull();
    const html = await page.text();
    expect(html).toContain("Solicitação externa");
    expect(html).toContain("Assunto");
    expect(html).toContain("/api/public-forms/solicitacao-externa/submissions");
  });

  it("recebe upload, assinatura e pagamento, gera protocolo e cria lead uma única vez", async () => {
    const owner = await createUser("form-owner-lead");
    const form = normalizePublicForm(
      {
        id: "form-lead",
        name: "Diagnóstico comercial",
        slug: "diagnostico-comercial",
        serviceCode: "LEAD",
        destination: { type: "lead" },
        fields: [
          {
            id: "need",
            label: "Necessidade",
            type: "longtext",
            required: true,
          },
          {
            id: "proof",
            label: "Comprovante",
            type: "file",
            required: true,
          },
          {
            id: "detail",
            label: "Detalhe adicional",
            type: "text",
            required: true,
            condition: { fieldId: "need", operator: "equals", value: "Outro" },
          },
        ],
        signature: { enabled: true, required: true },
        payment: {
          enabled: true,
          required: true,
          method: "pix",
          amount: 25,
          pixCode: "000201010212",
        },
      },
      {
        ownerId: owner.id,
        workspaceOwnerId: owner.id,
        businessId: "business-2",
      },
    );
    await seedWorkspace(owner.id, {
      publicForms: [form],
      leads: [],
      notifications: [],
    });
    await request("/api/forms/publish", {
      method: "POST",
      user: owner,
      body: { form },
    });

    const submission = {
      submissionId: "submission-lead-1",
      contact: {
        name: "Cliente Teste",
        email: "cliente@example.com",
        phone: "11999999999",
      },
      values: { need: "Consultoria" },
      attachments: [
        {
          id: "attachment-1",
          fieldId: "proof",
          name: "comprovante.txt",
          type: "text/plain",
          size: 2,
          dataUrl: "data:text/plain;base64,SGk=",
        },
      ],
      signature: {
        name: "Cliente Teste",
        consent: true,
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      },
      payment: { acknowledged: true },
      privacyConsent: true,
    };
    const first = await readJson(
      await request("/api/public-forms/diagnostico-comercial/submissions", {
        method: "POST",
        body: submission,
      }),
    );
    expect(first.status).toBe(201);
    expect(first.body.protocol).toMatch(/^LEAD-\d{8}-[A-F0-9]{6}$/);
    expect(first.body.conversionStatus).toBe("completed");

    const duplicate = await readJson(
      await request("/api/public-forms/diagnostico-comercial/submissions", {
        method: "POST",
        body: submission,
      }),
    );
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.protocol).toBe(first.body.protocol);
    expect(duplicate.body.duplicate).toBe(true);

    const workspace = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(owner.id)
      .first();
    const data = JSON.parse(workspace.data);
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0]).toMatchObject({
      name: "Cliente Teste",
      status: "Novo",
      sourcePublicFormId: "form-lead",
      publicProtocol: first.body.protocol,
    });
    expect(data.notifications[0].link).toBe("formularios-publicos");

    const stored = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM public_form_submissions WHERE form_id = 'form-lead'",
    ).first();
    expect(stored.total).toBe(1);
    const inbox = await env.DB.prepare(
      "SELECT id, protocol FROM public_form_submissions WHERE form_id = 'form-lead'",
    ).first();
    expect(inbox.protocol).toBe(first.body.protocol);

    const submissions = await readJson(
      await request("/api/forms/submissions?form_id=form-lead", {
        user: owner,
      }),
    );
    expect(submissions.status).toBe(200);
    expect(submissions.body.items[0].attachments[0]).toMatchObject({
      id: "attachment-1",
      name: "comprovante.txt",
      type: "text/plain",
    });
    expect(submissions.body.items[0].attachments[0]).not.toHaveProperty(
      "dataUrl",
    );

    const file = await request(
      `/api/forms/file?submission_id=${inbox.id}&attachment_id=attachment-1`,
      { user: owner },
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("text/plain");
    expect(file.headers.get("content-disposition")).toContain(
      "comprovante.txt",
    );
    expect(await file.text()).toBe("Hi");

    const anonymousFile = await request(
      `/api/forms/file?submission_id=${inbox.id}&attachment_id=attachment-1`,
    );
    expect(anonymousFile.status).toBe(401);
  });

  it("rejeita resposta incompleta e arquivo de tipo inseguro", async () => {
    const owner = await createUser("form-owner-invalid");
    const form = normalizePublicForm(
      {
        id: "form-invalid",
        name: "Cadastro",
        slug: "cadastro-validado",
        fields: [
          { id: "name", label: "Razão social", type: "text", required: true },
          { id: "file", label: "Documento", type: "file", required: true },
        ],
      },
      { ownerId: owner.id, workspaceOwnerId: owner.id },
    );
    await seedWorkspace(owner.id, { publicForms: [form] });
    await request("/api/forms/publish", {
      method: "POST",
      user: owner,
      body: { form },
    });

    const missing = await readJson(
      await request("/api/public-forms/cadastro-validado/submissions", {
        method: "POST",
        body: {
          submissionId: "missing",
          contact: { name: "Pessoa" },
          values: {},
          attachments: [],
          privacyConsent: true,
        },
      }),
    );
    expect(missing.status).toBe(400);
    expect(missing.body.errors).toMatchObject({
      name: expect.stringMatching(/obrigatório/),
      file: expect.stringMatching(/obrigatório/),
    });

    const unsafe = await readJson(
      await request("/api/public-forms/cadastro-validado/submissions", {
        method: "POST",
        body: {
          submissionId: "unsafe",
          contact: { name: "Pessoa" },
          values: { name: "Empresa" },
          attachments: [
            {
              fieldId: "file",
              name: "ataque.svg",
              type: "image/svg+xml",
              size: 10,
              dataUrl: "data:image/svg+xml;base64,PHN2Zz4=",
            },
          ],
          privacyConsent: true,
        },
      }),
    );
    expect(unsafe.status).toBe(400);
    expect(unsafe.body.error).toMatch(/anexo/i);
  });

  it("inicia o processo existente com a mesma regra de campos e protocolo", async () => {
    const owner = await createUser("form-owner-process");
    const process = createProcessDefinition(
      {
        id: "process-public-1",
        name: "Atendimento externo",
        serviceCode: "ATD",
        fields: [
          {
            id: "subject",
            name: "Assunto",
            type: "text",
            required: true,
          },
        ],
      },
      { ownerId: owner.id, businessId: "business-process" },
    );
    const form = createPublicFormFromProcess(
      process,
      { id: "form-process", slug: "atendimento-externo" },
      {
        ownerId: owner.id,
        workspaceOwnerId: owner.id,
        businessId: "business-process",
      },
    );
    await seedWorkspace(owner.id, {
      processes: [process],
      processCases: [],
      formResponses: [],
      publicForms: [form],
      databases: [],
      tasks: [],
      notifications: [],
    });
    await request("/api/forms/publish", {
      method: "POST",
      user: owner,
      body: { form },
    });
    const sent = await readJson(
      await request("/api/public-forms/atendimento-externo/submissions", {
        method: "POST",
        body: {
          submissionId: "process-send-1",
          contact: { name: "Solicitante", email: "solicitante@example.com" },
          values: { subject: "Coleta atrasada" },
          attachments: [],
          privacyConsent: true,
        },
      }),
    );
    expect(sent.status).toBe(201);
    expect(sent.body.conversionStatus).toBe("completed");

    const workspace = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(owner.id)
      .first();
    const data = JSON.parse(workspace.data);
    expect(data.processCases).toHaveLength(1);
    expect(data.processCases[0]).toMatchObject({
      processId: process.id,
      protocol: sent.body.protocol,
      values: { subject: "Coleta atrasada" },
      sourcePublicFormId: form.id,
    });
    expect(data.formResponses).toHaveLength(1);
  });

  it("impede colaborador de publicar ou ler respostas de formulário alheio", async () => {
    const owner = await createUser("form-owner-security");
    const member = await createUser("form-member-security");
    await addMember(owner.id, member.id);
    const form = normalizePublicForm(
      {
        id: "form-security",
        name: "Privado para edição",
        fields: [{ id: "field", label: "Campo", type: "text" }],
        ownerId: owner.id,
        visibility: "espaco_todo",
        sharingPermission: "visualizar",
      },
      { ownerId: owner.id, workspaceOwnerId: owner.id },
    );
    await seedWorkspace(owner.id, { publicForms: [form] });
    await request("/api/forms/publish", {
      method: "POST",
      user: owner,
      body: { form },
    });

    const publish = await request(`/api/forms/publish?owner=${owner.id}`, {
      method: "POST",
      user: member,
      body: { form },
    });
    expect(publish.status).toBe(403);

    const responses = await request(
      `/api/forms/submissions?owner=${owner.id}&form_id=${form.id}`,
      { user: member },
    );
    expect(responses.status).toBe(403);
  });
});
