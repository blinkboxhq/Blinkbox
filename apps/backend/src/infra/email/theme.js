/**
 * Blinkbox email design system.
 *
 * Every surface here mirrors the dashboard: same near-black stack, same
 * #6f97e8 accent, same Inter/JetBrains Mono pairing. Mail clients strip
 * stylesheets, so the whole thing is nested tables with inline styles —
 * the tokens below are the single source of truth instead of a class list.
 *
 * Two rules that shape everything:
 *   1. Anything interpolated from user or Stripe data goes through esc().
 *   2. The page sits on pure black so the logo's own matte disappears into it.
 */

export const APP_URL = process.env.VITE_APP_URL || "https://blinkbox.net";
export const APP_NAME = "Blinkbox";
export const LOGO_URL = `${APP_URL}/email/logo.png`;

// Dashboard tokens (apps/frontend/src/index.css)
export const C = {
  page: "#000000",
  card: "#0f0f0f",
  panel: "#1b1b1b",
  raised: "#262626",
  borderSubtle: "#2b2b2b",
  border: "#3b3b3b",
  borderStrong: "#545454",
  hi: "#fafafa",
  mid: "#b6b6b6",
  lo: "#8c8c8c",
  dim: "#6d6d6d",
  accent: "#6f97e8",
  accentHot: "#a9c0ef",
  // Flat stand-ins for the dashboard's translucent accents — rgba() is
  // unreliable in Outlook, so these are pre-blended over #0f0f0f.
  accentSoft: "#1c222d",
  accentEdge: "#2c3a55",
  good: "#5fd08a",
  goodSoft: "#12231a",
  goodEdge: "#1e3d2c",
  warn: "#e8b86f",
  warnSoft: "#241d10",
  warnEdge: "#453620",
  bad: "#e87f7f",
  badSoft: "#251312",
  badEdge: "#43201f",
};

export const FONT =
  "'Inter','Inter var',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

const PAD = "padding:36px 40px";

export function esc(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const fmtCredits = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString("en-US");

export const fmtUsd = (n) => `$${Math.max(0, Number(n) || 0).toFixed(2)}`;

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const fmtDateTime = (d) =>
  `${new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} UTC`;

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

export function layout({ preheader = "", subject = "", body = "" }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${C.page}; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  table { border-collapse:collapse !important; }
  .bb-pad { ${PAD}; }
  @media only screen and (max-width:620px) {
    .bb-pad { padding:26px 22px !important; }
    .bb-h1 { font-size:23px !important; line-height:31px !important; }
    .bb-stat { display:block !important; width:100% !important; }
    .bb-btn a { display:block !important; }
  }
</style>
<!--[if mso]><style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;font-size:1px;color:${C.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:36px 12px 56px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <tr>
          <td align="center" style="padding:0 0 26px 0;">
            <a href="${APP_URL}" style="text-decoration:none;">
              <img src="${LOGO_URL}" width="34" height="34" alt="" style="display:inline-block;vertical-align:middle;width:34px;height:34px;" />
              <span style="display:inline-block;vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:-0.2px;color:${C.hi};">blinkbox</span>
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:${C.card};border:1px solid ${C.borderSubtle};border-radius:14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:2px;line-height:2px;font-size:0;background:${C.accent};border-radius:14px 14px 0 0;">&nbsp;</td></tr>
              <tr><td class="bb-pad" style="${PAD};">${body}</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 8px 0 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="font-family:${FONT};font-size:12px;line-height:20px;color:${C.dim};">
                  <a href="${APP_URL}/dashboard" style="color:${C.lo};text-decoration:none;">Dashboard</a>
                  <span style="color:${C.borderSubtle};padding:0 8px;">&#124;</span>
                  <a href="${APP_URL}/docs" style="color:${C.lo};text-decoration:none;">Docs</a>
                  <span style="color:${C.borderSubtle};padding:0 8px;">&#124;</span>
                  <a href="${APP_URL}/dashboard?tab=usage" style="color:${C.lo};text-decoration:none;">Billing</a>
                  <br />
                  <span style="display:inline-block;padding-top:10px;color:${C.dim};">&copy; ${year} ${APP_NAME}. Automation that runs itself.</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Type
 * ------------------------------------------------------------------ */

export const eyebrow = (text, color = C.accent) =>
  `<div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${color};padding-bottom:12px;">${esc(text)}</div>`;

export const heading = (text) =>
  `<h1 class="bb-h1" style="margin:0 0 14px 0;font-family:${FONT};font-size:26px;line-height:34px;font-weight:600;letter-spacing:-0.5px;color:${C.hi};">${esc(text)}</h1>`;

export const para = (html) =>
  `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:25px;color:${C.mid};">${html}</p>`;

export const note = (html) =>
  `<p style="margin:16px 0 0 0;font-family:${FONT};font-size:13px;line-height:21px;color:${C.lo};">${html}</p>`;

export const strong = (text) => `<span style="color:${C.hi};font-weight:600;">${esc(text)}</span>`;

export const mono = (text) =>
  `<span style="font-family:${MONO};font-size:13px;color:${C.hi};">${esc(text)}</span>`;

export const divider = (top = 26, bottom = 26) =>
  `<div style="height:1px;line-height:1px;font-size:0;background:${C.borderSubtle};margin:${top}px 0 ${bottom}px 0;">&nbsp;</div>`;

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

export function btn(href, label, tone = "accent") {
  const bg = tone === "danger" ? C.bad : tone === "quiet" ? C.panel : C.accent;
  const fg = tone === "quiet" ? C.hi : "#08101f";
  const bd = tone === "quiet" ? C.border : bg;
  return `<table role="presentation" class="bb-btn" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 4px 0;">
  <tr><td align="center" style="border-radius:10px;background:${bg};border:1px solid ${bd};">
    <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:-0.1px;color:${fg};text-decoration:none;">${esc(label)}</a>
  </td></tr>
</table>`;
}

export const fallback = (url) =>
  `<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.dim};">Button not working? Paste this into your browser:<br /><span style="font-family:${MONO};font-size:12px;color:${C.lo};word-break:break-all;">${esc(url)}</span></p>`;

/* ------------------------------------------------------------------ *
 * Data surfaces
 * ------------------------------------------------------------------ */

/** Key/value block — security details, plan facts, request metadata. */
export function rows(pairs, { monoValues = false } = {}) {
  const body = pairs
    .filter(Boolean)
    .map(
      ([k, v], i) => `<tr>
    <td style="padding:${i ? "9px" : "0"} 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.lo};white-space:nowrap;">${esc(k)}</td>
    <td align="right" style="padding:${i ? "9px" : "0"} 0 0 0;font-family:${monoValues ? MONO : FONT};font-size:13px;line-height:20px;font-weight:${monoValues ? "400" : "500"};color:${C.hi};">${esc(v)}</td>
  </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border:1px solid ${C.borderSubtle};border-radius:12px;padding:0;">
  <tr><td style="padding:18px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
  </td></tr>
</table>`;
}

/** Up to three side-by-side figures, the dashboard's stat tiles. */
export function stats(items) {
  const cells = items
    .filter(Boolean)
    .map(
      (s) => `<td class="bb-stat" width="${Math.floor(100 / items.length)}%" valign="top" style="padding:0 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border:1px solid ${C.borderSubtle};border-radius:12px;">
      <tr><td style="padding:16px 16px 15px 16px;">
        <div style="font-family:${FONT};font-size:10px;font-weight:600;letter-spacing:1.1px;text-transform:uppercase;color:${C.dim};padding-bottom:8px;">${esc(s.label)}</div>
        <div style="font-family:${MONO};font-size:21px;font-weight:600;line-height:26px;color:${s.tone || C.hi};">${esc(s.value)}</div>
        ${s.sub ? `<div style="font-family:${FONT};font-size:12px;line-height:18px;color:${C.lo};padding-top:5px;">${esc(s.sub)}</div>` : ""}
      </td></tr>
    </table>
  </td>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -6px;"><tr>${cells}</tr></table>`;
}

/**
 * Credit meter. Rendered as two table cells rather than a div with a width,
 * because percentage widths on divs collapse in Outlook.
 */
export function meter(percent, { caption = "", tone } = {}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent || 0)));
  const color = tone || (pct >= 90 ? C.bad : pct >= 75 ? C.warn : C.accent);
  const filled = Math.max(pct, 1);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 0 0;">
  <tr><td style="padding:0 0 8px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.raised};border-radius:6px;">
      <tr>
        <td width="${filled}%" style="height:8px;line-height:8px;font-size:0;background:${color};border-radius:6px;">&nbsp;</td>
        <td width="${100 - filled}%" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td>
      </tr>
    </table>
  </td></tr>
  ${caption ? `<tr><td style="font-family:${FONT};font-size:12px;line-height:18px;color:${C.lo};">${esc(caption)}</td></tr>` : ""}
</table>`;
}

/** Coloured advisory strip — info, success, warning, danger. */
export function callout(tone, title, text) {
  const map = {
    info: [C.accentSoft, C.accentEdge, C.accentHot],
    good: [C.goodSoft, C.goodEdge, C.good],
    warn: [C.warnSoft, C.warnEdge, C.warn],
    bad: [C.badSoft, C.badEdge, C.bad],
  };
  const [bg, bd, fg] = map[tone] || map.info;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:1px solid ${bd};border-radius:12px;">
  <tr><td style="padding:14px 16px;">
    ${title ? `<div style="font-family:${FONT};font-size:13px;font-weight:600;line-height:20px;color:${fg};">${esc(title)}</div>` : ""}
    ${text ? `<div style="font-family:${FONT};font-size:13px;line-height:21px;color:${C.mid};padding-top:${title ? "4px" : "0"};">${text}</div>` : ""}
  </td></tr>
</table>`;
}

/** Line-item receipt with a ruled total. */
export function receipt({ items = [], total, totalLabel = "Total charged" }) {
  const lines = items
    .filter(Boolean)
    .map(
      (it) => `<tr>
    <td style="padding:0 0 10px 0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.mid};">${esc(it.label)}${it.sub ? `<br /><span style="font-size:12px;color:${C.dim};">${esc(it.sub)}</span>` : ""}</td>
    <td align="right" valign="top" style="padding:0 0 10px 0;font-family:${MONO};font-size:14px;line-height:21px;color:${C.hi};white-space:nowrap;">${esc(it.amount)}</td>
  </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border:1px solid ${C.borderSubtle};border-radius:12px;">
  <tr><td style="padding:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${lines}
      <tr><td colspan="2" style="padding:4px 0 14px 0;"><div style="height:1px;line-height:1px;font-size:0;background:${C.borderSubtle};">&nbsp;</div></td></tr>
      <tr>
        <td style="font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:0.2px;color:${C.lo};text-transform:uppercase;">${esc(totalLabel)}</td>
        <td align="right" style="font-family:${MONO};font-size:19px;font-weight:600;color:${C.hi};white-space:nowrap;">${esc(total)}</td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

/** Bulleted capability list used by onboarding and plan-change mail. */
export function features(list) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${list
    .filter(Boolean)
    .map(
      ([title, desc], i) => `<tr>
    <td width="18" valign="top" style="padding:${i ? "14px" : "0"} 0 0 0;font-family:${FONT};font-size:15px;line-height:23px;color:${C.accent};">&#8226;</td>
    <td valign="top" style="padding:${i ? "14px" : "0"} 0 0 0;font-family:${FONT};font-size:14px;line-height:23px;color:${C.mid};"><span style="color:${C.hi};font-weight:600;">${esc(title)}</span> &mdash; ${esc(desc)}</td>
  </tr>`,
    )
    .join("")}</table>`;
}

/** Big centred code for verification and 2FA. */
export const codeBlock = (code) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border:1px solid ${C.border};border-radius:12px;">
  <tr><td align="center" style="padding:22px;font-family:${MONO};font-size:30px;font-weight:600;letter-spacing:9px;color:${C.hi};">${esc(code)}</td></tr>
</table>`;

/**
 * Plain-text alternative. Spam filters mark HTML-only mail down, and every
 * template gets one for free by walking the markup it already built.
 */
export function toText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const clean = label.replace(/<[^>]+>/g, "").trim();
      return clean && !clean.startsWith("http") ? `${clean} (${href})` : href;
    })
    .replace(/<(?:br|\/p|\/div|\/tr|\/h1|\/td)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&zwnj;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, "(c)")
    .replace(/&mdash;/g, "-")
    .replace(/&#8226;/g, "-")
    .replace(/&#124;/g, "|")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
