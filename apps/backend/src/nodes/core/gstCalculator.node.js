export default {
  async run(config, input) {
    const amount = parseFloat(config.amount ?? input?.amount ?? 0);
    const rate = parseFloat(config.rate ?? input?.rate ?? 18);
    const inclusive = config.inclusive === true || config.inclusive === "true";

    let base, gst, total;
    if (inclusive) {
      gst = amount - (amount * 100) / (100 + rate);
      base = amount - gst;
      total = amount;
    } else {
      base = amount;
      gst = (amount * rate) / 100;
      total = amount + gst;
    }

    return {
      baseAmount: Math.round(base * 100) / 100,
      gstAmount: Math.round(gst * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      ratePercent: rate,
      inclusive,
    };
  },
};
