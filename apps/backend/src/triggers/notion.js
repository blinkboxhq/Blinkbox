export default {
  async run(config, input) {
    const b = input?.body ?? input;

    // ── Notion webhook payload ─────────────────────────────────────────────────
    const entity    = b.entity   ?? {};
    const eventType = b.type     ?? b.event ?? "";
    const data      = b.data     ?? {};

    const [objectType, action] = eventType.split(".");

    const page       = data.page       ?? entity.data?.page       ?? {};
    const database   = data.database   ?? entity.data?.database   ?? {};
    const properties = page.properties ?? database.properties     ?? {};

    const flatProps = {};
    for (const [key, val] of Object.entries(properties)) {
      flatProps[key] = extractNotionPropertyValue(val);
    }

    const workspaceId = b.workspace_id ?? b.workspaceId ?? entity.workspace_id ?? "";

    return {
      eventType,
      objectType,
      action,
      id:           entity.id   ?? page.id   ?? database.id   ?? "",
      parentId:     page.parent?.page_id     ?? page.parent?.database_id ?? "",
      workspaceId,
      pageTitle:    extractNotionTitle(properties),
      properties:   flatProps,
      createdBy:    b.authors?.[0]?.id ?? b.actor?.id ?? "",
      createdTime:  page.created_time  ?? database.created_time ?? null,
      lastEditedTime: page.last_edited_time ?? database.last_edited_time ?? null,
      url:          page.url           ?? database.url          ?? "",
      archived:     page.archived      ?? false,
      page,
      database,
      raw: b,
    };
  },
};

function extractNotionPropertyValue(prop) {
  if (!prop?.type) return prop;
  switch (prop.type) {
    case "title":        return (prop.title ?? []).map((t) => t.plain_text).join("");
    case "rich_text":    return (prop.rich_text ?? []).map((t) => t.plain_text).join("");
    case "number":       return prop.number;
    case "select":       return prop.select?.name ?? null;
    case "multi_select": return (prop.multi_select ?? []).map((s) => s.name);
    case "date":         return prop.date?.start ?? null;
    case "checkbox":     return prop.checkbox;
    case "url":          return prop.url;
    case "email":        return prop.email;
    case "phone_number": return prop.phone_number;
    case "people":       return (prop.people ?? []).map((p) => p.name ?? p.id);
    case "status":       return prop.status?.name ?? null;
    case "relation":     return (prop.relation ?? []).map((r) => r.id);
    case "formula":      return prop.formula?.[prop.formula?.type] ?? null;
    default:             return prop[prop.type] ?? null;
  }
}

function extractNotionTitle(properties) {
  for (const val of Object.values(properties)) {
    if (val?.type === "title") {
      return (val.title ?? []).map((t) => t.plain_text).join("");
    }
  }
  return "";
}
