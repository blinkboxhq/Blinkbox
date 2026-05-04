export default {
  async run(config, input) {
    const raw = config.field
      ? (String(config.field).startsWith("{{") ? input[config.field.replace(/[{}]/g,"").trim()] : config.field)
      : (input.url || input.href || input.link || "");

    if (!raw) return { success: false, error: "URL Parser: no URL found in input or 'field' config.", skipped: true };

    let parsed;
    try { parsed = new URL(raw); } catch { return { success: false, error: `URL Parser: invalid URL "${raw}"`, skipped: true }; }

    const all = {
      href: parsed.href,
      protocol: parsed.protocol.replace(":",""),
      hostname: parsed.hostname,
      port: parsed.port || null,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      origin: parsed.origin,
      params: Object.fromEntries(parsed.searchParams.entries()),
    };

    const extract = config.extract || "all";
    const out = extract === "all" ? all : { [extract]: all[extract] ?? null };
    return { ...(config.outputField ? { [config.outputField]: out } : out), _url: raw };
  },
};
