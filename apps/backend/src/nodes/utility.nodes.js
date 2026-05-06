import crypto from "crypto";
import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ── base64 ───────────────────────────────────────────────────────────────────
export const base64 = {
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

// ── hash ─────────────────────────────────────────────────────────────────────
export const hash = {
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

// ── color_converter ──────────────────────────────────────────────────────────
export const color_converter = {
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

// ── unit_converter ───────────────────────────────────────────────────────────
export const unit_converter = {
  async run(config, input) {
    const value = parseFloat(config.value ?? input?.value ?? 0);
    const from = (config.from || "").toLowerCase();
    const to = (config.to || "").toLowerCase();

    const factors = {
      // Length (base: meter)
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
      // Weight (base: kg)
      kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000,
      // Data (base: bytes)
      b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776,
      // Time (base: seconds)
      s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, wk: 604800,
    };

    // Temperature special case
    if (from === "c" && to === "f") return { result: (value * 9 / 5) + 32, from, to };
    if (from === "f" && to === "c") return { result: (value - 32) * 5 / 9, from, to };
    if (from === "c" && to === "k") return { result: value + 273.15, from, to };
    if (from === "k" && to === "c") return { result: value - 273.15, from, to };

    if (!factors[from]) throw new Error(`unit_converter: unknown unit "${from}".`);
    if (!factors[to]) throw new Error(`unit_converter: unknown unit "${to}".`);
    const result = (value * factors[from]) / factors[to];
    return { result, from, to, original: value };
  },
};

// ── number_format ─────────────────────────────────────────────────────────────
export const number_format = {
  async run(config, input) {
    const value = parseFloat(config.value ?? input?.value ?? 0);
    const locale = config.locale || "en-US";
    const style = config.style || "decimal";
    const currency = config.currency || "USD";
    const decimals = config.decimals !== undefined ? parseInt(config.decimals) : undefined;

    const opts = { style };
    if (style === "currency") opts.currency = currency;
    if (decimals !== undefined) { opts.minimumFractionDigits = decimals; opts.maximumFractionDigits = decimals; }

    const result = new Intl.NumberFormat(locale, opts).format(value);
    return { result, value, locale, style };
  },
};

// ── find_replace ─────────────────────────────────────────────────────────────
export const find_replace = {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const find = config.find;
    const replace = config.replace ?? "";
    const useRegex = config.useRegex === true || config.useRegex === "true";
    const caseSensitive = config.caseSensitive !== false;

    if (!find) return { success: false, error: "find_replace: 'find' is required.", skipped: true };

    let result;
    if (useRegex) {
      const flags = caseSensitive ? "g" : "gi";
      result = text.replace(new RegExp(find, flags), replace);
    } else {
      const flags = caseSensitive ? "g" : "gi";
      result = text.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags), replace);
    }
    return { result, original: text, replacements: (text.match(new RegExp(find, "gi")) || []).length };
  },
};

// ── regex_match ───────────────────────────────────────────────────────────────
export const regex_match = {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const pattern = config.pattern;
    const flags = config.flags || "g";
    if (!pattern) return { success: false, error: "regex_match: 'pattern' is required.", skipped: true };

    const re = new RegExp(pattern, flags);
    const matches = [...text.matchAll(re)].map((m) => ({ match: m[0], groups: m.slice(1), index: m.index }));
    return { matches, count: matches.length, firstMatch: matches[0]?.match || null, matched: matches.length > 0 };
  },
};

// ── math_expression ───────────────────────────────────────────────────────────
export const math_expression = {
  async run(config, input) {
    const expression = config.expression || input?.expression;
    if (!expression) return { success: false, error: "math_expression: 'expression' is required.", skipped: true };

    // Safe evaluator — only numbers, operators, Math functions, parentheses
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

// ── html_to_text ──────────────────────────────────────────────────────────────
export const html_to_text = {
  async run(config, input) {
    const html = config.html || input?.html || input?.body || String(input || "");
    const result = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { result, length: result.length };
  },
};

// ── json_to_csv ───────────────────────────────────────────────────────────────
export const json_to_csv = {
  async run(config, input) {
    const data = config.data || input?.data || input;
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length) return { result: "", rows: 0 };

    const delimiter = config.delimiter || ",";
    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(delimiter) || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(delimiter), ...rows.map((r) => headers.map((h) => escape(r[h])).join(delimiter))];
    return { result: lines.join("\n"), headers, rows: rows.length };
  },
};

// ── markdown_renderer ─────────────────────────────────────────────────────────
export const markdown_renderer = {
  async run(config, input) {
    const markdown = config.markdown || config.text || input?.markdown || input?.text || String(input || "");
    // Simple markdown→HTML (no external dep required)
    let html = markdown
      .replace(/^#{6}\s+(.+)$/gm, "<h6>$1</h6>")
      .replace(/^#{5}\s+(.+)$/gm, "<h5>$1</h5>")
      .replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>")
      .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
      .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
      .replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hplio])/gm, "");
    html = `<p>${html}</p>`.replace(/<p><\/p>/g, "");
    return { result: html, markdown };
  },
};

// ── text_format ───────────────────────────────────────────────────────────────
export const text_format = {
  async run(config, input) {
    const text = config.text || input?.text || String(input || "");
    const operation = config.operation || "trim";
    const ops = {
      uppercase: (t) => t.toUpperCase(),
      lowercase: (t) => t.toLowerCase(),
      trim: (t) => t.trim(),
      capitalize: (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
      titlecase: (t) => t.replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: (t) => t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, ""),
      camelcase: (t) => t.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase()),
      snakecase: (t) => t.replace(/\s+/g, "_").toLowerCase().replace(/[^\w_]/g, ""),
      reverse: (t) => t.split("").reverse().join(""),
      truncate: (t) => config.maxLength ? t.substring(0, parseInt(config.maxLength)) + (t.length > parseInt(config.maxLength) ? "..." : "") : t,
      wordcount: (t) => { const words = t.trim().split(/\s+/).filter(Boolean); return { result: t, wordCount: words.length, charCount: t.length }; },
    };
    if (!ops[operation]) throw new Error(`text_format: unknown operation "${operation}".`);
    const result = ops[operation](text);
    return typeof result === "object" ? result : { result };
  },
};

// ── random_pick ───────────────────────────────────────────────────────────────
export const random_pick = {
  async run(config, input) {
    const items = config.items || input?.items || input;
    const arr = Array.isArray(items) ? items : String(items).split(",").map((s) => s.trim());
    if (!arr.length) return { success: false, error: "random_pick: 'items' array is required.", skipped: true };
    const count = Math.min(parseInt(config.count || 1), arr.length);
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    return { result: count === 1 ? picked[0] : picked, items: picked, index: arr.indexOf(picked[0]) };
  },
};

// ── pagination_handler ────────────────────────────────────────────────────────
export const pagination_handler = {
  async run(config, input) {
    const data = Array.isArray(input?.data) ? input.data : Array.isArray(input) ? input : [];
    const page = parseInt(config.page ?? input?.page ?? 1);
    const pageSize = parseInt(config.pageSize ?? config.limit ?? 10);
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = data.slice(start, start + pageSize);
    return { items, page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  },
};

// ── counter ───────────────────────────────────────────────────────────────────
export const counter = {
  async run(config, input) {
    const data = Array.isArray(input) ? input : input?.items || [];
    const field = config.field;
    if (field) {
      const counts = {};
      for (const item of data) {
        const key = String(item[field] ?? "null");
        counts[key] = (counts[key] || 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return { counts, sorted: sorted.map(([value, count]) => ({ value, count })), total: data.length };
    }
    return { count: Array.isArray(data) ? data.length : 1, total: Array.isArray(data) ? data.length : 1 };
  },
};

// ── variable_set_get ──────────────────────────────────────────────────────────
export const variable_set_get = {
  async run(config, input) {
    const operation = config.operation || "set";
    const key = config.key;
    const value = config.value ?? input?.value;
    if (!key) return { success: false, error: "variable_set_get: 'key' is required.", skipped: true };
    if (operation === "set") {
      return { key, value, set: true, ...input };
    }
    return { key, value: input?.[key] ?? null, ...input };
  },
};

// ── schedule_check ────────────────────────────────────────────────────────────
export const schedule_check = {
  async run(config, input) {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const allowedDays = config.days ? config.days.map(Number) : [0, 1, 2, 3, 4, 5, 6];
    const startHour = parseInt(config.startHour ?? 0);
    const endHour = parseInt(config.endHour ?? 23);
    const timezone = config.timezone || "UTC";

    const inDay = allowedDays.includes(day);
    const inHour = hour >= startHour && hour <= endHour;
    const isActive = inDay && inHour;

    return { isActive, day, hour, minute, timezone, currentTime: now.toISOString(), ...input };
  },
};

// ── semver_compare ────────────────────────────────────────────────────────────
export const semver_compare = {
  async run(config, input) {
    const a = config.versionA || input?.versionA || "0.0.0";
    const b = config.versionB || input?.versionB || "0.0.0";

    const parse = (v) => v.replace(/^v/, "").split(".").map(Number);
    const pa = parse(a), pb = parse(b);
    let result = 0;
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) { result = 1; break; }
      if ((pa[i] || 0) < (pb[i] || 0)) { result = -1; break; }
    }
    return { result, comparison: result === 0 ? "equal" : result > 0 ? "greater" : "less", versionA: a, versionB: b, isNewer: result > 0, isOlder: result < 0, isEqual: result === 0 };
  },
};

// ── env_variable ──────────────────────────────────────────────────────────────
export const env_variable = {
  async run(config, input) {
    const key = config.key;
    if (!key) return { success: false, error: "env_variable: 'key' is required.", skipped: true };
    const blocked = ["DATABASE_URL", "MONGODB_URI", "JWT_SECRET", "ENCRYPTION_KEY", "REDIS_URL"];
    if (blocked.some((b) => key.toUpperCase().includes(b.split("_")[0]))) {
      throw new Error(`env_variable: access to "${key}" is not allowed.`);
    }
    const value = process.env[key] ?? config.defaultValue ?? null;
    return { key, value, exists: value !== null };
  },
};

// ── error (stop with error) ───────────────────────────────────────────────────
export const error = {
  async run(config, input) {
    const message = config.message || config.error || "Workflow stopped by error node.";
    throw new Error(message);
  },
};

// ── zip_files ─────────────────────────────────────────────────────────────────
export const zip_files = {
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

// ── color_palette ─────────────────────────────────────────────────────────────
export const color_palette = {
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

// ── compound_interest ─────────────────────────────────────────────────────────
export const compound_interest = {
  async run(config, input) {
    const principal = parseFloat(config.principal ?? input?.principal ?? 1000);
    const rate = parseFloat(config.rate ?? input?.rate ?? 5) / 100;
    const years = parseFloat(config.years ?? input?.years ?? 1);
    const n = parseInt(config.compoundsPerYear ?? 12);

    const amount = principal * Math.pow(1 + rate / n, n * years);
    const interest = amount - principal;
    const effectiveRate = (Math.pow(1 + rate / n, n) - 1) * 100;

    return {
      principal, ratePercent: rate * 100, years, compoundsPerYear: n,
      finalAmount: Math.round(amount * 100) / 100,
      interestEarned: Math.round(interest * 100) / 100,
      effectiveAnnualRatePercent: Math.round(effectiveRate * 100) / 100,
    };
  },
};

// ── gst_calculator ────────────────────────────────────────────────────────────
export const gst_calculator = {
  async run(config, input) {
    const amount = parseFloat(config.amount ?? input?.amount ?? 0);
    const rate = parseFloat(config.rate ?? input?.rate ?? 18);
    const inclusive = config.inclusive === true || config.inclusive === "true";

    let base, gst, total;
    if (inclusive) {
      gst = amount - (amount * 100) / (100 + rate);
      base = amount - gst;
      total = amount;
    } else {
      base = amount;
      gst = (amount * rate) / 100;
      total = amount + gst;
    }

    return {
      baseAmount: Math.round(base * 100) / 100,
      gstAmount: Math.round(gst * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      ratePercent: rate,
      inclusive,
    };
  },
};

// ── payroll_calculator ────────────────────────────────────────────────────────
export const payroll_calculator = {
  async run(config, input) {
    const gross = parseFloat(config.grossSalary ?? input?.grossSalary ?? 0);
    const taxRate = parseFloat(config.taxRate ?? 20) / 100;
    const socialSecurity = parseFloat(config.socialSecurity ?? 6.2) / 100;
    const medicare = parseFloat(config.medicare ?? 1.45) / 100;
    const otherDeductions = parseFloat(config.otherDeductions ?? 0);

    const federalTax = gross * taxRate;
    const ssTax = gross * socialSecurity;
    const medicareTax = gross * medicare;
    const totalDeductions = federalTax + ssTax + medicareTax + otherDeductions;
    const netPay = gross - totalDeductions;

    return {
      grossSalary: Math.round(gross * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      socialSecurityTax: Math.round(ssTax * 100) / 100,
      medicareTax: Math.round(medicareTax * 100) / 100,
      otherDeductions,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      effectiveTaxRate: Math.round((totalDeductions / gross) * 10000) / 100,
    };
  },
};

// ── tax_rate_lookup ───────────────────────────────────────────────────────────
export const tax_rate_lookup = {
  async run(config, input) {
    const country = (config.country || input?.country || "US").toUpperCase();
    const rates = {
      US: { vat: 0, corporateTax: 21, incomeTaxTop: 37, note: "No federal VAT; state sales tax 0-10%" },
      GB: { vat: 20, corporateTax: 25, incomeTaxTop: 45, note: "UK standard VAT 20%" },
      DE: { vat: 19, corporateTax: 15, incomeTaxTop: 45, note: "Germany" },
      FR: { vat: 20, corporateTax: 25, incomeTaxTop: 45, note: "France" },
      IN: { vat: 18, corporateTax: 22, incomeTaxTop: 30, note: "India GST standard rate" },
      AU: { vat: 10, corporateTax: 30, incomeTaxTop: 45, note: "Australia GST" },
      CA: { vat: 5, corporateTax: 15, incomeTaxTop: 33, note: "Canada federal GST; provinces add 0-10%" },
      SG: { vat: 9, corporateTax: 17, incomeTaxTop: 22, note: "Singapore GST" },
      JP: { vat: 10, corporateTax: 23.2, incomeTaxTop: 45, note: "Japan consumption tax" },
      AE: { vat: 5, corporateTax: 9, incomeTaxTop: 0, note: "UAE — no personal income tax" },
    };
    const data = rates[country];
    if (!data) return { country, found: false, note: "Country not in lookup table. Check OECD for rates." };
    return { country, ...data, found: true };
  },
};

// ── price_alert ───────────────────────────────────────────────────────────────
export const price_alert = {
  async run(config, input) {
    const currentPrice = parseFloat(config.currentPrice ?? input?.price ?? input?.currentPrice ?? 0);
    const targetPrice = parseFloat(config.targetPrice ?? 0);
    const condition = config.condition || "below";

    const triggered = condition === "below" ? currentPrice <= targetPrice
      : condition === "above" ? currentPrice >= targetPrice
      : currentPrice === targetPrice;

    const diff = currentPrice - targetPrice;
    const diffPercent = targetPrice !== 0 ? (diff / targetPrice) * 100 : 0;

    return { triggered, currentPrice, targetPrice, condition, difference: Math.round(diff * 100) / 100, differencePercent: Math.round(diffPercent * 100) / 100 };
  },
};

// ── leaderboard_update ────────────────────────────────────────────────────────
export const leaderboard_update = {
  async run(config, input) {
    const leaderboard = Array.isArray(config.leaderboard || input?.leaderboard) ? (config.leaderboard || input?.leaderboard) : [];
    const userId = config.userId || input?.userId;
    const score = parseFloat(config.score ?? input?.score ?? 0);
    const name = config.name || input?.name || userId;

    const existing = leaderboard.find((e) => e.userId === userId);
    let updated;
    if (existing) {
      updated = leaderboard.map((e) => e.userId === userId ? { ...e, score: e.score + score, name } : e);
    } else {
      updated = [...leaderboard, { userId, name, score, joinedAt: new Date().toISOString() }];
    }
    const ranked = [...updated].sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
    const userEntry = ranked.find((e) => e.userId === userId);
    return { leaderboard: ranked, userEntry, totalPlayers: ranked.length };
  },
};

// ── ledger_entry ──────────────────────────────────────────────────────────────
export const ledger_entry = {
  async run(config, input) {
    const type = config.type || "debit";
    const amount = parseFloat(config.amount ?? input?.amount ?? 0);
    const description = config.description || input?.description || "";
    const category = config.category || "general";
    const ledger = Array.isArray(input?.ledger) ? input.ledger : [];

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      type, amount, description, category,
      date: config.date || new Date().toISOString(),
    };

    const updated = [...ledger, entry];
    const balance = updated.reduce((acc, e) => acc + (e.type === "credit" ? e.amount : -e.amount), 0);
    const totalCredits = updated.filter((e) => e.type === "credit").reduce((a, e) => a + e.amount, 0);
    const totalDebits = updated.filter((e) => e.type === "debit").reduce((a, e) => a + e.amount, 0);

    return { entry, ledger: updated, balance: Math.round(balance * 100) / 100, totalCredits, totalDebits };
  },
};
