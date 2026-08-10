const DAY = 24 * 60 * 60 * 1000;

const email = (value) => String(value || "").trim().toLowerCase();
const dateMs = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
};

const owners = (client) => {
  const assigned = (client?.vendedores || []).map((item) => email(item?.email)).filter(Boolean);
  return assigned.length ? [...new Set(assigned)] : ["sem-responsavel"];
};

const hasContactChannel = (client) =>
  (client?.crm?.contacts || []).some((contact) => contact?.active !== false && (contact?.email || contact?.phone));

const isFresh = (client, now, days = 30) => {
  const updated = dateMs(client?.updatedAt || client?.crm?.lastInteractionAt);
  return updated != null && now - updated <= days * DAY;
};

const dueState = (client, now) => {
  const due = dateMs(client?.crm?.nextActionAt);
  if (!client?.crm?.nextAction) return "missing";
  if (due != null && due < now) return "overdue";
  return "planned";
};

const percent = (part, total) => total ? Math.round((part / total) * 100) : 0;

/**
 * Performance de execução da carteira. Intencionalmente não recebe nem lê
 * oportunidades, pipeline, forecast ou faturamento.
 */
export function buildSalesPerformance(clients = [], goals = [], nowValue = Date.now()) {
  const now = typeof nowValue === "number" ? nowValue : Date.parse(nowValue);
  const bySeller = new Map();
  for (const client of clients) {
    for (const seller of owners(client)) {
      if (!bySeller.has(seller)) bySeller.set(seller, []);
      bySeller.get(seller).push(client);
    }
  }

  return [...bySeller.entries()].map(([sellerEmail, portfolio]) => {
    const warm = portfolio.filter((item) => item?.crm?.temperature === "Morno").length;
    const cold = portfolio.filter((item) => item?.crm?.temperature === "Frio").length;
    const hot = portfolio.filter((item) => item?.crm?.temperature === "Quente").length;
    const contactCoverage = portfolio.filter(hasContactChannel).length;
    const freshAccounts = portfolio.filter((item) => isFresh(item, now)).length;
    const overdueActions = portfolio.filter((item) => dueState(item, now) === "overdue").length;
    const missingActions = portfolio.filter((item) => dueState(item, now) === "missing").length;
    const sellerGoals = goals.filter((goal) =>
      goal?.category === "commercial" && (!goal?.ownerEmail || email(goal.ownerEmail) === sellerEmail));
    const goalAttainment = sellerGoals.length
      ? Math.round(sellerGoals.reduce((sum, goal) => sum + Number(goal?.progress?.attainmentPercent || 0), 0) / sellerGoals.length)
      : null;
    const executionScore = Math.round(
      percent(contactCoverage, portfolio.length) * 0.4 +
      percent(freshAccounts, portfolio.length) * 0.35 +
      percent(portfolio.length - overdueActions - missingActions, portfolio.length) * 0.25,
    );
    return {
      sellerEmail,
      portfolioSize: portfolio.length,
      temperatures: { hot, warm, cold, unclassified: portfolio.length - hot - warm - cold },
      contactCoveragePercent: percent(contactCoverage, portfolio.length),
      freshAccountsPercent: percent(freshAccounts, portfolio.length),
      overdueActions,
      missingActions,
      commercialGoals: sellerGoals.length,
      goalAttainmentPercent: goalAttainment,
      executionScore,
    };
  }).sort((a, b) => b.executionScore - a.executionScore || a.sellerEmail.localeCompare(b.sellerEmail));
}

export function summarizeSalesPerformance(rows = []) {
  const portfolioSize = rows.reduce((sum, row) => sum + row.portfolioSize, 0);
  const weighted = (key) => portfolioSize
    ? Math.round(rows.reduce((sum, row) => sum + row[key] * row.portfolioSize, 0) / portfolioSize)
    : 0;
  return {
    sellers: rows.filter((row) => row.sellerEmail !== "sem-responsavel").length,
    portfolioSize,
    contactCoveragePercent: weighted("contactCoveragePercent"),
    freshAccountsPercent: weighted("freshAccountsPercent"),
    overdueActions: rows.reduce((sum, row) => sum + row.overdueActions, 0),
    missingActions: rows.reduce((sum, row) => sum + row.missingActions, 0),
  };
}
