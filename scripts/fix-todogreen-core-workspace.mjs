import fs from "node:fs";

const path = "worker/services/todogreen-core.js";
let content = fs.readFileSync(path, "utf8");
const before = '  const ownerId = url.searchParams.get("owner") || user.id;\n  const access = await resolveCoreAccess(env, user, ownerId);';
const after = '  // Ausência de `owner` significa usar o workspace definido pelo vínculo.\n  // Transformar a ausência em `user.id` fazia cada colaborador abrir um espaço\n  // próprio vazio, mesmo quando `tenant_users` o ligava ao espaço da empresa.\n  const requestedOwnerId = url.searchParams.get("owner");\n  const access = await resolveCoreAccess(env, user, requestedOwnerId);';
if (!content.includes(before)) throw new Error("Trecho do workspace padrão não encontrado.");
content = content.replace(before, after);
fs.writeFileSync(path, content);
