import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export default {
  async run(config, input) {
    const operation = config.operation || "compress";
    const text = config.text || input?.text || JSON.stringify(input || "");
    if (operation === "compress") {
      const compressed = await gzip(Buffer.from(text, "utf8"));
      return { result: compressed.toString("base64"), originalSize: text.length, compressedSize: compressed.length, format: "gzip+base64" };
    }
    try {
      const buf = Buffer.from(text, "base64");
      const decompressed = await gunzip(buf);
      return { result: decompressed.toString("utf8"), format: "gzip" };
    } catch {
      throw new Error("zip_files: failed to decompress — is input valid gzip base64?");
    }
  },
};
