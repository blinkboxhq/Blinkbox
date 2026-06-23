export default {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const pattern = config.pattern;
    const flags = config.flags || "g";
    if (!pattern) return { success: false, error: "regex_match: 'pattern' is required.", skipped: true };

    const re = new RegExp(pattern, flags);
    const matches = [...text.matchAll(re)].map((m) => ({ match: m[0], groups: m.slice(1), index: m.index }));
    return { matches, count: matches.length, firstMatch: matches[0]?.match || null, matched: matches.length > 0 };
  },
};
