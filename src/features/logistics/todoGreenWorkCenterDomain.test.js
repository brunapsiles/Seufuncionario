import { describe, expect, it } from "vitest";
import {
  WORK_CENTER_AUTOMATION_ACTIONS,
  WORK_CENTER_FIELD_TYPES,
  WORK_CENTER_OBJECT_TYPES,
  WORK_CENTER_VIEWS,
  buildWorkCenterAiRequest,
  buildWorkCenterCalendar,
  createWorkCenterObject,
  evaluateAutomationRule,
  filterWorkCenterItems,
  summarizeWorkCenter,
  validateWorkCenterField,
} from "./todoGreenWorkCenterDomain.js";

describe("To Do Green Central de Trabalho", () => {
  it("supports enterprise work objects, fields and views", () => {
    expect(WORK_CENTER_OBJECT_TYPES).toContain("rfq");
    expect(WORK_CENTER_OBJECT_TYPES).toContain("operacao");
    expect(WORK_CENTER_OBJECT_TYPES).toContain("auditoria");
    expect(WORK_CENTER_FIELD_TYPES).toContain("formula");
    expect(WORK_CENTER_FIELD_TYPES).toContain("rollup");
    expect(WORK_CENTER_FIELD_TYPES).toContain("ai");
    expect(WORK_CENTER_VIEWS).toContain("gantt");
    expect(WORK_CENTER_VIEWS).toContain("workload");
    expect(WORK_CENTER_AUTOMATION_ACTIONS).toContain("create-operation");
    expect(WORK_CENTER_AUTOMATION_ACTIONS).toContain("call-ai");
  });

  it("creates a normalized object without duplicating existing entities", () => {
    const item = createWorkCenterObject(
      {
        type: "operacao",
        title: " Implantação Mercado Livre ",
        relations: [{ entity: "client", id: "client-1" }],
      },
      { businessId: "todogreen", ownerId: "owner-1" },
    );
    expect(item.type).toBe("operacao");
    expect(item.title).toBe("Implantação Mercado Livre");
    expect(item.businessId).toBe("todogreen");
    expect(item.ownerId).toBe("owner-1");
    expect(item.relations[0]).toEqual({ entity: "client", id: "client-1" });
  });

  it("validates custom field definitions", () => {
    expect(validateWorkCenterField({ id: "margin", label: "Margem", type: "percentage" }).valid).toBe(true);
    const invalid = validateWorkCenterField({ id: "x", label: "Campo", type: "unknown" });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain("field.type is invalid");
  });

  it("evaluates automation conditions", () => {
    const rule = {
      trigger: "status-changed",
      conditions: [
        { field: "status", operator: "equals", value: "aprovado" },
        { field: "margin", operator: "greater-than", value: 20 },
      ],
    };
    expect(evaluateAutomationRule(rule, { status: "aprovado", fields: { margin: 25 } }, { type: "status-changed" })).toBe(true);
    expect(evaluateAutomationRule(rule, { status: "aprovado", fields: { margin: 10 } }, { type: "status-changed" })).toBe(false);
  });

  it("uses the existing AI endpoint and specialist routing", () => {
    const request = buildWorkCenterAiRequest({
      action: "identify-risks",
      specialist: "operations",
      item: { title: "Nova rota", fields: { sla: "D+1" } },
    });
    expect(request.endpoint).toBe("/api/ai");
    expect(request.specialist).toBe("Especialista em Operações Logísticas");
    expect(request.prompt).toContain("identify-risks");
  });

  it("summarizes overdue, blocked and approval work", () => {
    const items = [
      { type: "tarefa", status: "novo", fields: { dueDate: "2020-01-01" }, dependencies: [] },
      { type: "operacao", status: "bloqueado", fields: {}, dependencies: [] },
      { type: "aprovacao", status: "pendente", fields: {}, dependencies: [] },
      { type: "tarefa", status: "concluido", fields: { dueDate: "2020-01-01" }, dependencies: [] },
    ];
    const summary = summarizeWorkCenter(items);
    expect(summary.total).toBe(4);
    expect(summary.overdue).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.pendingApprovals).toBe(1);
  });

  it("filtra por quadro, status e busca sem perder acentos", () => {
    const items = [
      { id: "1", boardId: "comercial", title: "Reunião com Compras", client: "Adidas", status: "novo", dueDate: "2026-08-20" },
      { id: "2", boardId: "operacoes", title: "Validar rota", client: "Amazon", status: "novo", dueDate: "2026-08-19" },
      { id: "3", boardId: "comercial", title: "Proposta", client: "Renner", status: "concluido", dueDate: "2026-08-18" },
    ];
    expect(filterWorkCenterItems(items, { boardId: "comercial", status: "novo", search: "reuniao" }).map((item) => item.id)).toEqual(["1"]);
  });

  it("monta seis semanas de agenda e prioriza o trabalho crítico", () => {
    const calendar = buildWorkCenterCalendar("2026-08", [
      { id: "baixa", title: "Depois", dueDate: "2026-08-11", priority: "baixa" },
      { id: "critica", title: "Agora", dueDate: "2026-08-11", priority: "critica" },
    ]);
    expect(calendar).toHaveLength(42);
    const day = calendar.find((cell) => cell.date === "2026-08-11");
    expect(day.currentMonth).toBe(true);
    expect(day.items.map((item) => item.id)).toEqual(["critica", "baixa"]);
    expect(buildWorkCenterCalendar("2026-13", [])).toEqual([]);
  });
});
