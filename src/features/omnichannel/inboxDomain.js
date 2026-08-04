export const groupInteractions = (items) => {
  const map = new Map();
  for (const it of items || []) {
    const key =
      it.contactId || it.contactHandle || it.contactName || "sem-contato";
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: it.contactName || it.contactHandle || "Sem identificação",
        handle: it.contactHandle || "",
        items: [],
        unread: 0,
        last: it.createdAt,
      });
    }
    const thread = map.get(key);
    thread.items.push(it);
    if (!it.readAt) thread.unread += 1;
    if (String(it.createdAt) > String(thread.last)) thread.last = it.createdAt;
    if (thread.name === "Sem identificação" && it.contactName)
      thread.name = it.contactName;
    if (!thread.handle && it.contactHandle) thread.handle = it.contactHandle;
  }
  return [...map.values()].sort((a, b) =>
    String(b.last).localeCompare(String(a.last)),
  );
};
