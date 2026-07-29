const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
};

export const relationIds = (value) => [...new Set(asArray(value).map(String))];

export const relationRecords = (bases, field, value) => {
  const target = (bases || []).find((base) => base.id === field?.targetBaseId);
  if (!target) return [];
  const ids = new Set(relationIds(value));
  return (target.rows || []).filter((row) => ids.has(String(row.id)));
};

export const recordTitle = (base, row) => {
  if (!row) return "";
  const primary =
    (base?.fields || []).find((field) => field.primary) ||
    (base?.fields || []).find(
      (field) => !["formula", "lookup", "rollup"].includes(field.type),
    ) ||
    base?.fields?.[0];
  const value = primary ? row.cells?.[primary.id] : "";
  return value == null ? "" : String(value);
};

export const lookupValues = (bases, sourceRow, lookupField, explicitSourceBase) => {
  const sourceBase =
    explicitSourceBase ||
    (bases || []).find((base) =>
      (base.fields || []).some((field) => field.id === lookupField?.relationFieldId),
    );
  const relationField = sourceBase?.fields?.find(
    (field) => field.id === lookupField?.relationFieldId,
  );
  const targetBase = (bases || []).find(
    (base) => base.id === relationField?.targetBaseId,
  );
  const targetField = targetBase?.fields?.find(
    (field) => field.id === lookupField?.targetFieldId,
  );
  if (!relationField || !targetBase || !targetField) return [];
  return relationRecords(bases, relationField, sourceRow?.cells?.[relationField.id])
    .map((row) => row.cells?.[targetField.id])
    .filter((value) => value !== undefined && value !== null && value !== "");
};

const numeric = (values) =>
  values
    .map((value) => {
      if (typeof value === "number") return value;
      let clean = String(value).replace(/[^\d,.-]/g, "");
      if (clean.includes(",")) clean = clean.replace(/\./g, "").replace(",", ".");
      return Number(clean);
    })
    .filter(Number.isFinite);

export const aggregateValues = (values, operation = "count") => {
  const clean = (values || []).filter(
    (value) => value !== undefined && value !== null && value !== "",
  );
  if (operation === "count") return clean.length;
  if (operation === "count_unique") return new Set(clean.map(String)).size;
  if (operation === "join") return clean.join(", ");
  const numbers = numeric(clean);
  if (!numbers.length) return 0;
  if (operation === "sum") return numbers.reduce((sum, value) => sum + value, 0);
  if (operation === "average")
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (operation === "min") return Math.min(...numbers);
  if (operation === "max") return Math.max(...numbers);
  return clean.length;
};

export const computedDatabaseValue = (bases, base, row, field) => {
  if (!field || !row) return "";
  if (field.type === "lookup") return lookupValues(bases, row, field, base);
  if (field.type === "rollup")
    return aggregateValues(
      lookupValues(bases, row, field, base),
      field.rollupOperation,
    );
  return row.cells?.[field.id];
};

export const relationLabels = (bases, field, value) => {
  const target = (bases || []).find((base) => base.id === field?.targetBaseId);
  return relationRecords(bases, field, value)
    .map((row) => recordTitle(target, row))
    .filter(Boolean);
};

const replaceRowCell = (base, rowId, fieldId, value) => ({
  ...base,
  rows: (base.rows || []).map((row) =>
    row.id === rowId
      ? {
          ...row,
          cells: { ...(row.cells || {}), [fieldId]: value },
          updatedAt: new Date().toISOString(),
        }
      : row,
  ),
});

export const updateRelation = (
  bases,
  { baseId, rowId, fieldId, value, now = new Date().toISOString() },
) => {
  const list = bases || [];
  const source = list.find((base) => base.id === baseId);
  const field = source?.fields?.find((item) => item.id === fieldId);
  if (!source || !field || field.type !== "relation") return list;
  const previousRow = source.rows?.find((row) => row.id === rowId);
  const previous = relationIds(previousRow?.cells?.[fieldId]);
  const next = field.multiple === false ? relationIds(value).slice(0, 1) : relationIds(value);
  let result = list.map((base) =>
    base.id === baseId
      ? replaceRowCell(base, rowId, fieldId, field.multiple === false ? next[0] || "" : next)
      : base,
  );

  if (!field.reciprocalFieldId || !field.targetBaseId) return result;
  const target = result.find((base) => base.id === field.targetBaseId);
  const reciprocal = target?.fields?.find(
    (item) => item.id === field.reciprocalFieldId && item.type === "relation",
  );
  if (!target || !reciprocal) return result;

  const touched = new Set([...previous, ...next]);
  result = result.map((base) => {
    if (base.id !== target.id) return base;
    return {
      ...base,
      rows: (base.rows || []).map((row) => {
        if (!touched.has(String(row.id))) return row;
        const linked = new Set(relationIds(row.cells?.[reciprocal.id]));
        if (next.includes(String(row.id))) linked.add(String(rowId));
        else linked.delete(String(rowId));
        const values = [...linked];
        return {
          ...row,
          cells: {
            ...(row.cells || {}),
            [reciprocal.id]:
              reciprocal.multiple === false ? values[0] || "" : values,
          },
          updatedAt: now,
        };
      }),
    };
  });
  return result;
};

export const removeRecordAndReferences = (bases, baseId, rowId) =>
  (bases || []).map((base) => ({
    ...base,
    rows:
      base.id === baseId
        ? (base.rows || []).filter((row) => row.id !== rowId)
        : (base.rows || []).map((row) => {
            let changed = false;
            const cells = { ...(row.cells || {}) };
            for (const field of base.fields || []) {
              if (field.type !== "relation" || field.targetBaseId !== baseId) continue;
              const before = relationIds(cells[field.id]);
              const after = before.filter((id) => id !== String(rowId));
              if (after.length !== before.length) {
                cells[field.id] = field.multiple === false ? after[0] || "" : after;
                changed = true;
              }
            }
            return changed ? { ...row, cells, updatedAt: new Date().toISOString() } : row;
          }),
  }));

export const createDatabaseRecord = (id, now = new Date().toISOString()) => ({
  id,
  cells: {},
  content: "",
  attachments: [],
  comments: [],
  createdAt: now,
  updatedAt: now,
});

export const appendRecordComment = (row, comment) => ({
  ...row,
  comments: [
    ...(row?.comments || []),
    {
      id: comment.id,
      text: String(comment.text || "").trim(),
      authorId: comment.authorId || null,
      authorName: comment.authorName || "",
      createdAt: comment.createdAt || new Date().toISOString(),
    },
  ],
  updatedAt: comment.createdAt || new Date().toISOString(),
});
