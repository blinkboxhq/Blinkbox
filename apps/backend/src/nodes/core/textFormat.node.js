const OPS = {
  uppercase:   (t) => t.toUpperCase(),
  lowercase:   (t) => t.toLowerCase(),
  titlecase:   (t) => t.replace(/\b\w/g, (c) => c.toUpperCase()),
  capitalize:  (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
  camelcase:   (t) => t.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase()),
  snakecase:   (t) => t.replace(/\s+/g, "_").toLowerCase().replace(/[^\w_]/g, ""),
  trim:        (t) => t.trim(),
  trim_start:  (t) => t.trimStart(),
  trim_end:    (t) => t.trimEnd(),
  slug:        (t) => t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, ""),
  reverse:     (t) => t.split("").reverse().join(""),
  remove_html: (t) => t.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
  truncate:    (t, c) => {
    const max = parseInt(c.length ?? c.maxLength ?? 100, 10);
    if (!Number.isFinite(max) || t.length <= max) return t;
    return t.slice(0, max) + (c.suffix ?? "...");
  },
  pad_start:   (t, c) => t.padStart(parseInt(c.padLength ?? 10, 10) || 0, c.padChar || " "),
  pad_end:     (t, c) => t.padEnd(parseInt(c.padLength ?? 10, 10) || 0, c.padChar || " "),
  wordcount:   (t) => t.trim().split(/\s+/).filter(Boolean).length,
};

export default {
  async run(config, input) {
    const operation = config.operation || "trim";
    const fn = OPS[operation];
    if (!fn) throw new Error(`text_format: unknown operation "${operation}".`);

    const raw = config.field ?? config.text ?? input?.text ?? (typeof input === "string" ? input : "");
    const text = String(raw ?? "");
    const result = fn(text, config);

    return { [config.outputField || "result"]: result };
  },
};
