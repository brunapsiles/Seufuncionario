// ===== Log de auditoria =====
//
// Uma linha por ação sensível: quem fez, o quê, em qual alvo. Chamado por
// convites, papéis, colaboradores e pela To Do Green — motivo de morar num
// módulo à parte em vez de dentro de qualquer rota específica.
//
// Nunca deixa uma falha de auditoria derrubar a ação que estava sendo
// auditada; só registra o erro e segue.

export async function logAudit(env, ownerId, actor, action, target, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (id, owner_id, actor_id, actor_name, action, target, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        ownerId,
        actor.id,
        actor.name,
        action,
        target || "",
        details || "",
        new Date().toISOString(),
      )
      .run();
  } catch (e) {
    console.error("audit log", e);
  }
}
