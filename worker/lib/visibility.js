// ===== Visibilidade e permissão de registro =====
//
// O espaço de trabalho ainda é um blob único de JSON por usuário — cada
// registro (tarefa, conversa, documento...) carrega o próprio dono,
// compartilhamentos e visibilidade, e é este módulo que decide, registro a
// registro, quem enxerga o quê. Usado por handleWorkspace e por toda rota que
// devolve ou altera um pedaço desse blob para alguém que não é o dono.

export function canSeeTask(record, userId, ctx = {}) {
  if (!record || !userId) return false;
  if (record.ownerId === userId) return true;
  if (record.assigneeId === userId) return true;
  if (
    Array.isArray(record.assignees) &&
    record.assignees.some((a) => a && a.userId === userId)
  )
    return true;
  if (Array.isArray(record.sharedWith) && record.sharedWith.includes(userId))
    return true;
  if (record.visibility === "espaco_todo") return true;
  if (
    Array.isArray(record.interested) &&
    record.interested.some((i) => i && i.userId === userId)
  )
    return true;
  if (
    ctx.teamIds instanceof Set &&
    Array.isArray(record.sharedTeams) &&
    record.sharedTeams.some((t) => ctx.teamIds.has(t))
  )
    return true;
  if (
    ctx.projects instanceof Set &&
    record.visibility === "projeto" &&
    record.project &&
    ctx.projects.has(record.project)
  )
    return true;
  return false;
}

export function canEditRecord(record, userId, ctx = {}) {
  if (!record || !userId) return false;
  if (record.ownerId === userId) return true;
  if (Array.isArray(record.editors) && record.editors.includes(userId))
    return true;
  if (record.sharingPermission !== "editar") return false;
  if (Array.isArray(record.sharedWith) && record.sharedWith.includes(userId))
    return true;
  if (
    ctx.teamIds instanceof Set &&
    Array.isArray(record.sharedTeams) &&
    record.sharedTeams.some((teamId) => ctx.teamIds.has(teamId))
  )
    return true;
  if (
    ctx.projects instanceof Set &&
    record.visibility === "projeto" &&
    record.project &&
    ctx.projects.has(record.project)
  )
    return true;
  if (record.visibility === "espaco_todo") return true;
  return false;
}

export function resolveViewerContext(data, userId) {
  const teamIds = new Set(
    (Array.isArray(data?.teams) ? data.teams : [])
      .filter((t) => Array.isArray(t.memberIds) && t.memberIds.includes(userId))
      .map((t) => t.id),
  );
  const baseCtx = { teamIds, projects: new Set() };
  const projects = new Set(
    (Array.isArray(data?.tasks) ? data.tasks : [])
      .filter((t) => t.project && canSeeTask(t, userId, baseCtx))
      .map((t) => t.project),
  );
  const chatChannels = new Map(
    (Array.isArray(data?.chatChannels) ? data.chatChannels : [])
      .filter((channel) => canSeeTask(channel, userId, { teamIds, projects }))
      .map((channel) => [channel.id, channel]),
  );
  return { teamIds, projects, chatChannels };
}

export function filterRecordsForViewer(records, userId, ctx) {
  return (Array.isArray(records) ? records : []).filter((r) =>
    canSeeTask(r, userId, ctx),
  );
}
