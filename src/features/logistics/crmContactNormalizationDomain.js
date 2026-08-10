const text = (value) => String(value ?? "").trim();

export const normalizedPhone = (value) => {
  const digits = text(value).replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))
    return `+${digits}`;
  return "";
};

const phonesFromFormattedText = (value) => [...new Set(text(value)
  .split(/[\n;|]+/)
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
  for (const group of groups.values()) {
    const groupedName = /[/\n;|]/.test(text(group[0]?.name));
    const groupedPhones = splitGroupedPhones(group[0]?.phone, group.length);
    if (group.length < 2 && !groupedName && groupedPhones.length <= 1) continue;
    const names = splitGroupedNames(group[0]?.name);
    group.forEach((contact, index) => {
      contact.name = names[index] || nameFromEmail(contact.email) || contact.name;
      contact.phone = groupedPhones[index] || "";
    });
  }
  const seen = new Set();
  return contacts.filter((contact) => {
    contact.phone = normalizedPhone(contact.phone);
    const identity = text(contact.email).toLowerCase()
      ? `email:${text(contact.email).toLowerCase()}`
      : contact.phone ? `phone:${contact.phone}` : `name:${text(contact.name).toLowerCase()}|${text(contact.title).toLowerCase()}`;
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return Boolean(text(contact.name));
  });
}
