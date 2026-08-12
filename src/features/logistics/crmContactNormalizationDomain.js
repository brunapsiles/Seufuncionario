const text = (value) => String(value ?? "").trim();

export const normalizedPhone = (value) => {
  const digits = text(value).replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))
    return `+${digits}`;
  return "";
};

const phonesFromFormattedText = (value) => [...new Set(text(value)
  .split(/[\n;|/,]+/)
  .map(normalizedPhone)
  .filter(Boolean))];

const partitionDigits = (digits, count) => {
  const lengths = [13, 12, 11, 10];
  const visit = (offset, remaining, parts) => {
    if (!remaining) return offset === digits.length ? parts : null;
    for (const length of lengths) {
      const raw = digits.slice(offset, offset + length);
      if (raw.length !== length || !normalizedPhone(raw)) continue;
      if ((length === 12 || length === 13) && !raw.startsWith("55")) continue;
      const result = visit(offset + length, remaining - 1, [...parts, normalizedPhone(raw)]);
      if (result) return result;
    }
    return null;
  };
  for (let wanted = count; wanted > 0; wanted -= 1) {
    const result = visit(0, wanted, []);
    if (result) return result;
  }
  return [];
};

export const splitGroupedPhones = (value, expected = 1) => {
  const formatted = phonesFromFormattedText(value);
  if (formatted.length > 1) return formatted.slice(0, expected);
  const single = normalizedPhone(value);
  if (single) return [single];
  return partitionDigits(text(value).replace(/\D/g, ""), Math.max(1, expected));
};

const splitGroupedNames = (value) => text(value)
  .split(/[/\n;|]+/)
  .map((item) => item.trim())
  .filter(Boolean);

// E-mails não têm espaço nem barra: qualquer um desses caracteres separa dois.
const splitGroupedEmails = (value) => [...new Set(text(value)
  .split(/[\s;,|/]+/)
  .map((item) => item.trim().toLowerCase())
  .filter((item) => item.includes("@")))];

const nameTokens = (value) => text(value)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .split(/[^a-z0-9]+/).filter((token) => token.length > 2);

// "fernanda.pereira@adidas.com" é da Fernanda Pereira, não de quem estava
// escrito primeiro no campo. Sem isto, separar os nomes só troca de dono o
// e-mail — que é pior do que deixar os dois juntos, porque parece certo.
const emailMatchesName = (email, name) => {
  const local = nameTokens(text(email).split("@")[0] || "");
  const tokens = nameTokens(name);
  if (!local.length || !tokens.length) return false;
  return tokens.some((token) => local.includes(token));
};

const nameFromEmail = (email) => {
  const local = text(email).split("@")[0] || "";
  return local.split(/[._-]+/).filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
};

export function normalizeCrmContacts(input = []) {
  const contacts = (Array.isArray(input) ? input : []).map((item) => ({ ...item }));
  const groups = new Map();
  contacts.forEach((contact) => {
    const key = [contact.name, contact.phone, contact.department, contact.relationshipRole]
      .map((item) => text(item).toLowerCase()).join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(contact);
  });
  // Pessoas que estavam escondidas dentro de um registro só, guardadas para
  // entrar logo depois de quem as escondia — a ordem da lista é a ordem em
  // que a equipe cadastrou, e embaralhar isso confunde quem conhece a conta.
  const escondidos = new Map();

  for (const group of groups.values()) {
    const groupedName = /[/\n;|]/.test(text(group[0]?.name));
    const names = splitGroupedNames(group[0]?.name);
    // Quantas pessoas o registro realmente descreve. Antes só existiam as que
    // já tinham registro próprio: um campo "Thiago Souza / Fernanda Pereira"
    // virava UM contato chamado Thiago, com o e-mail da Fernanda e sem
    // telefone nenhum. A Fernanda desaparecia do CRM.
    const pessoas = Math.max(names.length, group.length);
    const groupedPhones = splitGroupedPhones(group[0]?.phone, pessoas);
    if (pessoas < 2 && !groupedName && groupedPhones.length <= 1) continue;

    const modelo = group[0];
    const novos = [];
    for (let index = group.length; index < pessoas; index += 1)
      novos.push({ ...modelo, id: `${text(modelo.id) || "contato"}-${index + 1}`, email: "" });
    const todos = [...group, ...novos];

    todos.forEach((contact, index) => {
      contact.name = names[index] || nameFromEmail(contact.email) || contact.name;
      contact.phone = groupedPhones[index] || "";
    });

    // Vários registros já trazem um e-mail cada; só o registro único pode ter
    // guardado mais de um e-mail no mesmo campo.
    const emailsDoCampo = group.length === 1 ? splitGroupedEmails(modelo.email) : [];
    if (emailsDoCampo.length) {
      const usados = new Set();
      todos.forEach((contact) => {
        const achado = emailsDoCampo.find(
          (email) => !usados.has(email) && emailMatchesName(email, contact.name),
        );
        contact.email = achado || "";
        if (achado) usados.add(achado);
      });
      // E-mail que não nomeia ninguém fica com quem ainda está sem, na ordem —
      // melhor um palpite posicional declarado do que jogar o dado fora.
      const restantes = emailsDoCampo.filter((email) => !usados.has(email));
      todos.forEach((contact) => {
        if (!text(contact.email) && restantes.length) contact.email = restantes.shift();
      });
    }

    if (novos.length) escondidos.set(group[group.length - 1], novos);
  }

  const emOrdem = [];
  for (const contact of contacts) {
    emOrdem.push(contact);
    for (const novo of escondidos.get(contact) || []) emOrdem.push(novo);
  }

  const seen = new Set();
  return emOrdem.filter((contact) => {
    contact.phone = normalizedPhone(contact.phone);
    const identity = text(contact.email).toLowerCase()
      ? `email:${text(contact.email).toLowerCase()}`
      : contact.phone ? `phone:${contact.phone}` : `name:${text(contact.name).toLowerCase()}|${text(contact.title).toLowerCase()}`;
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return Boolean(text(contact.name));
  });
}
