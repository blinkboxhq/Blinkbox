// Recursive-descent evaluator. Deliberately not Function()/eval: the expression
// is user data and the old character-allowlist let identifiers through.

const FUNCS = {
  abs: Math.abs, round: (n, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f; },
  floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt, pow: Math.pow,
  min: Math.min, max: Math.max, log: Math.log, exp: Math.exp,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, random: Math.random,
};
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const tokens = [];
  const re = /\s*([A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|\*\*|[+\-*/%^(),])/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error(`unexpected character at position ${i}`);
    tokens.push(m[1]);
    i = re.lastIndex;
  }
  return tokens;
}

function evaluate(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (t) => { if (tokens[pos] !== t) throw new Error(`expected "${t}"`); pos++; };

  function parseExpr() {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseUnary();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = tokens[pos++];
      const right = parseUnary();
      if ((op === "/" || op === "%") && right === 0) throw new Error("division by zero");
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  }
  function parseUnary() {
    if (peek() === "-") { pos++; return -parseUnary(); }
    if (peek() === "+") { pos++; return parseUnary(); }
    return parsePower();
  }
  function parsePower() {
    const base = parseAtom();
    if (peek() === "^" || peek() === "**") { pos++; return base ** parseUnary(); }
    return base;
  }
  function parseAtom() {
    const t = peek();
    if (t === undefined) throw new Error("unexpected end of expression");
    if (t === "(") { pos++; const v = parseExpr(); eat(")"); return v; }
    if (/^\d/.test(t)) { pos++; return parseFloat(t); }
    if (/^[A-Za-z_]/.test(t)) {
      pos++;
      const name = t.toLowerCase();
      if (peek() === "(") {
        pos++;
        const args = [];
        if (peek() !== ")") {
          args.push(parseExpr());
          while (peek() === ",") { pos++; args.push(parseExpr()); }
        }
        eat(")");
        const fn = FUNCS[name];
        if (!fn) throw new Error(`unknown function "${t}"`);
        return fn(...args);
      }
      if (name in CONSTS) return CONSTS[name];
      throw new Error(`unknown name "${t}" — pass values in with {{ }} variables`);
    }
    throw new Error(`unexpected token "${t}"`);
  }

  const value = parseExpr();
  if (pos !== tokens.length) throw new Error(`unexpected token "${tokens[pos]}"`);
  return value;
}

export default {
  async run(config, input) {
    const expression = config.expression ?? input?.expression;
    if (!expression) return { success: false, error: "math_expression: 'expression' is required.", skipped: true };

    let result;
    try {
      result = evaluate(tokenize(String(expression)));
    } catch (e) {
      throw new Error(`math_expression: ${e.message}`);
    }
    if (!Number.isFinite(result)) throw new Error(`math_expression: result is not a finite number.`);

    const precision = Number(config.precision ?? -1);
    if (precision >= 0) {
      const f = 10 ** precision;
      result = Math.round(result * f) / f;
    }

    return { [config.outputField || "result"]: result, expression: String(expression) };
  },
};
