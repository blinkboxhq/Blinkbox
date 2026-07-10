const getByPath = (obj, path) =>
  String(path)
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const coerceObject = (val, label) => {
  if (val && typeof val === "object") return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); }
    catch { throw new Error(`${label}: source is a string but not valid JSON`); }
  }
  throw new Error(`${label}: expected an object or JSON string, got ${typeof val}`);
};

export default {
  async run(config, input) {
    const label = "JSON Transform";
    const op = config.operation || "extract";
    const source = config.source !== undefined && config.source !== ""
      ? config.source
      : input;
    const field = config.outputField || "result";
    const wrap = (result) => ({ [field]: result });

    try {
      switch (op) {
        case "parse": {
          if (typeof source !== "string") {
            return wrap(source && typeof source === "object" ? source : { _raw: source });
          }
          return wrap(JSON.parse(source));
        }

        case "stringify":
          return wrap(JSON.stringify(source, null, config.pretty === false ? 0 : 2));

        case "extract": {
          const obj = coerceObject(source, label);
          const found = config.path ? getByPath(obj, config.path) : obj;
          const fallback = config.fallback !== undefined && config.fallback !== "" ? config.fallback : null;
          return wrap(found === undefined ? fallback : found);
        }

        case "keys": {
          const obj = coerceObject(source, label);
          return wrap(Array.isArray(obj) ? obj.map((_, i) => i) : Object.keys(obj));
        }

        case "values": {
          const obj = coerceObject(source, label);
          return wrap(Array.isArray(obj) ? obj : Object.values(obj));
        }

        default:
          return { success: false, error: `${label}: unknown operation "${op}"`, skipped: true };
      }
    } catch (err) {
      return { success: false, error: `${label}: ${err.message}`, skipped: true };
    }
  },
};
