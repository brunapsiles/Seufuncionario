import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHART_CONFIG,
  normalizeChartConfig,
} from "./features/spreadsheets/chartConfig.js";

describe("configuração persistente de gráfico", () => {
  it("mantém uma configuração válida", () => {
    expect(
      normalizeChartConfig(
        { enabled: true, type: "pizza", labelCol: 1, valueCol: 3 },
        4,
      ),
    ).toEqual({ enabled: true, type: "pizza", labelCol: 1, valueCol: 3 });
  });

  it("corrige índices e tipos incompatíveis com a planilha", () => {
    expect(
      normalizeChartConfig(
        { enabled: true, type: "radar", labelCol: -2, valueCol: 99 },
        2,
      ),
    ).toEqual({ enabled: true, type: "barras", labelCol: 0, valueCol: 1 });
  });

  it("preserva compatibilidade com planilhas sem gráfico", () => {
    expect(normalizeChartConfig(undefined, 3)).toEqual(DEFAULT_CHART_CONFIG);
  });
});
