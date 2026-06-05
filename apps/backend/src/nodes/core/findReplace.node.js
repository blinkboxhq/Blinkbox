export default {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const find = config.find;
    const replace = config.replace ?? "";
    const useRegex = config.useRegex === true || config.useRegex === "true";
    const caseSensitive = config.caseSensitive !== false;

    if (!find) return { success: false, error: "find_replace: 'find' is required.", skipped: true };

    let result;
    if (useRegex) {
      const flags = caseSensitive ? "g" : "gi";
      result = text.replace(new RegExp(find, flags), replace);
    } else {
      const flags = caseSensitive ? "g" : "gi";
      result = text.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags), replace);
    }
    return { result, original: text, replacements: (text.match(new RegExp(find, "gi")) || []).length };
  },
};
