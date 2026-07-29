import { describe, expect, it } from "vitest";
import {
  buildWorkTree,
  createWorkNode,
  duplicateWorkBranch,
  hierarchyMetrics,
  moveWorkNode,
  organizationRoot,
  workBreadcrumbs,
} from "./features/work/hierarchyDomain.js";

describe("hierarquia universal de trabalho", () => {
  const root = organizationRoot({ id: "b1", name: "Empresa" });
  const workspace = {
    id: "w1",
    type: "workspace",
    name: "Principal",
    parentId: root.id,
    businessId: "b1",
    order: 0,
  };
  const space = {
    id: "s1",
    type: "space",
    name: "Operação",
    parentId: "w1",
    businessId: "b1",
    order: 0,
  };
  const folder = {
    id: "f1",
    type: "folder",
    name: "Clientes",
    parentId: "s1",
    businessId: "b1",
    order: 0,
  };
  const list = {
    id: "l1",
    type: "list",
    name: "Implantações",
    parentId: "f1",
    businessId: "b1",
    order: 0,
  };
  const nodes = [workspace, space, folder, list];

  it("valida os níveis permitidos sem duplicar organização", () => {
    const created = createWorkNode(
        { type: "workspace", name: "Novo", parentId: root.id },
        { businessId: "b1" },
        nodes,
        root,
      ).node;
    expect(created).toMatchObject({
      type: "workspace",
      visibility: "espaco_todo",
      sharingPermission: "visualizar",
    });
    expect(
      createWorkNode(
        { type: "list", name: "Inválida", parentId: "w1" },
        {},
        nodes,
        root,
      ).error,
    ).toContain("não pode");
  });

  it("monta árvore e breadcrumbs completos", () => {
    expect(buildWorkTree(nodes, root).children[0].children[0].name).toBe("Operação");
    expect(workBreadcrumbs(nodes, "l1", root).map((item) => item.name)).toEqual([
      "Empresa",
      "Principal",
      "Operação",
      "Clientes",
      "Implantações",
    ]);
  });

  it("impede ciclos e permite movimentação válida", () => {
    expect(moveWorkNode(nodes, "f1", "l1", root).error).toBeTruthy();
    expect(moveWorkNode(nodes, "l1", "s1", root).nodes.find((n) => n.id === "l1").parentId)
      .toBe("s1");
  });

  it("duplica a ramificação preservando a estrutura interna", () => {
    const result = duplicateWorkBranch(nodes, "f1", { ownerId: "u1" });
    expect(result.created).toHaveLength(2);
    expect(result.created[1].parentId).toBe(result.created[0].id);
  });

  it("consolida projetos e tarefas descendentes", () => {
    expect(
      hierarchyMetrics(
        space,
        nodes,
        [{ id: "p1", containerId: "f1" }],
        [
          { id: "t1", projectId: "p1", status: "Concluído" },
          { id: "t2", listId: "l1", status: "A fazer", due: "2020-01-01" },
        ],
      ),
    ).toMatchObject({ projects: 1, tasks: 2, completedTasks: 1, overdueTasks: 1 });
  });
});
