import { describe, expect, it } from "vitest";
import {
  buildDigitalTaskPrompt,
  buildTaskStructurePrompt,
  localTaskStructure,
  parseTaskStructure,
  prioritizeTaskBacklog,
  taskCompletionGaps,
} from "./taskAiDomain.js";

describe("inteligência de tarefas", () => {
  it("normaliza a estrutura JSON da IA sem aceitar campos fora do domínio", () => {
    const result = parseTaskStructure(`texto antes\n\`\`\`json
      {"titulo":"Enviar proposta", "descricao":"Revisar e enviar", "prioridade":"Alta", "area":"Vendas", "diasEstimados":120, "etapas":["Revisar", "Enviar", "Enviar"], "criterios":["PDF pronto"], "riscos":["Prazo curto"], "perguntas":["Qual cliente?"], "especialistaSugerido":"Vendedor"}
    \`\`\``);
    expect(result).toMatchObject({
      title: "Enviar proposta",
      priority: "Alta",
      area: "Vendas",
      estimatedDays: "90",
      subtasks: ["Revisar", "Enviar"],
      acceptanceCriteria: ["PDF pronto"],
      suggestedSpecialist: "Vendedor",
    });
  });

  it("recusa resposta sem JSON aproveitável", () => {
    expect(parseTaskStructure("Aqui está uma ótima tarefa.")).toBeNull();
  });

  it("gera prompt fechado, contextual e sem autorizar invenções", () => {
    const prompt = buildTaskStructurePrompt({
      task: { title: "campanha", description: "lançamento" },
      business: { name: "Padaria Sol", industryActivity: "Padaria" },
      specialists: ["Redator"],
    });
    expect(prompt).toContain("Padaria Sol");
    expect(prompt).toContain("não invente");
    expect(prompt).toContain('"acceptanceCriteria"');
  });

  it("mantém plano local quando nenhum provedor responde", () => {
    const result = localTaskStructure({ title: "Revisar contrato" });
    expect(result.subtasks).toHaveLength(3);
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.questions).toContain("Qual contexto ou requisito não pode faltar?");
  });

  it("impede conclusão quando etapas ou critérios cadastrados estão pendentes", () => {
    const gaps = taskCompletionGaps({
      subtasks: [{ title: "A", done: false }, { title: "B", done: true }],
      acceptanceCriteria: [{ text: "Validado", done: false }],
    });
    expect(gaps).toEqual([
      "1 etapa(s) ainda não concluída(s)",
      "1 critério(s) ainda não confirmado(s)",
    ]);
  });

  it("não bloqueia tarefas antigas sem checklist", () => {
    expect(taskCompletionGaps({ title: "Legada" })).toEqual([]);
  });

  it("prioriza atraso, prazo e importância sem gastar cota de IA", () => {
    const ranked = prioritizeTaskBacklog(
      [
        { id: "normal", title: "Sem pressa", status: "A fazer", priority: "Baixa", due: "2026-08-20" },
        { id: "late", title: "Atrasada", status: "A fazer", priority: "Alta", due: "2026-07-29" },
        { id: "done", title: "Pronta", status: "Concluído", priority: "Alta", due: "2026-07-20" },
      ],
      { now: "2026-07-31" },
    );
    expect(ranked.map((item) => item.task.id)).toEqual(["late", "normal"]);
    expect(ranked[0].reasons.join(" ")).toContain("atrasada");
  });

  it("leva critérios, dependências e anexos para a execução digital", () => {
    const prompt = buildDigitalTaskPrompt(
      {
        title: "Preparar proposta",
        acceptanceCriteria: [{ text: "PDF revisado" }],
        subtasks: [{ title: "Calcular preço" }],
        attachments: [{ name: "brief.txt", content: "Cliente precisa de 20 unidades" }],
      },
      { specialist: "Vendedor", dependencies: [{ title: "Validar estoque" }] },
    );
    expect(prompt).toContain("PDF revisado");
    expect(prompt).toContain("Validar estoque");
    expect(prompt).toContain("Cliente precisa de 20 unidades");
    expect(prompt).toContain("não responda apenas com um plano");
  });
});
