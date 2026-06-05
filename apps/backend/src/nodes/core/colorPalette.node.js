export default {
  async run(config, input) {
    const baseHex = config.color || input?.color || "#6366f1";
    const count = parseInt(config.count || 5);
    const style = config.style || "analogous";

    const hexToHsl = (hex) => {
      let r = parseInt(hex.slice(1, 3), 16) / 255;
      let g = parseInt(hex.slice(3, 5), 16) / 255;
      let b = parseInt(hex.slice(5, 7), 16) / 255;
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
      return [h * 360, s * 100, l * 100];
    };

    const hslToHex = (h, s, l) => {
      s /= 100; l /= 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
    };

    const [h, s, l] = hexToHsl(baseHex);
    const palette = [];

    for (let i = 0; i < count; i++) {
      let nh = h;
      if (style === "analogous") nh = (h + (i - Math.floor(count / 2)) * 30) % 360;
      else if (style === "complementary") nh = i % 2 === 0 ? h : (h + 180) % 360;
      else if (style === "triadic") nh = (h + (i % 3) * 120) % 360;
      else if (style === "monochromatic") { palette.push(hslToHex(h, s, Math.max(10, Math.min(90, l - 30 + i * (60 / count))))); continue; }
      palette.push(hslToHex(nh < 0 ? nh + 360 : nh, s, l));
    }

    return { palette, base: baseHex, style, count };
  },
};
