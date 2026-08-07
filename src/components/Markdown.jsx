// ===== Markdown enxuto =====
//
// O suficiente para o que a IA devolve e para o que a pessoa escreve num campo
// de descrição: negrito, itálico, código, link, lista e título. Não é um
// interpretador completo, e não deveria ser — cada recurso a mais é uma
// superfície a mais para colar HTML de outra pessoa dentro do produto.

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
function renderInline(text) {
  const nodes = [];
  let last = 0,
    match,
    key = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) nodes.push(<code key={key++}>{match[1].slice(1, -1)}</code>);
    else if (match[2])
      nodes.push(<strong key={key++}>{match[2].slice(2, -2)}</strong>);
    else if (match[3]) nodes.push(<em key={key++}>{match[3].slice(1, -1)}</em>);
    else
      nodes.push(
        <a key={key++} href={match[5]} target="_blank" rel="noreferrer">
          {match[4]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ text }) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n");
  const blocks = [];
  const paragraph = [];
  let i = 0,
    key = 0;
  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={key++}>{renderInline(paragraph.join(" "))}</p>);
      paragraph.length = 0;
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      flush();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)/);
    if (heading) {
      flush();
      const Tag = `h${Math.min(heading[1].length, 4)}`;
      blocks.push(<Tag key={key++}>{renderInline(heading[2])}</Tag>);
      i += 1;
      continue;
    }
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
      flush();
      blocks.push(<hr key={key++} />);
      i += 1;
      continue;
    }
    const listStart = line.match(/^\s*([-*•]|\d+[.)])\s+/);
    if (listStart) {
      flush();
      const ordered = /^\d/.test(listStart[1]);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
        if (!item) break;
        items.push(
          item[1].replace(/^\[ \]\s*/, "☐ ").replace(/^\[x\]\s*/i, "☑ "),
        );
        i += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key++}>
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(
          lines[i]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim()),
        );
        i += 1;
      }
      const body = rows.filter(
        (row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)),
      );
      const [head, ...rest] = body;
      blocks.push(
        <div className="md-table" key={key++}>
          <table>
            <thead>
              <tr>
                {(head || []).map((cell, j) => (
                  <th key={j}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, j) => (
                    <td key={j}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)/);
    if (quote) {
      flush();
      const parts = [];
      while (i < lines.length) {
        const part = lines[i].match(/^\s*>\s?(.*)/);
        if (!part) break;
        parts.push(part[1]);
        i += 1;
      }
      blocks.push(
        <blockquote key={key++}>{renderInline(parts.join(" "))}</blockquote>,
      );
      continue;
    }
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }
    paragraph.push(line.trim());
    i += 1;
  }
  flush();
  return <div className="md">{blocks}</div>;
}
