export default {
  async run(config, input) {
    const principal = parseFloat(config.principal ?? input?.principal ?? 1000);
    const rate = parseFloat(config.rate ?? input?.rate ?? 5) / 100;
    const years = parseFloat(config.years ?? input?.years ?? 1);
    const n = parseInt(config.compoundsPerYear ?? 12);

    const amount = principal * Math.pow(1 + rate / n, n * years);
    const interest = amount - principal;
    const effectiveRate = (Math.pow(1 + rate / n, n) - 1) * 100;

    return {
      principal, ratePercent: rate * 100, years, compoundsPerYear: n,
      finalAmount: Math.round(amount * 100) / 100,
      interestEarned: Math.round(interest * 100) / 100,
      effectiveAnnualRatePercent: Math.round(effectiveRate * 100) / 100,
    };
  },
};
