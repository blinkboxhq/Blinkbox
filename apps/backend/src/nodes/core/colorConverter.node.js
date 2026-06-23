export default {
  async run(config, input) {
    const color = config.color || input?.color || "#000000";
    const to = (config.to || "rgb").toLowerCase();

    const hexToRgb = (hex) => {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    let rgb;
    if (color.startsWith("#")) {
      rgb = hexToRgb(color);
    } else if (color.startsWith("rgb")) {
      const m = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (!m) throw new Error("color_converter: invalid rgb format.");
      rgb = { r: +m[1], g: +m[2], b: +m[3] };
    } else {
      throw new Error("color_converter: provide hex (#rrggbb) or rgb(r,g,b).");
    }

    if (to === "rgb") return { result: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, ...rgb };
    if (to === "hex") return { result: `#${[rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, "0")).join("")}` };
    if (to === "hsl") { const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b); return { result: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, ...hsl }; }
    throw new Error(`color_converter: unknown target format "${to}". Use: rgb, hex, hsl`);
  },
};
