export const DEFAULT_CHART_CONFIG = Object.freeze({
  enabled: false,
  type: "barras",
  labelCol: 0,
  valueCol: 1,
});

export const normalizeChartConfig = (chart, columnCount = 0) => {
  const maxIndex = Math.max(0, Number(columnCount) - 1);
  const clampIndex = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed)
      ? Math.max(0, Math.min(maxIndex, parsed))
      : Math.min(maxIndex, fallback);
  };
  const allowedTypes = new Set(["barras", "linha", "pizza"]);
  return {
    enabled: chart?.enabled === true,
    type: allowedTypes.has(chart?.type) ? chart.type : DEFAULT_CHART_CONFIG.type,
    labelCol: clampIndex(chart?.labelCol, DEFAULT_CHART_CONFIG.labelCol),
    valueCol: clampIndex(chart?.valueCol, DEFAULT_CHART_CONFIG.valueCol),
  };
};
