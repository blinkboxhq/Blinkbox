export default {
  async run(config, input) {
    const currentPrice = parseFloat(config.currentPrice ?? input?.price ?? input?.currentPrice ?? 0);
    const targetPrice = parseFloat(config.targetPrice ?? 0);
    const condition = config.condition || "below";

    const triggered = condition === "below" ? currentPrice <= targetPrice
      : condition === "above" ? currentPrice >= targetPrice
      : currentPrice === targetPrice;

    const diff = currentPrice - targetPrice;
    const diffPercent = targetPrice !== 0 ? (diff / targetPrice) * 100 : 0;

    return { triggered, currentPrice, targetPrice, condition, difference: Math.round(diff * 100) / 100, differencePercent: Math.round(diffPercent * 100) / 100 };
  },
};
