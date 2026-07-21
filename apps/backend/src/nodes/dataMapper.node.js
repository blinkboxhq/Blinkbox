/**
 * DATA MAPPER NODE — The Swiss Army Knife
 *
 * Consolidates set_fields, transform, and filter into a single powerful node.
 * Users configure it via toggles/dropdowns in the UI — no JSON editing.
 *
 * Config:
 *   mode — "set" | "rename" | "filter" | "remove" | "pick"
 *
 *   MODE: "set" (was set_fields)
 *     fields: [{ key: "status", value: "active" }, ...]
 *     Overwrites or adds fields to the input object.
 *
 *   MODE: "rename" (was transform)
 *     mappings: [{ from: "firstName", to: "name" }, ...]
 *     Renames keys. Original keys are dropped.
 *
 *   MODE: "filter" (was filter node)
 *     arrayPath: "items" (dot-path to the array inside $json)
 *     field: "status"
 *     operator: "equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "gt" | "lt"
 *     value: "active"
 *     Filters an array field in-place.
 *
 *   MODE: "remove"
 *     keys: ["tempField", "debug", "__internal"]
 *     Removes specified keys from the object.
 *
 *   MODE: "pick"
 *     keys: ["name", "email", "phone"]
 *     Keeps ONLY the specified keys, drops everything else.
 */

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export default {
  async run(config, input) {
    const mode = config.operation || config.mode || "set";

    switch (mode) {
      case "set":
        return handleSet(config, input);
      case "rename":
        return handleRename(config, input);
      case "filter":
        return handleFilter(config, input);
      case "remove":
        return handleRemove(config, input);
      case "pick":
        return handlePick(config, input);
      default:
        throw new Error(`Data Mapper: Unknown mode "${mode}". Use set, rename, filter, remove, or pick.`);
    }
  },
};

function handleSet(config, input) {
  const output = { ...input };
  const fields = config.fields || [];

  for (const field of fields) {
    if (field.key && typeof field.key === "string" && !FORBIDDEN_KEYS.has(field.key)) {
      output[field.key] = field.value;
    }
  }

  return output;
}

function handleRename(config, input) {
  const mappings = config.mappings || [];
  if (mappings.length === 0) return input;

  const output = { ...input };
  for (const { from, to } of mappings) {
    if (!from || !to) continue;
    if (FORBIDDEN_KEYS.has(to)) continue;
    if (from in output) {
      output[to] = output[from];
      delete output[from];
    }
  }

  return output;
}

function handleFilter(config, input) {
  const {
    arrayPath = "",
    field = "content",
    operator = "contains",
    value = "",
  } = config;

  // Resolve the array to filter
  let arr;
  if (arrayPath) {
    arr = arrayPath.split(".").reduce((obj, key) => obj?.[key], input);
  } else {
    arr = input.findings || input.items || input.data;
  }

  if (!Array.isArray(arr)) {
    throw new Error(`Data Mapper (filter): "${arrayPath || "auto-detect"}" is not an array.`);
  }

  if (!value && value !== 0) return input;

  const filtered = arr.filter((item) => {
    const fieldValue = typeof item === "object" && item !== null ? item[field] : item;
    if (fieldValue == null) return false;

    const valStr = String(fieldValue).toLowerCase();
    const compStr = String(value).toLowerCase();

    switch (operator) {
      case "contains":      return valStr.includes(compStr);
      case "not_contains":  return !valStr.includes(compStr);
      case "equals":        return valStr === compStr;
      case "starts_with":   return valStr.startsWith(compStr);
      case "ends_with":     return valStr.endsWith(compStr);
      case "gt":            return Number(fieldValue) > Number(value);
      case "lt":            return Number(fieldValue) < Number(value);
      default:              return true;
    }
  });

  // Write back to the original path
  if (arrayPath) {
    const parts = arrayPath.split(".");
    const output = { ...input };
    let target = output;
    for (let i = 0; i < parts.length - 1; i++) {
      target[parts[i]] = { ...target[parts[i]] };
      target = target[parts[i]];
    }
    target[parts.at(-1)] = filtered;
    return output;
  }

  // Auto-detect path: write back to wherever we found the array
  if (input.findings) return { ...input, findings: filtered };
  if (input.items) return { ...input, items: filtered };
  if (input.data) return { ...input, data: filtered };
  return { ...input, filtered };
}

function handleRemove(config, input) {
  const keys = config.keys || [];
  const output = { ...input };
  for (const key of keys) {
    delete output[key];
  }
  return output;
}

function handlePick(config, input) {
  const keys = config.keys || [];
  const output = {};
  for (const key of keys) {
    if (key in input) {
      output[key] = input[key];
    }
  }
  return output;
}
