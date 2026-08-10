// ===== Esquema sob demanda: snapshots do espaço de trabalho =====
//
// Cria a tabela e o índice na primeira vez que alguém precisa deles, em vez
// de depender só de migração — usado pela rotina agendada, pelo salvamento
// do espaço e pela listagem de backups, três pontos que não podem duplicar
// esta criação sem um dia divergir (índice num lugar, sem no outro).

export async function ensureWorkspaceSnapshotsSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS workspace_snapshots (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(owner_id, revision)
    )`,
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_owner_created
    ON workspace_snapshots(owner_id, created_at DESC)`,
  ).run();
}
