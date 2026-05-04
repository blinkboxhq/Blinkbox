import sharp from "sharp";
import axios from "axios";

export default {
  async run(config) {
    const source = config.source;
    if (!source) return { success: false, error: "Image Resize: 'source' is required — configure this field.", skipped: true };

    let inputBuffer;
    if (/^https?:\/\//i.test(source)) {
      const res = await axios.get(source, { responseType: "arraybuffer", timeout: 15000 });
      inputBuffer = Buffer.from(res.data);
    } else {
      // Base64 data URL or raw base64
      const b64 = source.replace(/^data:[^;]+;base64,/, "");
      inputBuffer = Buffer.from(b64, "base64");
    }

    const format = ["jpeg", "png", "webp", "avif"].includes(config.format) ? config.format : "jpeg";
    const quality = Math.min(Math.max(parseInt(config.quality) || 80, 1), 100);
    const fit = ["cover", "contain", "fill", "inside", "outside"].includes(config.fit) ? config.fit : "cover";

    const resizeOpts = { fit };
    if (config.width) resizeOpts.width = parseInt(config.width);
    if (config.height) resizeOpts.height = parseInt(config.height);

    let pipeline = sharp(inputBuffer);
    if (resizeOpts.width || resizeOpts.height) pipeline = pipeline.resize(resizeOpts);

    const outputBuffer = await pipeline[format]({ quality }).toBuffer();
    const meta = await sharp(outputBuffer).metadata();

    const dataUrl = `data:image/${format};base64,${outputBuffer.toString("base64")}`;
    return {
      dataUrl,
      format,
      width: meta.width,
      height: meta.height,
      sizeBytes: outputBuffer.length,
    };
  },
};
