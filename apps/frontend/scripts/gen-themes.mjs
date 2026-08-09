import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import colors from 'tailwindcss/colors.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = resolve(HERE, '..');

const FAMILIES = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green',
  'emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const NEUTRALS = ['slate','gray','zinc','neutral','stone'];
const ACCENT_FAMILY = 'blue';

/* ── OKLab / OKLCH ────────────────────────────────────────────────────────── */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

function rgbToOklch([r, g, b]) {
  const R = srgbToLinear(r / 255), G = srgbToLinear(g / 255), B = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180) / Math.PI };
}

function oklchToLinear({ L, C, H }) {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/* Reduce chroma until the colour fits sRGB — keeps L and H exact. */
function oklchToRgb(c) {
  let lo = 0, hi = c.C;
  if (!inGamut(oklchToLinear(c))) {
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...c, C: mid }))) lo = mid; else hi = mid;
    }
  } else lo = c.C;
  return oklchToLinear({ ...c, C: lo }).map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255));
}

/* Chroma tapers only at the very ends so near-white text and near-black voids stay neutral. */
const taper = (L) => 1 - (2 * L - 1) ** 4;

const tintNeutral = (hex, hue, chroma) => {
  if (!chroma) return hexToRgb(hex);
  const { L } = rgbToOklch(hexToRgb(hex));
  return oklchToRgb({ L, C: chroma * taper(L), H: hue });
};

const rotate = (hex, hue) => {
  if (hue == null) return hexToRgb(hex);
  const { L, C } = rgbToOklch(hexToRgb(hex));
  return oklchToRgb({ L, C, H: hue });
};

const triplet = (rgb) => rgb.join(' ');
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/* ── Presets ──────────────────────────────────────────────────────────────── */
const PRESETS = [
  { id: 'graphite', label: 'Graphite', blurb: 'The original neutral dark.', hue: 0,   chroma: 0,     accentHue: null },
  { id: 'midnight', label: 'Midnight', blurb: 'Cool blue-black, deep focus.', hue: 265, chroma: 0.026, accentHue: 264 },
  { id: 'ember',    label: 'Ember',    blurb: 'Warm charcoal with amber heat.', hue: 55, chroma: 0.024, accentHue: 58 },
  { id: 'abyss',    label: 'Abyss',    blurb: 'Deep sea slate and teal.', hue: 196, chroma: 0.024, accentHue: 192 },
  { id: 'orchid',   label: 'Orchid',   blurb: 'Plum shadows, violet light.', hue: 322, chroma: 0.024, accentHue: 303 },
];

/* Base values of the semantic layer — Graphite is these verbatim. */
const BB_GREY = {
  'surface-0': '#0f0f0f', 'surface-1': '#1b1b1b', 'surface-2': '#262626', 'surface-3': '#303030',
  'border-subtle': '#2b2b2b', 'border': '#3b3b3b', 'border-strong': '#545454',
  'text-hi': '#fafafa', 'text-mid': '#b6b6b6', 'text-lo': '#8c8c8c', 'text-dim': '#6d6d6d',
  'body-bg': '#0c0c0c', 'body-fg': '#e5e5e5',
  'rf-minimap-bg': '#0a0a0a', 'rf-minimap-border': '#1a1a1a',
};
const BB_ACCENT = '#6f97e8';
const BB_ACCENT_HOT = '#a9c0ef';

const steps = (f) => Object.keys(colors[f]).filter((k) => /^\d+$/.test(k));

function paletteBlock(p, families) {
  return families.flatMap((f) => steps(f).map((s) => {
    const hex = colors[f][s];
    const rgb = f === ACCENT_FAMILY ? rotate(hex, p.accentHue) : tintNeutral(hex, p.hue, p.chroma);
    return `  --c-${f}-${s}: ${triplet(rgb)};`;
  })).join('\n');
}

function semanticBlock(p) {
  const grey = Object.entries(BB_GREY)
    .map(([k, hex]) => `  --bb-${k}: ${toHex(tintNeutral(hex, p.hue, p.chroma))};`).join('\n');
  const a = rotate(BB_ACCENT, p.accentHue);
  const hot = rotate(BB_ACCENT_HOT, p.accentHue);
  /* The loader paints before React mounts; lift it off pure black so the theme reads instantly. */
  const loader = p.chroma ? toHex(oklchToRgb({ L: 0.09, C: 0.02, H: p.hue })) : '#000000';
  return [
    grey,
    `  --bb-loader-bg: ${loader};`,
    `  --bb-accent: ${toHex(a)};`,
    `  --bb-accent-hot: ${toHex(hot)};`,
    `  --bb-accent-soft: rgb(${triplet(a)} / 0.14);`,
    `  --bb-accent-ring: rgb(${triplet(a)} / 0.40);`,
  ].join('\n');
}

const [base, ...rest] = PRESETS;

const css = `/* GENERATED by scripts/gen-themes.mjs — do not edit by hand. Run: npm run gen:themes */
/* Every Tailwind palette colour resolves through these channel triplets, so a theme
   swap is a variable swap: no rebuild, no duplicated utility classes. */

:root {
${paletteBlock(base, FAMILIES)}

${semanticBlock(base)}
}

${rest.map((p) => `/* ${p.label} — ${p.blurb} */
:root[data-bb-theme="${p.id}"] {
${paletteBlock(p, [...NEUTRALS, ACCENT_FAMILY])}

${semanticBlock(p)}
}`).join('\n\n')}
`;

writeFileSync(resolve(FE, 'src/themes.css'), css);

const swatch = (p) => {
  const pick = (hex) => toHex(tintNeutral(hex, p.hue, p.chroma));
  return [pick(BB_GREY['body-bg']), pick(BB_GREY['surface-2']), toHex(rotate(BB_ACCENT, p.accentHue))];
};

writeFileSync(resolve(FE, 'src/theme/presets.js'), `/* GENERATED by scripts/gen-themes.mjs — do not edit by hand. */
export const THEME_STORAGE_KEY = 'bb-theme';

export const THEMES = ${JSON.stringify(
  PRESETS.map((p, i) => ({ id: p.id, label: p.label, blurb: p.blurb, isDefault: i === 0, swatch: swatch(p) })),
  null, 2,
).replace(/"([a-zA-Z]+)":/g, '$1:').replace(/"/g, "'")};

export const DEFAULT_THEME = '${base.id}';
`);

console.log(`themes.css  ${css.split('\n').length} lines, ${PRESETS.length} presets`);
