// ===== Importar planilha e extrato bancário =====
//
// Ler CSV com separador que varia, e OFX, que é o formato que todo banco
// brasileiro exporta. O objetivo é a pessoa não redigitar cem lançamentos.
//
// Os dois são função pura sobre texto: nada aqui grava, e é por isso que dá
// para testar com um arquivo de exemplo em vez de um banco de verdade.

export const parseDelimitedText = (text) => {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter =
    (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const headers = rows[0].map(normalize);
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] || ""]),
      ),
    );
};

export const parseOfxTransactions = (text) => {
  const source = String(text || "");
  const blocks =
    source.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];
  const field = (block, name) => {
    const match = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  };
  return blocks
    .map((block) => {
      const amount = Number(field(block, "TRNAMT").replace(",", "."));
      const rawDate = field(block, "DTPOSTED").slice(0, 8);
      return {
        fitId: field(block, "FITID"),
        type: amount >= 0 ? "Receita" : "Despesa",
        value: Math.abs(amount),
        date: /^\d{8}$/.test(rawDate)
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : "",
        description:
          field(block, "MEMO") ||
          field(block, "NAME") ||
          "Movimentação bancária",
        category: "Importado do banco",
      };
    })
    .filter((item) => item.value > 0 && item.date);
};
