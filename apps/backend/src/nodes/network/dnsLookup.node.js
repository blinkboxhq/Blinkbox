import dns from "dns/promises";

export default {
  async run(config, input) {
    const hostname = config.hostname || input?.hostname || input?.domain;
    const type = (config.type || "A").toUpperCase();
    if (!hostname) return { success: false, error: "dns: 'hostname' is required.", skipped: true };

    try {
      const methods = {
        A: () => dns.resolve4(hostname),
        AAAA: () => dns.resolve6(hostname),
        MX: () => dns.resolveMx(hostname),
        TXT: () => dns.resolveTxt(hostname),
        NS: () => dns.resolveNs(hostname),
        CNAME: () => dns.resolveCname(hostname),
        SOA: () => dns.resolveSoa(hostname),
      };
      const fn = methods[type];
      if (!fn) throw new Error(`dns: unsupported record type "${type}". Use: A, AAAA, MX, TXT, NS, CNAME, SOA`);
      const records = await fn();
      return { hostname, type, records, count: Array.isArray(records) ? records.length : 1 };
    } catch (err) {
      if (err.code === "ENOTFOUND" || err.code === "ENODATA") return { hostname, type, records: [], found: false, error: err.message };
      throw new Error(`dns: ${err.message}`);
    }
  },
};
