export default {
  async run(config, input) {
    const operation = config.operation || "set";
    const key = config.key;
    const value = config.value ?? input?.value;
    if (!key) return { success: false, error: "variable_set_get: 'key' is required.", skipped: true };
    if (operation === "set") {
      return { key, value, set: true, ...input };
    }
    return { key, value: input?.[key] ?? null, ...input };
  },
};
