export default {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const operation = config.operation || "trim";
    const ops = {
      uppercase: (t) => t.toUpperCase(),
      lowercase: (t) => t.toLowerCase(),
      trim: (t) => t.trim(),
      capitalize: (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
      titlecase: (t) => t.replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: (t) => t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, ""),
      camelcase: (t) => t.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase()),
      snakecase: (t) => t.replace(/\s+/g, "_").toLowerCase().replace(/[^\w_]/g, ""),
      reverse: (t) => t.split("").reverse().join(""),
      truncate: (t) => config.maxLength ? t.substring(0, parseInt(config.maxLength)) + (t.length > parseInt(config.maxLength) ? "..." : "") : t,
      wordcount: (t) => { const words = t.trim().split(/\s+/).filter(Boolean); return { result: t, wordCount: words.length, charCount: t.length }; },
    };
    if (!ops[operation]) throw new Error(`text_format: unknown operation "${operation}".`);
    const result = ops[operation](text);
    return typeof result === "object" ? result : { result };
  },
};
