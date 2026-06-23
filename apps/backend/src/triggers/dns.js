import dns from "dns/promises";

export default {
  async run(config, input) {
    if (input?.hostname && input?.records) return input;
    const hostname = (config.hostname || config.domain || config.host || "").replace(/^https?:\/\//, "").split("/")[0];
    if (!hostname) throw new Error("[dns_trigger] hostname is required");
    const recordTypes = config.recordTypes || ["A", "MX", "NS", "TXT"];
    const results = {};
    const errors = {};
    await Promise.all(
      recordTypes.map(async type => {
        try {
          switch (type) {
            case "A":     results.A = await dns.resolve4(hostname); break;
            case "AAAA":  results.AAAA = await dns.resolve6(hostname); break;
            case "MX":    results.MX = (await dns.resolveMx(hostname)).map(r => ({ exchange: r.exchange, priority: r.priority })); break;
            case "NS":    results.NS = await dns.resolveNs(hostname); break;
            case "TXT":   results.TXT = (await dns.resolveTxt(hostname)).map(r => r.join("")); break;
            case "CNAME": results.CNAME = await dns.resolveCname(hostname); break;
            case "SOA":   results.SOA = await dns.resolveSoa(hostname); break;
            case "SRV":   results.SRV = await dns.resolveSrv(hostname); break;
            case "CAA":   results.CAA = await dns.resolveCaa(hostname); break;
            case "PTR":   results.PTR = await dns.resolvePtr(hostname); break;
          }
        } catch (e) { errors[type] = e.code || e.message; }
      })
    );
    const lookup = await dns.lookup(hostname).catch(() => null);
    const hasSPF = results.TXT?.some(t => t.startsWith("v=spf1")) ?? false;
    const hasDMARC = results.TXT?.some(t => t.startsWith("v=DMARC1")) ?? false;
    const hasDKIM = results.TXT?.some(t => t.includes("DKIM")) ?? false;
    return {
      hostname, resolvedIp: lookup?.address, ipFamily: lookup?.family ? `IPv${lookup.family}` : null,
      records: results, errors,
      hasErrors: Object.keys(errors).length > 0,
      aRecords: results.A ?? [], mxRecords: results.MX ?? [], nsRecords: results.NS ?? [],
      txtRecords: results.TXT ?? [], cnameRecords: results.CNAME ?? [],
      hasSPF, hasDMARC, hasDKIM,
      spfRecord: results.TXT?.find(t => t.startsWith("v=spf1")) ?? null,
      checkedAt: new Date().toISOString(),
    };
  },
};
