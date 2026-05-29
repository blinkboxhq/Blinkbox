export default {
  backendType: "image_resize",
  label: "Image Resize",
  description: "Resize, compress, or convert images",
  fields: [
    {
      name: "source", label: "Image Source", type: "string", smart: true,
      placeholder: "{{ $json.dataUrl }} or https://...",
      hint: "Base64 data URL or HTTP/HTTPS URL",
    },
    {
      type: "row",
      fields: [
        { name: "width", label: "Width (px)", type: "number", min: 1, default: 800 },
        { name: "height", label: "Height (px)", type: "number", min: 1, default: 600 },
      ],
    },
    {
      name: "fit", label: "Fit Mode", type: "options", cols: 3, default: "cover",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
        { value: "inside", label: "Inside" },
        { value: "outside", label: "Outside" },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "format", label: "Format", type: "options", cols: 2, default: "jpeg",
          options: ["jpeg", "png", "webp", "avif"],
        },
        { name: "quality", label: "Quality (1–100)", type: "number", min: 1, max: 100, default: 80 },
      ],
    },
  ],
  outputs: ["dataUrl", "base64", "width", "height", "format"],
};
