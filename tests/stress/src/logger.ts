const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const paint = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

export const c = {
  dim: (s: string) => paint("2", s),
  bold: (s: string) => paint("1", s),
  red: (s: string) => paint("31", s),
  green: (s: string) => paint("32", s),
  yellow: (s: string) => paint("33", s),
  blue: (s: string) => paint("34", s),
  magenta: (s: string) => paint("35", s),
  cyan: (s: string) => paint("36", s),
  white: (s: string) => paint("37", s),
};

let quiet = false;
export const setQuiet = (v: boolean) => {
  quiet = v;
};

const stamp = () => c.dim(new Date().toISOString().slice(11, 23));

export const log = {
  info: (msg: string) => !quiet && console.log(`${stamp()} ${msg}`),
  step: (msg: string) => !quiet && console.log(`${stamp()} ${c.cyan("▸")} ${msg}`),
  ok: (msg: string) => !quiet && console.log(`${stamp()} ${c.green("✔")} ${msg}`),
  warn: (msg: string) => !quiet && console.log(`${stamp()} ${c.yellow("▲")} ${msg}`),
  fail: (msg: string) => console.log(`${stamp()} ${c.red("✖")} ${msg}`),
  section: (title: string) => {
    if (quiet) return;
    const bar = "─".repeat(Math.max(4, 62 - title.length));
    console.log(`\n${c.bold(c.magenta(`── ${title} `))}${c.dim(bar)}`);
  },
  raw: (msg: string) => !quiet && console.log(msg),
};

export const verdictColor = (v: string) =>
  v === "PASS" ? c.green(v) : v === "FAIL" ? c.red(v) : v === "WARN" ? c.yellow(v) : c.dim(v);

export const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

export const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n.toFixed(1)}ms`);

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
