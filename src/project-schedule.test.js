import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  buildProjectSchedule,
  scheduleRiskSummary,
} from "./features/projects/scheduleDomain.js";

describe("cronograma de projetos", () => {
  it("respeita dias úteis e feriados", () => {
    expect(addWorkingDays("2026-07-31", 2)).toBe("2026-08-03");
    expect(
      addWorkingDays("2026-07-31", 2, { holidays: ["2026-08-03"] }),
    ).toBe("2026-08-04");
  });

  it("reprograma sucessoras e calcula caminho crítico", () => {
    const project = { id: "p1", name: "Implantação", startDate: "2026-08-03" };
    const schedule = buildProjectSchedule(
      [
        { id: "a", projectId: "p1", title: "Planejar", estimatedDays: 2 },
        {
          id: "b",
          projectId: "p1",
          title: "Executar",
          estimatedDays: 3,
          dependsOn: ["a"],
        },
        { id: "c", projectId: "p1", title: "Comunicar", estimatedDays: 1 },
      ],
      project,
    );
    expect(schedule.rows.find((row) => row.id === "b")).toMatchObject({
      start: "2026-08-05",
      end: "2026-08-07",
    });
    expect(schedule.criticalPath).toEqual(["a", "b"]);
    expect(schedule.rows.find((row) => row.id === "c").slack).toBeGreaterThan(0);
  });

  it("detecta ciclos e atrasos contra baseline", () => {
    const schedule = buildProjectSchedule(
      [
        {
          id: "a",
          projectId: "p1",
          estimatedDays: 2,
          dependsOn: ["b"],
          baselineDue: "2026-08-03",
        },
        { id: "b", projectId: "p1", estimatedDays: 2, dependsOn: ["a"] },
      ],
      { id: "p1", startDate: "2026-08-03" },
    );
    expect(schedule.valid).toBe(false);
    expect(schedule.cycles).toEqual(["a", "b"]);
    expect(scheduleRiskSummary(schedule).cyclicTasks).toBe(2);
  });
});
