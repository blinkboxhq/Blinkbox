import crypto from "crypto";

export default {
  async run(config, input) {
    const algorithm = (config.algorithm || "sha256").toLowerCase();
    const text = config.text || input?.text || JSON.stringify(input || "");
    const encoding = config.encoding || "hex";
    const valid = ["md5", "sha1", "sha256", "sha512", "sha3-256"];
    if (!valid.includes(algorithm)) throw new Error(`hash: unsupported algorithm "${algorithm}". Use: ${valid.join(", ")}`);
    const result = crypto.createHash(algorithm).update(text).digest(encoding);
    return { result, algorithm, encoding };
  },
};
