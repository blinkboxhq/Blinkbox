export default {
  async run(config, input) {
    const operation = config.operation || "test";
    const text = config.field ?? config.text ?? input?.text ?? (typeof input === "string" ? input : "");
    const pattern = config.pattern;
    const outputField = config.outputField || "result";
    if (!pattern) return { success: false, error: "regex_match: 'pattern' is required.", skipped: true };

    const flags = config.flags || "g";
    let re;
    try {
      re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
    } catch (e) {
      throw new Error(`regex_match: invalid pattern — ${e.message}`);
    }

    const all = [...String(text).matchAll(re)];

    switch (operation) {
      case "test":
        return { [outputField]: all.length > 0, matched: all.length > 0, count: all.length };
      case "match":
        return { [outputField]: all.map((m) => m[0]), matched: all.length > 0, count: all.length };
      case "extract": {
        const group = Number(config.group ?? 0);
        const values = all.map((m) => m[group]).filter((v) => v !== undefined);
        return { [outputField]: values[0] ?? null, all: values, matched: values.length > 0, count: values.length };
      }
      default:
        throw new Error(`regex_match: unknown operation "${operation}". Use test, match, or extract.`);
    }
  },
};
