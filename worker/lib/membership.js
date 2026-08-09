// ===== Papel de membro =====
//
// "Dono é dono, o resto depende do vínculo ativo." Consultado por rotas que
// vão de autorização de IA a tarefas e financeiro — motivo pelo qual mora num
// módulo à parte em vez de dentro de qualquer uma delas.

export async function membershipRole(env, userId, ownerId) {
  if (userId === ownerId) return "owner";
  const m = await env.DB.prepare(
    "SELECT role FROM memberships WHERE owner_id = ? AND member_id = ? AND status = 'ativo'",
  )
    .bind(ownerId, userId)
    .first();
  return m ? m.role : null;
}
