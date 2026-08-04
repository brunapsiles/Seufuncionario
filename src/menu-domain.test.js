import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENU,
  MAX_MENU,
  PINNED,
  buildNavigation,
  canRemove,
  countVisit,
  everythingReachable,
  isPinned,
  moveMenuItem,
  normalizeMenu,
  resetMenu,
  suggestForMenu,
  toggleMenuItem,
  unusedInMenu,
} from "./features/navigation/menuDomain";

const NAV = [
  ["inicio", "Início"],
  ["vendas", "Vendas"],
  ["financeiro", "Financeiro"],
  ["agendamentos", "Agendamentos"],
  ["documentos", "Documentos"],
  ["quadro", "Quadro visual"],
  ["agentes", "Agentes"],
  ["solto", "Item sem grupo"],
];
const IDS = NAV.map((n) => n[0]);
const GROUPS = [
  { label: null, items: ["inicio"] },
  { label: "VENDAS", items: ["vendas", "agendamentos"] },
  { label: "OPERAÇÃO", items: ["financeiro", "documentos", "quadro", "agentes"] },
];

describe("normalizeMenu", () => {
  it("mantém o que a pessoa escolheu", () => {
    expect(normalizeMenu(["inicio", "vendas"], IDS)).toEqual(["inicio", "vendas"]);
  });

  it("descarta id que não existe mais, sem virar botão quebrado", () => {
    expect(normalizeMenu(["inicio", "tela_que_sumiu", "vendas"], IDS)).toEqual([
      "inicio",
      "vendas",
    ]);
  });

  it("não repete item", () => {
    expect(normalizeMenu(["vendas", "vendas", "inicio"], IDS)).toEqual([
      "inicio",
      "vendas",
    ]);
  });

  it("o item fixo entra sempre, e na frente", () => {
    expect(normalizeMenu(["vendas", "financeiro"], IDS)[0]).toBe("inicio");
  });

  it("menu vazio volta para o padrão, para ninguém ficar sem navegação", () => {
    const r = normalizeMenu([], IDS);
    expect(r.length).toBeGreaterThan(0);
    expect(r).toContain("inicio");
  });

  it("lista inválida não quebra", () => {
    expect(normalizeMenu(null, IDS)).toContain("inicio");
    expect(normalizeMenu("vendas", IDS)).toContain("inicio");
  });

  it("respeita o teto de itens", () => {
    const muitos = Array.from({ length: 50 }, (_, i) => IDS[i % IDS.length]);
    expect(normalizeMenu(muitos, IDS).length).toBeLessThanOrEqual(MAX_MENU);
  });
});

describe("toggleMenuItem", () => {
  it("adiciona o que não estava", () => {
    expect(toggleMenuItem(["inicio"], "quadro", IDS)).toContain("quadro");
  });

  it("tira o que estava", () => {
    expect(toggleMenuItem(["inicio", "quadro"], "quadro", IDS)).not.toContain(
      "quadro",
    );
  });

  it("não deixa tirar o item fixo", () => {
    expect(toggleMenuItem(["inicio", "vendas"], "inicio", IDS)).toContain("inicio");
    expect(isPinned("inicio")).toBe(true);
  });

  it("não deixa esvaziar o menu", () => {
    const r = toggleMenuItem(["inicio"], "inicio", IDS);
    expect(r.length).toBeGreaterThan(0);
  });

  it("id inexistente não entra", () => {
    expect(toggleMenuItem(["inicio"], "nao_existe", IDS)).not.toContain(
      "nao_existe",
    );
  });

  it("canRemove explica quando dá para tirar", () => {
    expect(canRemove(["inicio", "vendas"], "vendas")).toBe(true);
    expect(canRemove(["inicio", "vendas"], "inicio")).toBe(false);
    expect(canRemove(["vendas"], "vendas")).toBe(false);
  });
});

describe("moveMenuItem", () => {
  it("sobe e desce o item", () => {
    const m = ["inicio", "vendas", "financeiro"];
    expect(moveMenuItem(m, "financeiro", "up", IDS)).toEqual([
      "inicio",
      "financeiro",
      "vendas",
    ]);
    expect(moveMenuItem(m, "vendas", "down", IDS)).toEqual([
      "inicio",
      "financeiro",
      "vendas",
    ]);
  });

  it("na ponta, não sai da lista", () => {
    const m = ["inicio", "vendas"];
    expect(moveMenuItem(m, "vendas", "down", IDS)).toEqual(m);
  });

  it("item que não está no menu não move nada", () => {
    const m = ["inicio", "vendas"];
    expect(moveMenuItem(m, "quadro", "up", IDS)).toEqual(m);
  });
});

describe("buildNavigation", () => {
  it("separa o menu escolhido do resto", () => {
    const { main, rest } = buildNavigation(NAV, ["inicio", "vendas"], GROUPS);
    expect(main.map((i) => i[0])).toEqual(["inicio", "vendas"]);
    const idsResto = rest.flatMap((g) => g.items.map((i) => i[0]));
    expect(idsResto).not.toContain("vendas");
    expect(idsResto).toContain("financeiro");
  });

  it("o resto continua agrupado por tema", () => {
    const { rest } = buildNavigation(NAV, ["inicio"], GROUPS);
    expect(rest.find((g) => g.label === "VENDAS").items.map((i) => i[0])).toEqual([
      "vendas",
      "agendamentos",
    ]);
  });

  it("grupo que ficou vazio não aparece", () => {
    const { rest } = buildNavigation(
      NAV,
      ["inicio", "vendas", "agendamentos"],
      GROUPS,
    );
    expect(rest.find((g) => g.label === "VENDAS")).toBeUndefined();
  });

  it("item que não está em grupo nenhum não some", () => {
    const { rest } = buildNavigation(NAV, ["inicio"], GROUPS);
    const idsResto = rest.flatMap((g) => g.items.map((i) => i[0]));
    expect(idsResto).toContain("solto");
  });

  it("a ordem escolhida é respeitada no menu principal", () => {
    const { main } = buildNavigation(NAV, ["inicio", "agentes", "vendas"], GROUPS);
    expect(main.map((i) => i[0])).toEqual(["inicio", "agentes", "vendas"]);
  });
});

describe("escolher o menu nunca tira acesso", () => {
  it("com o menu mínimo, tudo continua alcançável", () => {
    expect(everythingReachable(NAV, ["inicio"], GROUPS)).toBe(true);
  });

  it("com o menu cheio, tudo continua alcançável", () => {
    expect(everythingReachable(NAV, IDS, GROUPS)).toBe(true);
  });

  it("com menu bagunçado ou inválido, tudo continua alcançável", () => {
    expect(everythingReachable(NAV, ["lixo", "inicio", "lixo2"], GROUPS)).toBe(true);
    expect(everythingReachable(NAV, null, GROUPS)).toBe(true);
  });

  it("sem grupo nenhum definido, ainda assim nada some", () => {
    expect(everythingReachable(NAV, ["inicio"], [])).toBe(true);
  });

  it("qualquer combinação de escolhas mantém tudo alcançável", () => {
    // Varre várias combinações em vez de confiar num caso só.
    for (let mascara = 0; mascara < 2 ** NAV.length; mascara += 37) {
      const menu = IDS.filter((_, i) => (mascara >> i) & 1);
      expect(everythingReachable(NAV, menu, GROUPS)).toBe(true);
    }
  });
});

describe("resetMenu", () => {
  it("volta para o padrão, só com o que existe", () => {
    const r = resetMenu(["inicio", "vendas"]);
    expect(r).toContain("inicio");
    expect(r.every((id) => ["inicio", "vendas"].includes(id))).toBe(true);
  });

  it("o padrão é um começo enxuto, não a lista inteira", () => {
    expect(DEFAULT_MENU.length).toBeLessThanOrEqual(MAX_MENU);
    expect(DEFAULT_MENU).toContain("inicio");
  });
});

describe("sugestão pelo uso", () => {
  it("sugere o que a pessoa mais abre e ainda não está no menu", () => {
    const visitas = { quadro: 12, agentes: 30, vendas: 99 };
    const r = suggestForMenu(visitas, ["inicio", "vendas"], IDS);
    expect(r.map((x) => x.id)).toEqual(["agentes", "quadro"]);
  });

  it("não sugere o que já está no menu", () => {
    expect(
      suggestForMenu({ vendas: 50 }, ["inicio", "vendas"], IDS),
    ).toEqual([]);
  });

  it("não sugere tela que não existe", () => {
    expect(suggestForMenu({ fantasma: 90 }, ["inicio"], IDS)).toEqual([]);
  });

  it("sem histórico, não inventa sugestão", () => {
    expect(suggestForMenu({}, ["inicio"], IDS)).toEqual([]);
  });

  it("aponta o que está no menu e nunca foi aberto", () => {
    const r = unusedInMenu({ vendas: 5 }, ["inicio", "vendas", "quadro"]);
    expect(r).toEqual(["quadro"]);
  });

  it("o item fixo nunca entra na lista de descartáveis", () => {
    expect(unusedInMenu({}, ["inicio", "vendas"])).not.toContain("inicio");
  });

  it("conta a visita sem estragar o resto", () => {
    let v = countVisit({}, "vendas");
    v = countVisit(v, "vendas");
    v = countVisit(v, "quadro");
    expect(v).toEqual({ vendas: 2, quadro: 1 });
  });

  it("contar visita de id vazio não muda nada", () => {
    expect(countVisit({ a: 1 }, "")).toEqual({ a: 1 });
  });
});

describe("itens fixos", () => {
  it("o início é fixo para a pessoa nunca perder o caminho de volta", () => {
    expect(PINNED).toContain("inicio");
  });

  it("falar com o funcionário é fixo: é a porta de entrada do app", () => {
    // Com 68 telas, pedir com as próprias palavras é o caminho mais curto para
    // quase tudo. Quem tirasse isso do menu por engano ficaria procurando.
    expect(PINNED).toContain("conversar");
  });

  it("os fixos entram no menu mesmo em preferência antiga, salva sem eles", () => {
    const ids = [...IDS, "conversar"];
    expect(normalizeMenu(["vendas", "financeiro"], ids)).toContain("conversar");
  });
});
