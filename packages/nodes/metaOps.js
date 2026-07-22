// Reads the `operation` field's options straight out of a node's meta, so the
// sidebar picker and the config panel are always driven by the same list.
export const opsFromMeta = (meta) =>
  meta?.fields?.find((f) => f.name === "operation")?.options ?? [];
