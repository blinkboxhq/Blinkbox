export default {
  async run(config, input) {
    const expression = config.expression || input?.expression;
    if (!expression) return { success: false, error: "math_expression: 'expression' is required.", skipped: true };

    const safe = expression.replace(/[^0-9+\-*/%.() eMathsqrtabLogPIe]/g, "");
    if (safe !== expression) throw new Error("math_expression: expression contains unsafe characters.");

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();
      return { result, expression };
    } catch (e) {
      throw new Error(`math_expression: ${e.message}`);
    }
  },
};
