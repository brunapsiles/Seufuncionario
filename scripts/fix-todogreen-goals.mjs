import fs from "node:fs";

const path = "src/features/logistics/goalsDomain.js";
let content = fs.readFileSync(path, "utf8");
const before = '  const targetValue = Number(input.targetValue ?? input.target_value);';
const after = '  const rawTarget = input.targetValue ?? input.target_value;\n  const targetValue = rawTarget === "" || rawTarget == null ? Number.NaN : Number(rawTarget);';
if (!content.includes(before)) throw new Error("Trecho da validação do alvo não encontrado.");
content = content.replace(before, after);
fs.writeFileSync(path, content);
