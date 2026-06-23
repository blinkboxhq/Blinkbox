export default {
  async run(config, input) {
    const a = config.versionA || input?.versionA || "0.0.0";
    const b = config.versionB || input?.versionB || "0.0.0";

    const parse = (v) => v.replace(/^v/, "").split(".").map(Number);
    const pa = parse(a), pb = parse(b);
    let result = 0;
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) { result = 1; break; }
      if ((pa[i] || 0) < (pb[i] || 0)) { result = -1; break; }
    }
    return { result, comparison: result === 0 ? "equal" : result > 0 ? "greater" : "less", versionA: a, versionB: b, isNewer: result > 0, isOlder: result < 0, isEqual: result === 0 };
  },
};
