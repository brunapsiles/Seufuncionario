const DAY = 86400000;
const toDate = (ymd) => new Date(`${ymd}T12:00:00Z`);
const asYmd = (date) => date.toISOString().slice(0, 10);
const validYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

export const isWorkingDay = (value, calendar = {}) => {
  if (!validYmd(value)) return false;
  const date = toDate(value);
  const workdays = calendar.workdays || [1, 2, 3, 4, 5];
  return workdays.includes(date.getUTCDay()) && !(calendar.holidays || []).includes(value);
};

export const nextWorkingDay = (value, calendar = {}, offset = 1) => {
  const direction = offset < 0 ? -1 : 1;
  let remaining = Math.abs(Number(offset) || 0);
  const cursor = toDate(value);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + direction);
    if (isWorkingDay(asYmd(cursor), calendar)) remaining -= 1;
  }
  while (!isWorkingDay(asYmd(cursor), calendar))
    cursor.setUTCDate(cursor.getUTCDate() + direction);
  return asYmd(cursor);
};

export const addWorkingDays = (value, duration, calendar = {}) => {
  if (!validYmd(value)) return "";
  const days = Math.max(1, Math.trunc(Number(duration) || 1));
  return nextWorkingDay(value, calendar, days - 1);
};

export const workingDaysBetween = (start, end, calendar = {}) => {
  if (!validYmd(start) || !validYmd(end)) return 0;
  const direction = start <= end ? 1 : -1;
  const cursor = toDate(start);
  let count = 0;
  while (asYmd(cursor) !== end) {
    cursor.setUTCDate(cursor.getUTCDate() + direction);
    if (isWorkingDay(asYmd(cursor), calendar)) count += direction;
  }
  return count;
};

const maxDate = (dates, fallback) =>
  dates.filter(validYmd).sort((a, b) => a.localeCompare(b)).at(-1) || fallback;
const minDate = (dates, fallback) =>
  dates.filter(validYmd).sort((a, b) => a.localeCompare(b))[0] || fallback;

export const buildProjectSchedule = (tasks = [], project = {}, calendar = {}) => {
  const scoped = (tasks || []).filter(
    (task) =>
      task.projectId === project.id ||
      (!task.projectId && task.project && task.project === project.name),
  );
  const byId = new Map(scoped.map((task) => [task.id, task]));
  const successors = new Map(scoped.map((task) => [task.id, []]));
  const indegree = new Map(scoped.map((task) => [task.id, 0]));
  for (const task of scoped) {
    for (const dependencyId of task.dependsOn || []) {
      if (!byId.has(dependencyId)) continue;
      successors.get(dependencyId).push(task.id);
      indegree.set(task.id, indegree.get(task.id) + 1);
    }
  }
  const queue = scoped.filter((task) => indegree.get(task.id) === 0).map((task) => task.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const successorId of successors.get(id) || []) {
      indegree.set(successorId, indegree.get(successorId) - 1);
      if (indegree.get(successorId) === 0) queue.push(successorId);
    }
  }
  const cyclicIds = scoped.filter((task) => !order.includes(task.id)).map((task) => task.id);
  order.push(...cyclicIds);

  const schedule = new Map();
  const projectStart =
    project.startDate ||
    scoped.map((task) => task.startDate).filter(validYmd).sort()[0] ||
    new Date().toISOString().slice(0, 10);
  for (const id of order) {
    const task = byId.get(id);
    const predecessors = (task.dependsOn || [])
      .map((dependencyId) => schedule.get(dependencyId))
      .filter(Boolean);
    const dependencyStart = predecessors.length
      ? nextWorkingDay(maxDate(predecessors.map((item) => item.end), projectStart), calendar, 1)
      : projectStart;
    const start = maxDate([dependencyStart, task.startDate], dependencyStart);
    const duration = Math.max(
      1,
      Math.trunc(
        Number(task.estimatedDays) ||
          (task.due && start ? workingDaysBetween(start, task.due, calendar) + 1 : 1),
      ),
    );
    schedule.set(id, {
      id,
      task,
      start,
      end: addWorkingDays(start, duration, calendar),
      duration,
      predecessors: (task.dependsOn || []).filter((dependencyId) =>
        byId.has(dependencyId),
      ),
      successors: successors.get(id) || [],
      cyclic: cyclicIds.includes(id),
    });
  }

  const projectEnd = maxDate([...schedule.values()].map((item) => item.end), projectStart);
  const latestFinish = new Map();
  for (const id of [...order].reverse()) {
    const row = schedule.get(id);
    const successorStarts = row.successors
      .map((successorId) => latestFinish.get(successorId)?.start)
      .filter(Boolean);
    const end = successorStarts.length
      ? nextWorkingDay(minDate(successorStarts, projectEnd), calendar, -1)
      : projectEnd;
    const start = nextWorkingDay(end, calendar, -(row.duration - 1));
    latestFinish.set(id, { start, end });
    row.slack = Math.max(0, workingDaysBetween(row.start, start, calendar));
    row.critical = row.slack === 0 && !row.cyclic;
  }
  return {
    rows: order.map((id) => schedule.get(id)),
    start: projectStart,
    end: projectEnd,
    duration: workingDaysBetween(projectStart, projectEnd, calendar) + 1,
    criticalPath: order.filter((id) => schedule.get(id).critical),
    cycles: cyclicIds,
    valid: cyclicIds.length === 0,
  };
};

export const ganttPosition = (date, schedule, calendar = {}) => {
  const total = Math.max(1, schedule?.duration || 1);
  return Math.max(
    0,
    Math.min(100, (workingDaysBetween(schedule.start, date, calendar) / total) * 100),
  );
};

export const ganttWidth = (duration, schedule) =>
  Math.max(2, (Math.max(1, Number(duration) || 1) / Math.max(1, schedule?.duration || 1)) * 100);

export const scheduleRiskSummary = (schedule) => ({
  criticalTasks: (schedule?.rows || []).filter((row) => row.critical).length,
  cyclicTasks: (schedule?.cycles || []).length,
  delayedAgainstBaseline: (schedule?.rows || []).filter(
    (row) => row.task.baselineDue && row.end > row.task.baselineDue,
  ).length,
});
