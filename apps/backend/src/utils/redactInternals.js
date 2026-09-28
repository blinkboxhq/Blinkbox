export const SAFE_INTERNAL_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

const DB_ERROR_PATTERNS = [
  /mongodb(\+srv)?:\/\//i,
  /\.mongodb\.net\b/i,
  /:27017\b/,
  /\bMongo[A-Za-z]*Error\b/,
  /\bMongoose[A-Za-z]*Error\b/,
  /over your space quota/i,
  /buffering timed out/i,
  /server selection timed out/i,
  /\bE11000\b/,
  /\bReplicaSetNoPrimary\b/,
  /topology (?:was )?(?:destroyed|closed)/i,
];

function platformMarkers() {
  const markers = new Set();
  const uri = process.env.MONGO_URI || "";
  const hostPart = uri.replace(/^mongodb(\+srv)?:\/\//i, "").split("/")[0].split("@").pop() || "";
  for (const raw of hostPart.split(",")) {
    const host = raw.split(":")[0].trim().toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1" || host === "mongo") continue;
    markers.add(host);
    const labels = host.split(".");
    if (host.endsWith(".mongodb.net") && labels.length >= 4) markers.add(labels.slice(-3).join("."));
  }
  const atlasHost = (process.env.ATLAS_CLUSTER_HOST || "").trim().toLowerCase();
  if (atlasHost) markers.add(atlasHost);
  return [...markers];
}

let cachedMarkers = null;
function markers() {
  if (!cachedMarkers) cachedMarkers = platformMarkers();
  return cachedMarkers;
}

// strict = error path, where any DB-driver wording is internal. Non-strict only
// catches our own cluster hosts so legit success payloads are never rewritten.
export function containsInternals(text, strict = true) {
  if (typeof text !== "string" || !text) return false;
  const lower = text.toLowerCase();
  if (markers().some((m) => lower.includes(m))) return true;
  return strict && DB_ERROR_PATTERNS.some((re) => re.test(text));
}

export function scrubInternals(value, strict = true, depth = 0) {
  if (depth > 40) return value;
  if (typeof value === "string") return containsInternals(value, strict) ? SAFE_INTERNAL_MESSAGE : value;
  if (Array.isArray(value)) return value.map((v) => scrubInternals(v, strict, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "stack" && strict) continue;
      out[k] = scrubInternals(v, strict, depth + 1);
    }
    return out;
  }
  return value;
}

export function safeErrorMessage(err, fallback = SAFE_INTERNAL_MESSAGE) {
  const msg = err?.message || (typeof err === "string" ? err : "");
  if (!msg) return fallback;
  return containsInternals(msg, true) ? SAFE_INTERNAL_MESSAGE : msg;
}

export function isDbInternalError(err) {
  if (!err) return false;
  if (/^Mongo/.test(err.name || "")) return true;
  return containsInternals(err.message || "", true);
}

// Stringifies once: clean bodies go straight to res.send, so the scan costs no
// extra serialization on the hot path.
export function scrubResponses(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    let str;
    try {
      str = JSON.stringify(body);
    } catch {
      return originalJson(body);
    }
    if (str === undefined) return originalJson(body);
    const strict = res.statusCode >= 400 || body?.success === false;
    if (!containsInternals(str, strict)) {
      if (!res.get("Content-Type")) res.set("Content-Type", "application/json");
      return res.send(str);
    }
    console.error(`[redact] scrubbed internals from ${req.method} ${req.originalUrl} (${res.statusCode})`);
    return originalJson(scrubInternals(JSON.parse(str), strict));
  };
  next();
}
