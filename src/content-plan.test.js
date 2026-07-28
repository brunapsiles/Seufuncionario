import { describe, expect, it } from "vitest";
import { parseContentPlan, scheduleContentDates } from "./domain.js";

describe("parseContentPlan", () => {
  it("lê posts a partir de JSON e normaliza hashtags", () => {
    const raw = JSON.stringify([
      {
        channel: "Instagram",
        format: "Reels",
        hook: "3 erros ao organizar a casa",
        caption: "Você comete algum destes?",
        cta: "Chame no WhatsApp",
        hashtags: ["#Organização", "casa limpa", "#dicas"],
      },
    ]);
    const posts = parseContentPlan(raw);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      channel: "Instagram",
      format: "Reels",
      hook: "3 erros ao organizar a casa",
      cta: "Chame no WhatsApp",
    });
    expect(posts[0].hashtags).toEqual(["Organização", "casalimpa", "dicas"]);
  });

  it("tolera cercas de código e chaves em português", () => {
    const raw =
      '```json\n[{"canal":"Facebook","formato":"Post","gancho":"Novidade","legenda":"Chegou!","chamada":"Confira","tags":"promo, novidade"}]\n```';
    const posts = parseContentPlan(raw);
    expect(posts[0]).toMatchObject({
      channel: "Facebook",
      hook: "Novidade",
      caption: "Chegou!",
      cta: "Confira",
    });
    expect(posts[0].hashtags).toEqual(["promo", "novidade"]);
  });

  it("descarta itens sem gancho e sem legenda", () => {
    const raw = JSON.stringify([{ channel: "X" }, { hook: "ok", caption: "vai" }]);
    expect(parseContentPlan(raw)).toHaveLength(1);
  });

  it("retorna vazio quando não há JSON", () => {
    expect(parseContentPlan("desculpe, não consegui")).toEqual([]);
    expect(parseContentPlan("")).toEqual([]);
  });
});

describe("scheduleContentDates", () => {
  it("distribui datas a cada N dias pulando domingo", () => {
    // 2026-07-28 é uma terça-feira
    const dates = scheduleContentDates(4, "2026-07-28", 2);
    expect(dates).toHaveLength(4);
    // Nenhuma data cai no domingo (getUTCDay 0)
    for (const d of dates) {
      expect(new Date(`${d}T12:00:00Z`).getUTCDay()).not.toBe(0);
    }
    expect(dates[0]).toBe("2026-07-28");
    // segunda data = +2 dias (30/07)
    expect(dates[1]).toBe("2026-07-30");
  });

  it("gera exatamente a quantidade pedida", () => {
    expect(scheduleContentDates(7, "2026-07-28", 1)).toHaveLength(7);
    expect(scheduleContentDates(0, "2026-07-28", 1)).toEqual([]);
  });
});
