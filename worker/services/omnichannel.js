const INBOX_CHANNELS = new Set([
  "whatsapp",
  "email",
  "sms",
  "phone",
  "form",
  "note",
]);

const INBOX_DIRECTIONS = new Set(["in", "out"]);

const safeParseJson = (value) => {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeContactHandle = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (/^\S+@\S+\.\S+$/.test(raw)) return `email:${raw}`;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8) return `phone:${digits}`;
  return `handle:${raw.replace(/\s+/g, " ").slice(0, 140)}`;
};

const contactFieldsFrom = (body) => {
  const handle = String(body.contactHandle || body.to || "").trim();
  const name = String(body.contactName || "").trim();
  const normalized = normalizeContactHandle(handle) || normalizeContactHandle(name);
  const email = /^\S+@\S+\.\S+$/.test(handle.toLowerCase())
    ? handle.toLowerCase()
    : "";
  const phone = !email ? handle.replace(/\D/g, "").slice(0, 32) : "";
  return {
    displayName: name || handle,
    normalized,
    email,
    phone,
  };
};

async function upsertOmnichannelContact(env, ownerId, body, now) {
  const fields = contactFieldsFrom(body);
  if (!fields.normalized) return null;
  const existing = await env.DB.prepare(
    `SELECT id FROM contacts
      WHERE workspace_owner_id = ? AND normalized_handle = ?
      LIMIT 1`,
  )
    .bind(ownerId, fields.normalized)
    .first();
  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE contacts
          SET display_name = CASE WHEN ? <> '' THEN ? ELSE display_name END,
              email = CASE WHEN ? <> '' THEN ? ELSE email END,
              phone = CASE WHEN ? <> '' THEN ? ELSE phone END,
              updated_at = ?
        WHERE id = ? AND workspace_owner_id = ?`,
    )
      .bind(
        fields.displayName,
        fields.displayName.slice(0, 160),
        fields.email,
        fields.email,
        fields.phone,
        fields.phone,
        now,
        existing.id,
        ownerId,
      )
      .run();
    return existing.id;
  }
  const id = body.contactId || crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO contacts
        (id, workspace_owner_id, display_name, normalized_handle,
         email, phone, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
    )
      .bind(
        id,
        ownerId,
        fields.displayName.slice(0, 160),
        fields.normalized,
        fields.email,
        fields.phone,
        now,
        now,
      )
      .run();
    return id;
  } catch {
    const row = await env.DB.prepare(
      `SELECT id FROM contacts
        WHERE workspace_owner_id = ? AND normalized_handle = ?
        LIMIT 1`,
    )
      .bind(ownerId, fields.normalized)
      .first();
    return row?.id || null;
  }
}

async function resolveOmnichannelConversation(env, ownerId, body, contactId, now) {
  const explicitId = String(body.conversationId || "").trim();
  if (explicitId) {
    const row = await env.DB.prepare(
      `SELECT id FROM conversations
        WHERE id = ? AND workspace_owner_id = ?
        LIMIT 1`,
    )
      .bind(explicitId, ownerId)
      .first();
    if (row?.id) return row.id;
  }
  const channel = String(body.channel || "").trim();
  const subject = String(body.subject || "").slice(0, 200);
  let row;
  if (contactId) {
    row = await env.DB.prepare(
      `SELECT id FROM conversations
        WHERE workspace_owner_id = ? AND channel = ? AND contact_id = ?
          AND status <> 'closed'
        ORDER BY last_message_at DESC
        LIMIT 1`,
    )
      .bind(ownerId, channel, contactId)
      .first();
  } else {
    row = await env.DB.prepare(
      `SELECT id FROM conversations
        WHERE workspace_owner_id = ? AND channel = ? AND contact_id IS NULL
          AND subject = ? AND status <> 'closed'
        ORDER BY last_message_at DESC
        LIMIT 1`,
    )
      .bind(ownerId, channel, subject)
      .first();
  }
  if (row?.id) return row.id;
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO conversations
      (id, workspace_owner_id, contact_id, channel, subject, status, priority,
       assigned_to, last_message_at, last_message_preview, unread_count,
       meta_json, created_at, updated_at, closed_at)
     VALUES (?, ?, ?, ?, ?, 'open', 'normal', NULL, ?, '', 0, '{}', ?, ?, NULL)`,
  )
    .bind(id, ownerId, contactId, channel, subject, now, now, now)
    .run();
  return id;
}

async function refreshConversationAfterMessage(
  env,
  ownerId,
  conversationId,
  body,
  now,
) {
  const direction = INBOX_DIRECTIONS.has(body.direction) ? body.direction : "out";
  const preview = String(body.body || body.subject || "").slice(0, 240);
  const unreadIncrement = direction === "in" && !body.readAt ? 1 : 0;
  await env.DB.prepare(
    `UPDATE conversations
        SET last_message_at = ?,
            last_message_preview = ?,
            unread_count = unread_count + ?,
            updated_at = ?
      WHERE id = ? AND workspace_owner_id = ?`,
  )
    .bind(now, preview, unreadIncrement, now, conversationId, ownerId)
    .run();
}

export async function insertOmnichannelMessage(
  env,
  ownerId,
  userId,
  body,
  options = {},
) {
  const now = options.createdAt || new Date().toISOString();
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const contactId = await upsertOmnichannelContact(env, ownerId, body, now);
  const conversationId = await resolveOmnichannelConversation(
    env,
    ownerId,
    body,
    contactId,
    now,
  );
  const messageId = options.messageId || crypto.randomUUID();
  const direction = INBOX_DIRECTIONS.has(body.direction) ? body.direction : "out";
  const readAt =
    options.readAt !== undefined
      ? options.readAt
      : direction === "out"
        ? now
        : null;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO conversation_messages
      (id, conversation_id, workspace_owner_id, interaction_id, author_id,
       channel, direction, subject, body, meta_json, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      messageId,
      conversationId,
      ownerId,
      options.interactionId || null,
      userId,
      String(body.channel || "").trim(),
      direction,
      String(body.subject || "").slice(0, 200),
      String(body.body || "").slice(0, 4000),
      JSON.stringify(meta).slice(0, 2000),
      now,
      readAt,
    )
    .run();
  await refreshConversationAfterMessage(
    env,
    ownerId,
    conversationId,
    { ...body, direction, readAt },
    now,
  );
  if (meta.provider || meta.providerMessageId) {
    await env.DB.prepare(
      `INSERT INTO message_deliveries
        (id, message_id, workspace_owner_id, provider, provider_message_id,
         status, error, attempt_count, meta_json, created_at, updated_at,
         sent_at, delivered_at, failed_at)
       VALUES (?, ?, ?, ?, ?, ?, '', 1, ?, ?, ?, ?, NULL, NULL)`,
    )
      .bind(
        crypto.randomUUID(),
        messageId,
        ownerId,
        String(meta.provider || "unknown").slice(0, 80),
        String(meta.providerMessageId || meta.messageId || "").slice(0, 200),
        direction === "in" ? "received" : "sent",
        JSON.stringify(meta).slice(0, 2000),
        now,
        now,
        direction === "out" ? now : null,
      )
      .run();
  }
  return { conversationId, messageId };
}

export async function insertInteraction(env, ownerId, userId, body) {
  const channel = String(body.channel || "").trim();
  if (!INBOX_CHANNELS.has(channel))
    throw new Error("Canal inválido.");
  const direction = INBOX_DIRECTIONS.has(body.direction)
    ? body.direction
    : "out";
  const text = String(body.body || "").slice(0, 4000);
  const subject = String(body.subject || "").slice(0, 200);
  if (!text.trim() && !subject.trim())
    throw new Error("Escreva algo para registrar.");
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO interactions
      (id, workspace_owner_id, author_id, contact_id, contact_name,
       contact_handle, channel, direction, subject, body, meta_json,
       created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      ownerId,
      userId,
      String(body.contactId || "").slice(0, 80) || null,
      String(body.contactName || "").slice(0, 160),
      String(body.contactHandle || "").slice(0, 160),
      channel,
      direction,
      subject,
      text,
      JSON.stringify(meta).slice(0, 2000),
      now,
      direction === "out" ? now : null,
    )
    .run();
  let message = {};
  try {
    message = await insertOmnichannelMessage(env, ownerId, userId, body, {
      interactionId: id,
      createdAt: now,
      readAt: direction === "out" ? now : null,
    });
  } catch (error) {
    console.error("omnichannel message insert", error);
  }
  return { id, createdAt: now, ...message };
}

export async function ensureInteractionsMigrated(env, ownerId) {
  try {
    const rows = await env.DB.prepare(
      `SELECT i.id, i.author_id, i.contact_id, i.contact_name, i.contact_handle,
              i.channel, i.direction, i.subject, i.body, i.meta_json,
              i.created_at, i.read_at
         FROM interactions i
         LEFT JOIN conversation_messages m ON m.interaction_id = i.id
        WHERE i.workspace_owner_id = ? AND m.id IS NULL
        ORDER BY i.created_at ASC
        LIMIT 500`,
    )
      .bind(ownerId)
      .all();
    for (const row of rows.results || []) {
      await insertOmnichannelMessage(
        env,
        ownerId,
        row.author_id || ownerId,
        {
          contactId: row.contact_id,
          contactName: row.contact_name,
          contactHandle: row.contact_handle,
          channel: row.channel,
          direction: row.direction,
          subject: row.subject,
          body: row.body,
          meta: safeParseJson(row.meta_json),
        },
        {
          interactionId: row.id,
          createdAt: row.created_at,
          readAt: row.read_at || null,
        },
      );
    }
  } catch (error) {
    console.error("omnichannel backfill", error);
  }
}
