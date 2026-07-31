const text = (value) => String(value ?? "").trim();

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function productStock(product = {}) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.reduce(
      (total, variant) => total + Math.max(0, number(variant.stock)),
      0,
    );
  }
  return Math.max(0, number(product.stock));
}

export function inventoryHealth(products = []) {
  const rows = products.map((product) => {
    const stock = productStock(product);
    const threshold = Math.max(0, number(product.lowStockAlert, 5));
    const status =
      stock <= 0 ? "sem_estoque" : stock <= threshold ? "baixo" : "normal";
    return {
      id: product.id,
      name: text(product.name) || "Produto sem nome",
      stock,
      threshold,
      status,
      suggestedPurchase: Math.max(0, threshold * 2 - stock),
    };
  });
  return {
    rows,
    outOfStock: rows.filter((row) => row.status === "sem_estoque").length,
    lowStock: rows.filter((row) => row.status === "baixo").length,
    healthy: rows.filter((row) => row.status === "normal").length,
  };
}

export function consentedAudience(contacts = [], filter = {}) {
  const query = text(filter.query).toLocaleLowerCase("pt-BR");
  const tags = Array.isArray(filter.tags)
    ? filter.tags.map((tag) => text(tag).toLocaleLowerCase("pt-BR")).filter(Boolean)
    : [];
  return contacts.filter((contact) => {
    const email = text(contact.email);
    if (!email || contact.marketingOptIn !== true) return false;
    if (filter.businessId && contact.businessId !== filter.businessId) return false;
    const haystack = [
      contact.name,
      contact.company,
      contact.email,
      ...(Array.isArray(contact.tags) ? contact.tags : []),
    ]
      .map((value) => text(value).toLocaleLowerCase("pt-BR"))
      .join(" ");
    if (query && !haystack.includes(query)) return false;
    return tags.every((tag) => haystack.includes(tag));
  });
}

export function sprintMetrics(tasks = [], sprintName = "") {
  const sprint = text(sprintName);
  const items = tasks.filter((task) => text(task.sprint) === sprint);
  const points = (subset) =>
    subset.reduce((total, task) => total + Math.max(0, number(task.storyPoints, 1)), 0);
  const completed = items.filter((task) =>
    ["concluído", "concluida", "concluída", "done"].includes(
      text(task.status).toLocaleLowerCase("pt-BR"),
    ),
  );
  const blocked = items.filter(
    (task) =>
      task.blocked === true ||
      text(task.status).toLocaleLowerCase("pt-BR") === "bloqueado",
  );
  const totalPoints = points(items);
  const completedPoints = points(completed);
  return {
    items,
    count: items.length,
    completed: completed.length,
    blocked: blocked.length,
    totalPoints,
    completedPoints,
    progress: totalPoints ? Math.round((completedPoints / totalPoints) * 100) : 0,
  };
}

export function ticketSla(ticket = {}, now = Date.now()) {
  if (["resolvido", "fechado"].includes(text(ticket.status).toLocaleLowerCase("pt-BR"))) {
    return { state: "resolvido", minutesLeft: null };
  }
  const due = Date.parse(ticket.slaDueAt || ticket.sla_due_at || "");
  if (!Number.isFinite(due)) return { state: "sem_sla", minutesLeft: null };
  const minutesLeft = Math.ceil((due - Number(now)) / 60_000);
  return {
    state: minutesLeft < 0 ? "atrasado" : minutesLeft <= 60 ? "em_risco" : "no_prazo",
    minutesLeft,
  };
}

export function analyticsSummary(events = []) {
  const pageViews = events.filter((event) => event.eventName === "page_view");
  const sessions = new Set(events.map((event) => event.sessionId).filter(Boolean));
  const visitors = new Set(events.map((event) => event.visitorId).filter(Boolean));
  const byPath = new Map();
  const byEvent = new Map();
  events.forEach((event) => {
    const path = text(event.path) || "/";
    const name = text(event.eventName) || "evento";
    byPath.set(path, (byPath.get(path) || 0) + 1);
    byEvent.set(name, (byEvent.get(name) || 0) + 1);
  });
  const sorted = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return {
    events: events.length,
    pageViews: pageViews.length,
    sessions: sessions.size,
    visitors: visitors.size,
    topPaths: sorted(byPath).slice(0, 10),
    topEvents: sorted(byEvent).slice(0, 10),
  };
}

export function bookingWindow(page = {}, requestedStart, existing = []) {
  const raw = text(requestedStart);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return { ok: false, error: "Data e horário inválidos." };
  const [, year, month, day, hour, minute] = match.map(Number);
  const start = Date.UTC(year, month - 1, day, hour, minute);
  if (!Number.isFinite(start)) return { ok: false, error: "Data e horário inválidos." };
  const duration = Math.min(480, Math.max(15, number(page.durationMinutes, 30)));
  const end = start + duration * 60_000;
  const weekDay = new Date(start).getUTCDay();
  const weekdays = Array.isArray(page.weekdays) ? page.weekdays.map(Number) : [1, 2, 3, 4, 5];
  if (!weekdays.includes(weekDay))
    return { ok: false, error: "Este dia não está disponível para agendamento." };
  const startMinutes = hour * 60 + minute;
  const [openHour = 9, openMinute = 0] = text(page.startTime || "09:00")
    .split(":")
    .map(Number);
  const [closeHour = 18, closeMinute = 0] = text(page.endTime || "18:00")
    .split(":")
    .map(Number);
  if (
    startMinutes < openHour * 60 + openMinute ||
    startMinutes + duration > closeHour * 60 + closeMinute
  )
    return { ok: false, error: "O horário está fora da disponibilidade." };
  const collision = existing.some((booking) => {
    if (["cancelado", "cancelled"].includes(text(booking.status).toLocaleLowerCase("pt-BR")))
      return false;
    const bookedStart = Date.parse(booking.startAt || booking.start_at || "");
    const bookedEnd = Date.parse(booking.endAt || booking.end_at || "");
    return Number.isFinite(bookedStart) && Number.isFinite(bookedEnd) && start < bookedEnd && end > bookedStart;
  });
  if (collision) return { ok: false, error: "Este horário acabou de ser ocupado." };
  const iso = (value) => new Date(value).toISOString();
  return { ok: true, startAt: iso(start), endAt: iso(end), durationMinutes: duration };
}

