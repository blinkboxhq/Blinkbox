export default {
  async run(config, input) {
    const value = parseFloat(config.value ?? input?.value ?? 0);
    const from = (config.from || "").toLowerCase();
    const to = (config.to || "").toLowerCase();

    const factors = {
      // Length (base: meter)
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
      // Weight (base: kg)
      kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000,
      // Data (base: bytes)
      b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776,
      // Time (base: seconds)
      s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, wk: 604800,
    };

    // Temperature special case
    if (from === "c" && to === "f") return { result: (value * 9 / 5) + 32, from, to };
    if (from === "f" && to === "c") return { result: (value - 32) * 5 / 9, from, to };
    if (from === "c" && to === "k") return { result: value + 273.15, from, to };
    if (from === "k" && to === "c") return { result: value - 273.15, from, to };

    if (!factors[from]) throw new Error(`unit_converter: unknown unit "${from}".`);
    if (!factors[to]) throw new Error(`unit_converter: unknown unit "${to}".`);
    const result = (value * factors[from]) / factors[to];
    return { result, from, to, original: value };
  },
};
