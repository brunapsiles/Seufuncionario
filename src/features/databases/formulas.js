const round = (value, decimals = 2) => {
  const precision = Math.max(0, Math.min(8, Math.trunc(Number(decimals) || 0)));
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const normalizedEntries = (values) =>
  Object.entries(values || {})
    .map(([name, value]) => ({
      name,
      normalized: String(name).trim().toLocaleLowerCase("pt-BR"),
      value: Number(value),
    }))
    .sort((a, b) => b.normalized.length - a.normalized.length);

export const evaluateFormula = (expression, values = {}, options = {}) => {
  const source = String(expression || "").trim();
  if (!source) return { value: "", error: null, warnings: [], references: [] };

  let index = 0;
  const warnings = [];
  const references = new Set();
  const fields = normalizedEntries(values);
  const skip = () => {
    while (/\s/.test(source[index] || "")) index += 1;
  };
  const fail = (message) => {
    throw new Error(`${message} (posição ${index + 1})`);
  };
  const consume = (text) => {
    skip();
    if (source.slice(index, index + text.length) !== text) return false;
    index += text.length;
    return true;
  };
  const matchField = () => {
    skip();
    const rest = source.slice(index).toLocaleLowerCase("pt-BR");
    const field = fields.find(({ normalized }) => {
      if (!rest.startsWith(normalized)) return false;
      const next = rest[normalized.length] || "";
      return !/[\p{L}\p{N}_]/u.test(next);
    });
    if (!field) return null;
    index += field.name.length;
    references.add(field.name);
    return Number.isFinite(field.value) ? field.value : 0;
  };
  const parseNumber = () => {
    skip();
    const match = /^\d+(?:[.,]\d+)?/.exec(source.slice(index));
    if (!match) return null;
    index += match[0].length;
    return Number(match[0].replace(",", "."));
  };
  const parseIdentifier = () => {
    skip();
    const match = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(source.slice(index));
    if (!match) return "";
    index += match[0].length;
    return match[0];
  };

  const callFunction = (name, args) => {
    const fn = name.toLocaleUpperCase("pt-BR");
    if (fn === "SOMA" || fn === "SUM") return args.reduce((sum, value) => sum + value, 0);
    if (fn === "MEDIA" || fn === "MÉDIA" || fn === "AVG")
      return args.length ? args.reduce((sum, value) => sum + value, 0) / args.length : 0;
    if (fn === "MIN") return args.length ? Math.min(...args) : 0;
    if (fn === "MAX") return args.length ? Math.max(...args) : 0;
    if (fn === "ABS") return Math.abs(args[0] || 0);
    if (fn === "ARRED" || fn === "ROUND") return round(args[0] || 0, args[1] ?? 2);
    if (fn === "SE" || fn === "IF") return args[0] ? args[1] || 0 : args[2] || 0;
    fail(`Função “${name}” não reconhecida`);
  };

  let parseComparison;
  const parseFactor = () => {
    skip();
    if (consume("+")) return parseFactor();
    if (consume("-")) return -parseFactor();
    if (consume("(")) {
      const value = parseComparison();
      if (!consume(")")) fail("Falta fechar o parêntese");
      return value;
    }
    const fieldValue = matchField();
    if (fieldValue !== null) return fieldValue;
    const number = parseNumber();
    if (number !== null) return number;
    const identifierStart = index;
    const identifier = parseIdentifier();
    if (identifier) {
      if (consume("(")) {
        const args = [];
        skip();
        if (!consume(")")) {
          do {
            args.push(parseComparison());
            skip();
          } while (consume(";") || consume(","));
          if (!consume(")")) fail("Falta fechar a função");
        }
        return callFunction(identifier, args);
      }
      if (options.strictFields) {
        index = identifierStart;
        fail(`Campo “${identifier}” não encontrado`);
      }
      warnings.push(`Campo “${identifier}” não encontrado; considerado como 0`);
      return 0;
    }
    fail("Valor inválido");
  };
  const parseTerm = () => {
    let value = parseFactor();
    for (;;) {
      if (consume("*")) value *= parseFactor();
      else if (consume("/")) {
        const divisor = parseFactor();
        if (divisor === 0) {
          warnings.push("Divisão por zero tratada como 0");
          value = 0;
        } else value /= divisor;
      } else break;
    }
    return value;
  };
  const parseAddition = () => {
    let value = parseTerm();
    for (;;) {
      if (consume("+")) value += parseTerm();
      else if (consume("-")) value -= parseTerm();
      else break;
    }
    return value;
  };
  parseComparison = () => {
    const left = parseAddition();
    const operators = [">=", "<=", "!=", "==", ">", "<"];
    const operator = operators.find((candidate) => consume(candidate));
    if (!operator) return left;
    const right = parseAddition();
    if (operator === ">=") return Number(left >= right);
    if (operator === "<=") return Number(left <= right);
    if (operator === "!=") return Number(left !== right);
    if (operator === "==") return Number(left === right);
    if (operator === ">") return Number(left > right);
    return Number(left < right);
  };

  try {
    const value = parseComparison();
    skip();
    if (index < source.length) fail("Trecho inesperado");
    return {
      value: Number.isFinite(value) ? round(value, 2) : "",
      error: Number.isFinite(value) ? null : "O resultado não é um número válido",
      warnings,
      references: [...references],
    };
  } catch (error) {
    return { value: "", error: error.message, warnings, references: [...references] };
  }
};

export const evalFormula = (expression, values = {}) =>
  evaluateFormula(expression, values).value;

export const validateFormula = (expression, fieldNames = []) =>
  evaluateFormula(
    expression,
    Object.fromEntries((fieldNames || []).map((name) => [name, 1])),
    { strictFields: true },
  );
