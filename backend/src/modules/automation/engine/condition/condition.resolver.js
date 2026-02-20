export function resolveValue(template, context) {
  if (typeof template !== "string") return template;

  const match = template.match(/^\{\{(.+?)\}\}$/);
  if (!match) return template;

  const path = match[1].trim().split(".");
  let current = context;

  for (const key of path) {
    if (current == null) return undefined;
    current = current[key];
  }

  return current;
}
