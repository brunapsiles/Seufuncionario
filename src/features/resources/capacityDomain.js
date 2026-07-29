const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateKey = (value) => String(value || "").slice(0, 10);
const atNoon = (value) => new Date(`${dateKey(value)}T12:00:00Z`);
const dayMs = 86400000;

export const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5];

export const createResourceProfile = (input = {}, context = {}, existing = {}) => {
  const now = new Date().toISOString();
  const weeklyHours = Math.max(0, number(input.weeklyHours || existing.weeklyHours || 40));
  return {
    ...existing,
    id: existing.id || input.id || crypto.randomUUID(),
    name: String(input.name || existing.name || "").trim(),
    userId: input.userId || existing.userId || "",
    role: String(input.role || existing.role || "").trim(),
    skills: Array.isArray(input.skills)
      ? input.skills
      : String(input.skills || existing.skills || "")
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    seniority: String(input.seniority || existing.seniority || "Pleno"),
    weeklyHours,
    workdays:
      Array.isArray(input.workdays) && input.workdays.length
        ? [...new Set(input.workdays.map(Number))].filter((day) => day >= 0 && day <= 6)
        : existing.workdays || DEFAULT_WORKDAYS,
    hourlyCost: Math.max(0, number(input.hourlyCost ?? existing.hourlyCost)),
    hourlyRevenue: Math.max(0, number(input.hourlyRevenue ?? existing.hourlyRevenue)),
    active: input.active ?? existing.active ?? true,
    businessId: context.businessId || existing.businessId || null,
    ownerId: context.ownerId || existing.ownerId || null,
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
};

export const createResourceAbsence = (input = {}, context = {}, existing = {}) => ({
  ...existing,
  id: existing.id || input.id || crypto.randomUUID(),
  resourceId: input.resourceId || existing.resourceId || "",
  type: String(input.type || existing.type || "Férias"),
  startDate: dateKey(input.startDate || existing.startDate),
  endDate: dateKey(input.endDate || existing.endDate || input.startDate),
  hoursPerDay: Math.max(0, number(input.hoursPerDay ?? existing.hoursPerDay)),
  notes: String(input.notes || existing.notes || "").trim(),
  businessId: context.businessId || existing.businessId || null,
  ownerId: context.ownerId || existing.ownerId || null,
  createdAt: existing.createdAt || new Date().toISOString(),
});

export const createResourceAllocation = (
  input = {},
  context = {},
  existing = {},
) => ({
  ...existing,
  id: existing.id || input.id || crypto.randomUUID(),
  resourceId: input.resourceId || existing.resourceId || "",
  projectId: input.projectId || existing.projectId || "",
  projectName: String(input.projectName || existing.projectName || "").trim(),
  startDate: dateKey(input.startDate || existing.startDate),
  endDate: dateKey(input.endDate || existing.endDate || input.startDate),
  weeklyHours: Math.max(0, number(input.weeklyHours ?? existing.weeklyHours)),
  allocationPercent: Math.min(
    100,
    Math.max(0, number(input.allocationPercent ?? existing.allocationPercent)),
  ),
  billable: input.billable ?? existing.billable ?? true,
  status: String(input.status || existing.status || "Planejada"),
  businessId: context.businessId || existing.businessId || null,
  ownerId: context.ownerId || existing.ownerId || null,
  createdAt: existing.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const enumerateWorkdays = (startDate, endDate, workdays = DEFAULT_WORKDAYS) => {
  const start = atNoon(startDate);
  const end = atNoon(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start)
    return [];
  const allowed = new Set(workdays);
  const result = [];
  for (let time = start.getTime(); time <= end.getTime(); time += dayMs) {
    const date = new Date(time);
    if (allowed.has(date.getUTCDay())) result.push(date.toISOString().slice(0, 10));
  }
  return result;
};

const overlaps = (item, startDate, endDate) =>
  (!item.startDate || item.startDate <= endDate) &&
  (!item.endDate || item.endDate >= startDate);

const hoursInPeriod = (weeklyHours, workdays, periodDays) => {
  const daily = number(weeklyHours) / Math.max(1, workdays.length);
  return periodDays.length * daily;
};

export const resourceCapacity = (
  profile,
  { startDate, endDate, absences = [], allocations = [], timeEntries = [] },
) => {
  const days = enumerateWorkdays(startDate, endDate, profile.workdays);
  const dailyHours = number(profile.weeklyHours) / Math.max(1, profile.workdays.length);
  const absenceHours = absences
    .filter(
      (item) =>
        item.resourceId === profile.id && overlaps(item, startDate, endDate),
    )
    .reduce((sum, item) => {
      const affected = enumerateWorkdays(
        item.startDate < startDate ? startDate : item.startDate,
        item.endDate > endDate ? endDate : item.endDate,
        profile.workdays,
      );
      return sum + affected.length * (number(item.hoursPerDay) || dailyHours);
    }, 0);
  const grossCapacity = days.length * dailyHours;
  const availableHours = Math.max(0, grossCapacity - absenceHours);
  const resourceAllocations = allocations.filter(
    (item) =>
      item.resourceId === profile.id && overlaps(item, startDate, endDate),
  );
  const plannedHours = resourceAllocations.reduce((sum, item) => {
    const overlapStart = item.startDate < startDate ? startDate : item.startDate;
    const overlapEnd = item.endDate > endDate ? endDate : item.endDate;
    const allocationDays = enumerateWorkdays(overlapStart, overlapEnd, profile.workdays);
    const weekly =
      number(item.weeklyHours) ||
      (number(profile.weeklyHours) * number(item.allocationPercent)) / 100;
    return sum + hoursInPeriod(weekly, profile.workdays, allocationDays);
  }, 0);
  const actualHours = timeEntries
    .filter(
      (entry) =>
        (entry.resourceId === profile.id ||
          (profile.userId && entry.ownerId === profile.userId)) &&
        dateKey(entry.date) >= startDate &&
        dateKey(entry.date) <= endDate,
    )
    .reduce((sum, entry) => sum + number(entry.hours), 0);
  const overloadHours = Math.max(0, plannedHours - availableHours);
  const idleHours = Math.max(0, availableHours - plannedHours);
  const utilization = availableHours
    ? Math.round((plannedHours / availableHours) * 1000) / 10
    : plannedHours
      ? 100
      : 0;
  const actualCost = actualHours * number(profile.hourlyCost);
  const plannedCost = plannedHours * number(profile.hourlyCost);
  const plannedRevenue = resourceAllocations.reduce((sum, item) => {
    if (!item.billable) return sum;
    const overlapStart = item.startDate < startDate ? startDate : item.startDate;
    const overlapEnd = item.endDate > endDate ? endDate : item.endDate;
    const allocationDays = enumerateWorkdays(overlapStart, overlapEnd, profile.workdays);
    const weekly =
      number(item.weeklyHours) ||
      (number(profile.weeklyHours) * number(item.allocationPercent)) / 100;
    return (
      sum +
      hoursInPeriod(weekly, profile.workdays, allocationDays) *
        number(profile.hourlyRevenue)
    );
  }, 0);
  return {
    resourceId: profile.id,
    name: profile.name,
    grossCapacity,
    absenceHours,
    availableHours,
    plannedHours,
    actualHours,
    overloadHours,
    idleHours,
    utilization,
    plannedCost,
    actualCost,
    plannedRevenue,
    plannedMargin: plannedRevenue - plannedCost,
    allocations: resourceAllocations.length,
  };
};

export const teamCapacity = (profiles = [], input = {}) => {
  const rows = profiles
    .filter((profile) => profile.active !== false)
    .map((profile) => resourceCapacity(profile, input));
  const totals = rows.reduce(
    (result, row) => {
      for (const key of [
        "grossCapacity",
        "absenceHours",
        "availableHours",
        "plannedHours",
        "actualHours",
        "overloadHours",
        "idleHours",
        "plannedCost",
        "actualCost",
        "plannedRevenue",
        "plannedMargin",
      ])
        result[key] += row[key];
      return result;
    },
    {
      grossCapacity: 0,
      absenceHours: 0,
      availableHours: 0,
      plannedHours: 0,
      actualHours: 0,
      overloadHours: 0,
      idleHours: 0,
      plannedCost: 0,
      actualCost: 0,
      plannedRevenue: 0,
      plannedMargin: 0,
    },
  );
  totals.utilization = totals.availableHours
    ? Math.round((totals.plannedHours / totals.availableHours) * 1000) / 10
    : 0;
  return { rows, totals };
};

export const capacityConflicts = (rows = []) =>
  rows
    .filter((row) => row.overloadHours > 0)
    .map((row) => ({
      resourceId: row.resourceId,
      name: row.name,
      overloadHours: row.overloadHours,
      severity:
        row.overloadHours > row.availableHours * 0.25 ? "Crítica" : "Atenção",
    }));

export const simulateCapacity = ({
  availableHours = 0,
  plannedHours = 0,
  demandHours = 0,
  hireCount = 0,
  hoursPerHire = 40,
}) => {
  const projectedCapacity =
    number(availableHours) + Math.max(0, number(hireCount)) * number(hoursPerHire);
  const projectedDemand = number(plannedHours) + Math.max(0, number(demandHours));
  const gap = projectedCapacity - projectedDemand;
  return {
    projectedCapacity,
    projectedDemand,
    gap,
    requiredHires:
      gap >= 0 || !number(hoursPerHire)
        ? 0
        : Math.ceil(Math.abs(gap) / number(hoursPerHire)),
    status: gap < 0 ? "Déficit" : gap === 0 ? "Equilíbrio" : "Capacidade livre",
  };
};
