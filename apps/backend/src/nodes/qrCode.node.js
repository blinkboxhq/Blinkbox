import QRCode from "qrcode";

export default {
  async run(config) {
    const content = config.content;
    if (!content) throw new Error("QR Code: 'content' is required.");

    const size = Math.min(Math.max(parseInt(config.size) || 300, 100), 1000);
    const errorCorrectionLevel = ["L", "M", "Q", "H"].includes(config.errorCorrection)
      ? config.errorCorrection
      : "M";
    const dark = /^#[0-9A-Fa-f]{6}$/.test(config.darkColor) ? config.darkColor : "#000000";
    const light = /^#[0-9A-Fa-f]{6}$/.test(config.lightColor) ? config.lightColor : "#ffffff";

    const dataUrl = await QRCode.toDataURL(content, {
      width: size,
      errorCorrectionLevel,
      color: { dark, light },
    });

    return { dataUrl, content, size, format: "png" };
  },
};
