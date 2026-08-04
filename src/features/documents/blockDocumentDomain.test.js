import { describe, expect, it } from "vitest";
import {
  createDocumentBlock,
  DOCUMENT_BLOCK_TYPES,
  documentBlocksToText,
  documentBlockStats,
  normalizeDocumentBlock,
  normalizeDocumentBlocks,
  normalizeSyncedBlock,
  textToDocumentBlocks,
} from "./blockDocumentDomain.js";

describe("domínio do editor universal de documentos", () => {
  it("converte documentos antigos em blocos estruturados sem perder o texto", () => {
    const source = `# Plano anual

Texto de abertura.

- Primeiro item
- Segundo item

- [x] Aprovado
- [ ] Publicar

| Indicador | Valor |
| --- | --- |
| Receita | 120 |

\`\`\`sql
select * from metas;
\`\`\``;
    const blocks = textToDocumentBlocks(source);

    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "bulletedList",
      "checklist",
      "table",
      "code",
    ]);
    expect(documentBlocksToText(blocks)).toContain("# Plano anual");
    expect(documentBlocksToText(blocks)).toContain("- [x] Aprovado");
    expect(documentBlocksToText(blocks)).toContain("| Receita | 120 |");
    expect(documentBlocksToText(blocks)).toContain("select * from metas;");
  });

  it("cria e normaliza todos os tipos exigidos pelo editor", () => {
    const blocks = DOCUMENT_BLOCK_TYPES.map(({ type }) =>
      createDocumentBlock(type),
    );

    expect(blocks).toHaveLength(18);
    expect(new Set(blocks.map((block) => block.type)).size).toBe(18);
    expect(blocks.every((block) => block.id)).toBe(true);
  });

  it("aceita somente endereços HTTPS em blocos de mídia e arquivos", () => {
    expect(
      normalizeDocumentBlock({
        type: "image",
        url: "https://cdn.example.com/photo.png",
      }).url,
    ).toBe("https://cdn.example.com/photo.png");
    expect(
      normalizeDocumentBlock({
        type: "video",
        url: "http://example.com/video",
      }).url,
    ).toBe("");
    expect(
      normalizeDocumentBlock({
        type: "file",
        url: "javascript:alert(1)",
      }).url,
    ).toBe("");
  });

  it("alinha categorias e valores de gráficos e limita opções inválidas", () => {
    const chart = normalizeDocumentBlock({
      type: "chart",
      chartType: "radar",
      labels: ["Receita"],
      values: [10, 20],
      color: "red",
    });

    expect(chart).toMatchObject({
      chartType: "bar",
      labels: ["Receita", "Item 2"],
      values: [10, 20],
      color: "#0b9f8f",
    });
  });

  it("mantém entre duas e quatro colunas", () => {
    const minimum = normalizeDocumentBlock({
      type: "columns",
      columns: [{ title: "Única", content: "A" }],
    });
    const maximum = normalizeDocumentBlock({
      type: "columns",
      columns: Array.from({ length: 8 }, (_, index) => ({
        title: `Coluna ${index}`,
      })),
    });

    expect(minimum.columns).toHaveLength(2);
    expect(maximum.columns).toHaveLength(4);
  });

  it("resolve conteúdo sincronizado ao gerar texto e estatísticas", () => {
    const blocks = [
      createDocumentBlock("heading", { text: "Política" }),
      createDocumentBlock("synced", { syncedBlockId: "sync-1" }),
      createDocumentBlock("database", { databaseId: "database-1" }),
    ];
    const context = {
      syncedBlocks: [{ id: "sync-1", content: "Regra corporativa atual." }],
      databases: [{ id: "database-1", name: "Controles" }],
    };

    expect(documentBlocksToText(blocks, context)).toContain(
      "Regra corporativa atual.",
    );
    expect(documentBlocksToText(blocks, context)).toContain(
      "[Base incorporada: Controles]",
    );
    expect(documentBlockStats(blocks, context)).toMatchObject({
      blocks: 3,
      connections: 2,
    });
  });

  it("normaliza componentes sincronizados com isolamento e permissão", () => {
    const item = normalizeSyncedBlock(
      {
        id: "sync-2",
        name: "  Rodapé padrão  ",
        content: "Conteúdo",
        visibility: "espaco_todo",
        sharingPermission: "editar",
        sharedWith: ["u2", "u2"],
      },
      {
        businessId: "business-1",
        ownerId: "u1",
        now: "2026-07-29T21:00:00.000Z",
      },
    );

    expect(item).toMatchObject({
      id: "sync-2",
      name: "Rodapé padrão",
      businessId: "business-1",
      ownerId: "u1",
      visibility: "espaco_todo",
      sharingPermission: "editar",
      sharedWith: ["u2"],
      updatedAt: "2026-07-29T21:00:00.000Z",
    });
  });

  it("usa um parágrafo seguro quando recebe bloco desconhecido ou lista vazia", () => {
    expect(normalizeDocumentBlock({ type: "script", content: "texto" })).toEqual(
      expect.objectContaining({ type: "paragraph", text: "texto" }),
    );
    expect(normalizeDocumentBlocks([], "Conteúdo legado")).toEqual([
      expect.objectContaining({ type: "paragraph", text: "Conteúdo legado" }),
    ]);
  });
});
