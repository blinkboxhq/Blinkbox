export default {
  backendType: "qr_code",
  label: "QR Code Generator",
  description: "Generate a QR code as a base64 PNG image",
  fields: [
    {
      name: "content", label: "Content to Encode", type: "string", smart: true,
      placeholder: "https://example.com or any text",
    },
    {
      name: "size", label: "Size (px)", type: "number", min: 100, max: 1000, step: 50, default: 300,
    },
    {
      name: "errorCorrection", label: "Error Correction", type: "options", cols: 4, default: "M",
      options: [
        { value: "L", label: "L — 7%" },
        { value: "M", label: "M — 15%" },
        { value: "Q", label: "Q — 25%" },
        { value: "H", label: "H — 30%" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "darkColor", label: "Dark Color", type: "color", default: "#000000" },
        { name: "lightColor", label: "Light Color", type: "color", default: "#ffffff" },
      ],
    },
  ],
  outputs: ["dataUrl", "base64"],
};
