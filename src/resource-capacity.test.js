import { describe, expect, it } from "vitest";
import {
  capacityConflicts,
  createResourceAllocation,
  createResourceProfile,
  enumerateWorkdays,
  resourceCapacity,
  simulateCapacity,
  teamCapacity,
} from "./features/resources/capacityDomain.js";

const profile = createResourceProfile({
  id: "r1",
  name: "Ana",
  userId: "u1",
  weeklyHours: 40,
  hourlyCost: 50,
  hourlyRevenue: 100,
});

describe("planejamento de capacidade e recursos", () => {
  it("calcula dias úteis e capacidade líquida após ausência", () => {
    expect(enumerateWorkdays("2026-08-03", "2026-08-07")).toHaveLength(5);
    const result = resourceCapacity(profile, {
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      absences: [
        {
          resourceId: "r1",
          startDate: "2026-08-05",
          endDate: "2026-08-05",
        },
      ],
    });
    expect(result.grossCapacity).toBe(40);
    expect(result.absenceHours).toBe(8);
    expect(result.availableHours).toBe(32);
  });

  it("consolida alocação percentual, realizado, custos e margem", () => {
    const allocation = createResourceAllocation({
      resourceId: "r1",
      projectId: "p1",
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      allocationPercent: 50,
    });
    const result = resourceCapacity(profile, {
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      allocations: [allocation],
      timeEntries: [{ ownerId: "u1", date: "2026-08-04", hours: 6 }],
    });
    expect(result.plannedHours).toBe(20);
    expect(result.actualHours).toBe(6);
    expect(result.utilization).toBe(50);
    expect(result.plannedCost).toBe(1000);
    expect(result.plannedMargin).toBe(1000);
  });

  it("detecta sobrecarga e consolida a equipe", () => {
    const result = teamCapacity([profile], {
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      allocations: [
        {
          resourceId: "r1",
          startDate: "2026-08-03",
          endDate: "2026-08-07",
          weeklyHours: 50,
        },
      ],
    });
    expect(result.totals.overloadHours).toBe(10);
    expect(capacityConflicts(result.rows)[0]).toMatchObject({
      name: "Ana",
      overloadHours: 10,
    });
  });

  it("simula demanda e recomenda contratações", () => {
    expect(
      simulateCapacity({
        availableHours: 100,
        plannedHours: 90,
        demandHours: 100,
        hireCount: 1,
        hoursPerHire: 40,
      }),
    ).toMatchObject({ gap: -50, requiredHires: 2, status: "Déficit" });
  });
});
