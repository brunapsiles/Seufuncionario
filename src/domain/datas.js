// ===== Datas, recorrência e calendário =====
//
// Aritmética de data em ano-mês-dia, sem fuso horário no meio: o produto fala
// de "vence dia 20", não de instante em UTC. Somar dias com `new Date()` cru é
// o caminho conhecido para a tarefa aparecer um dia antes para quem está a
// oeste de Greenwich.
//
// Também é o único lugar que sabe pular fim de semana e calcular a próxima
// ocorrência de uma tarefa recorrente.

const shiftYmd = (ymd, days) => {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
};

export const addDaysYmd = (ymd, days) => {
  const s = shiftYmd(ymd, days);
  return s
    ? `${s.y}${String(s.m).padStart(2, "0")}${String(s.d).padStart(2, "0")}`
    : "";
};

// Exportado porque as integrações do Google usam o formato com traço.
export const addDaysYmdDashed = (ymd, days) => {
  const s = shiftYmd(ymd, days);
  return s
    ? `${s.y}-${String(s.m).padStart(2, "0")}-${String(s.d).padStart(2, "0")}`
    : "";
};

export const addBusinessDays = (ymd, days) => {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d || !Number.isFinite(days)) return "";
  const date = new Date(y, m - 1, d);
  let remaining = Math.abs(days);
  const step = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    date.setDate(date.getDate() + step);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo mês" },
];

export const nextRecurrenceDue = (ymd, frequency) => {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  else if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  else return ymd;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const todayYearMonth = () => new Date().toISOString().slice(0, 7);

export const shiftYearMonth = (yearMonth, delta) => {
  const [y, m] = String(yearMonth || "")
    .split("-")
    .map(Number);
  if (!y || !m) return todayYearMonth();
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const buildTaskCalendar = (yearMonth, tasks) => {
  const [year, month] = String(yearMonth || "")
    .split("-")
    .map(Number);
  if (!year || !month) return [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const pad = (n) => String(n).padStart(2, "0");
  const byDate = {};
  (tasks || []).forEach((task) => {
    if (!task.due) return;
    if (!byDate[task.due]) byDate[task.due] = [];
    byDate[task.due].push(task);
  });
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const ymd = `${year}-${pad(month)}-${pad(day)}`;
    cells.push({ day, ymd, tasks: byDate[ymd] || [] });
  }
  return cells;
};

export const businessDaysBetween = (fromYmd, toYmd) => {
  const [fy, fm, fd] = String(fromYmd || "")
    .split("-")
    .map(Number);
  const [ty, tm, td] = String(toYmd || "")
    .split("-")
    .map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return null;
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  if (from.getTime() === to.getTime()) return 0;
  const step = to > from ? 1 : -1;
  let count = 0;
  const cursor = new Date(from);
  while (cursor.getTime() !== to.getTime()) {
    cursor.setDate(cursor.getDate() + step);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += step;
  }
  return count;
};
