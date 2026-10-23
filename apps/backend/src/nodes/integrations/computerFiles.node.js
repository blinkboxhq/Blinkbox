import {
  NODE_TIMEOUT_MS,
  assertComputerAccess,
  callComputer,
  computerError,
  toBool,
  toText,
} from "./computer.client.js";

const OPERATIONS = new Set(["read", "write", "append", "list", "delete"]);
const ACTION_LABELS = {
  "read file": "read",
  "write file": "write",
  "append to file": "append",
  "list files": "list",
  "delete file": "delete",
};

function resolveOperation(config) {
  const operation = toText(config.operation).trim().toLowerCase();
  if (operation) {
    if (OPERATIONS.has(operation)) return operation;
    throw computerError(`Unknown file operation "${operation}"`, "config", "Use read, write, append, list or delete.");
  }
  const action = toText(config.selectedAction).trim().toLowerCase();
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return OPERATIONS.has(action) ? action : "read";
}

export default {
  timeoutMs: NODE_TIMEOUT_MS,

  async run(config = {}, input = {}, context = {}) {
    await assertComputerAccess(context);
    const operation = resolveOperation(config);
    const path = toText(config.path).trim();
    if (!path && operation !== "list") {
      throw computerError("Path is required", "config", "Paths are relative to /workspace, e.g. reports/today.txt");
    }
    const encoding = toText(config.encoding).trim().toLowerCase() || "utf8";
    const recursive = toBool(config.recursive, false);

    if (operation === "read") {
      const res = await callComputer("POST", "/files/read", { path, encoding });
      return {
        success: true,
        operation,
        path: res.path,
        content: res.content,
        encoding: res.encoding,
        sizeBytes: res.sizeBytes,
        truncated: res.truncated === true,
      };
    }

    if (operation === "write" || operation === "append") {
      const res = await callComputer("POST", "/files/write", {
        path,
        content: toText(config.content),
        encoding,
        append: operation === "append",
      });
      return { success: true, operation, path: res.path, bytesWritten: res.bytesWritten };
    }

    if (operation === "list") {
      const res = await callComputer("POST", "/files/list", { path: path || ".", recursive });
      const entries = Array.isArray(res.entries) ? res.entries : [];
      return { success: true, operation, path: res.path, entries, count: entries.length, truncated: res.truncated === true };
    }

    const res = await callComputer("POST", "/files/delete", { path, recursive });
    return { success: true, operation, path: res.path, deleted: res.deleted === true };
  },
};
