export default {
  async run(config, input) {
    const value = config.value ?? input;
    const stringValue = String(value ?? "");
    const cases = Array.isArray(config.cases) ? config.cases : [];
    const caseInsensitive = config.caseInsensitive === true;
    const defaultCase = config.defaultCase || "default";

    const compare = (a, b) =>
      caseInsensitive
        ? String(a).toLowerCase() === String(b).toLowerCase()
        : String(a) === String(b);

    const matched = cases.find((c) => compare(stringValue, c.match));

    return {
      value: stringValue,
      matchedCase: matched ? matched.label : defaultCase,
      isDefault: !matched,
      _routePath: matched ? matched.label : defaultCase,
    };
  },
};
