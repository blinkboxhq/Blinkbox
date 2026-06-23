export default {
  async run(config, input) {
    const operation = config.operation || "encode";
    const text = config.text || input?.text || String(input || "");
    if (operation === "encode") {
      return { result: Buffer.from(text, "utf8").toString("base64"), operation: "encode" };
    }
    try {
      return { result: Buffer.from(text, "base64").toString("utf8"), operation: "decode" };
    } catch {
      throw new Error("base64: invalid base64 string.");
    }
  },
};
