import { describe, expect, it } from "vitest";
import { websiteMilestones } from "./App";

describe("trilha de websites no-code", () => {
  it("não concede marcos sem evidências", () => {
    expect(websiteMilestones(null).every((step) => !step.done)).toBe(true);
  });

  it("exige conteúdo, personalização, revisão completa e publicação", () => {
    const site = {
      id: "site-1",
      brief: {
        name: "Ateliê Aurora",
        segment: "Decoração",
        description: "Página comercial",
        headline: "Sua casa com identidade",
        services: "Consultoria\nProjeto",
        color: "#8248d8",
        cta: "Solicitar projeto",
      },
      reviewedDevices: ["desktop", "tablet", "mobile"],
      published: true,
      serverPublished: true,
      publicUrl: "https://example.com/s/atelie-aurora",
      publishedAt: "2026-07-15T12:00:00.000Z",
      codeEdited: false,
    };
    expect(websiteMilestones(site)).toHaveLength(6);
    expect(websiteMilestones(site).every((step) => step.done)).toBe(true);
  });

  it("não aceita apenas criar e publicar um esqueleto", () => {
    const site = {
      id: "site-2",
      brief: {},
      reviewedDevices: [],
      published: true,
    };
    const completed = websiteMilestones(site)
      .filter((step) => step.done)
      .map((step) => step.id);
    expect(completed).toEqual(["created"]);
  });
});
