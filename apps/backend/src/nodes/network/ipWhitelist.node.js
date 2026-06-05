export default {
  async run(config, input) {
    const ip = config.ip || input?.ip || input?.ipAddress;
    const whitelist = (config.whitelist || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ip) return { success: false, error: "ip_whitelist: 'ip' is required.", skipped: true };

    const ipToNum = (s) => s.split(".").reduce((acc, o) => (acc << 8) + parseInt(o), 0) >>> 0;
    let allowed = false;

    for (const entry of whitelist) {
      if (entry.includes("/")) {
        const [net2, bits] = entry.split("/");
        const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0;
        if ((ipToNum(ip) & mask) === (ipToNum(net2) & mask)) { allowed = true; break; }
      } else if (entry === ip) { allowed = true; break; }
    }

    return { ip, allowed, whitelist, checkedAt: new Date().toISOString() };
  },
};
