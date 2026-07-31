import { describe, expect, it } from "vitest";
import {
  BUSINESS_INDUSTRY_CATALOG,
  BUSINESS_PACKS,
  businessEnabledPackIds,
  businessVisiblePageIds,
  filterNavigationForBusiness,
  profileTypeForIndustry,
  recommendedPackIds,
} from "./features/business-profile/businessProfileDomain.js";

describe("perfil universal de negócios", () => {
  it("cobre atividades muito diferentes e sempre oferece saída aberta", () => {
    const activities = BUSINESS_INDUSTRY_CATALOG.flatMap(
      (category) => category.activities,
    );

    expect(BUSINESS_INDUSTRY_CATALOG.length).toBeGreaterThanOrEqual(25);
    expect(activities.length).toBeGreaterThan(200);
    expect(activities).toContain("Restaurante");
    expect(activities).toContain("Influenciador digital e criador de conteúdo");
    expect(activities).toContain("Transportadora de cargas");
    expect(activities).toContain("Escritório de advocacia");
    expect(activities).toContain("Clube de tiro");
    expect(
      BUSINESS_INDUSTRY_CATALOG.every((category) =>
        category.activities.includes("Outra atividade desta categoria"),
      ),
    ).toBe(true);
  });

  it("liga categorias a perfis funcionais sem criar produtos separados", () => {
    expect(profileTypeForIndustry("alimentacao")).toBe("restaurante");
    expect(profileTypeForIndustry("pets")).toBe("pet");
    expect(profileTypeForIndustry("transportes")).toBe("transportes");
    expect(
      profileTypeForIndustry(
        "tecnologia",
        "Influenciador digital e criador de conteúdo",
      ),
    ).toBe("criador");
    expect(profileTypeForIndustry("categoria-futura")).toBe("outro");
    expect(recommendedPackIds("criador")).toContain("conteudo");
    expect(recommendedPackIds("criador")).toContain("presenca-digital");
  });

  it("mantém todos os pacotes para perfis antigos e permite menu focado", () => {
    expect(businessEnabledPackIds({ segment: "Serviços" })).toHaveLength(
      BUSINESS_PACKS.length,
    );

    const pages = businessVisiblePageIds({
      menuMode: "custom",
      enabledPacks: ["conteudo"],
    });
    expect(pages).toContain("perfil-negocio");
    expect(pages).toContain("marketing");
    expect(pages).not.toContain("frota");

    const nav = [
      ["inicio", "Início"],
      ["perfil-negocio", "Central"],
      ["marketing", "Marketing"],
      ["frota", "Frota"],
    ];
    expect(
      filterNavigationForBusiness(nav, {
        menuMode: "custom",
        enabledPacks: ["conteudo"],
      }).map(([id]) => id),
    ).toEqual(["inicio", "perfil-negocio", "marketing"]);
    expect(filterNavigationForBusiness(nav, { menuMode: "all" })).toBe(nav);
  });
});
