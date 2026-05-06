import dns from "dns/promises";
import net from "net";
import tls from "tls";
import axios from "axios";

// ── dns ───────────────────────────────────────────────────────────────────────
export const dns_lookup = {
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

// ── ssl ───────────────────────────────────────────────────────────────────────
export const ssl = {
  async run(config, input) {
    const hostname = config.hostname || input?.hostname || input?.domain;
    const port = parseInt(config.port || 443);
    if (!hostname) return { success: false, error: "ssl: 'hostname' is required.", skipped: true };

    return new Promise((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port, servername: hostname, timeout: 10000 }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        if (!cert || !cert.subject) return reject(new Error("ssl: could not retrieve certificate."));

        const now = Date.now();
        const expiry = new Date(cert.valid_to);
        const daysLeft = Math.floor((expiry - now) / 86400000);

        resolve({
          hostname, port,
          valid: socket.authorized,
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry: daysLeft,
          expired: daysLeft < 0,
          expiringSoon: daysLeft < 30,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint,
        });
      });
      socket.on("error", (err) => reject(new Error(`ssl: ${err.message}`)));
      socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("ssl: connection timed out.")); });
    });
  },
};

// ── http_monitor ──────────────────────────────────────────────────────────────
export const http_monitor = {
  async run(config, input) {
    const url = config.url || input?.url;
    if (!url) return { success: false, error: "http_monitor: 'url' is required.", skipped: true };

    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout: parseInt(config.timeout || 10000), maxRedirects: 5, validateStatus: () => true });
      const latency = Date.now() - start;
      const expectedStatus = parseInt(config.expectedStatus || 200);
      const isUp = res.status === expectedStatus;
      return {
        url, isUp, status: res.status, statusText: res.statusText,
        latencyMs: latency, expectedStatus,
        contentType: res.headers["content-type"] || null,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return { url, isUp: false, error: err.message, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  },
};

// ── port_monitor ──────────────────────────────────────────────────────────────
export const port_monitor = {
  async run(config, input) {
    const host = config.host || input?.host || "localhost";
    const port = parseInt(config.port || input?.port || 80);
    const timeout = parseInt(config.timeout || 5000);

    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on("connect", () => {
        socket.destroy();
        resolve({ host, port, isOpen: true, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() });
      });
      socket.on("timeout", () => { socket.destroy(); resolve({ host, port, isOpen: false, error: "timeout", checkedAt: new Date().toISOString() }); });
      socket.on("error", (err) => resolve({ host, port, isOpen: false, error: err.message, checkedAt: new Date().toISOString() }));
      socket.connect(port, host);
    });
  },
};

// ── ip_lookup ─────────────────────────────────────────────────────────────────
export const ip_lookup = {
  async run(config, input) {
    const ip = config.ip || input?.ip || input?.ipAddress;
    if (!ip) return { success: false, error: "ip_lookup: 'ip' is required.", skipped: true };

    try {
      const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 10000 });
      const d = res.data;
      if (d.error) throw new Error(d.reason || "Invalid IP");
      return {
        ip: d.ip, city: d.city, region: d.region, country: d.country_name,
        countryCode: d.country_code, continent: d.continent_code,
        latitude: d.latitude, longitude: d.longitude,
        timezone: d.timezone, isp: d.org,
        currency: d.currency, callingCode: d.country_calling_code,
      };
    } catch (err) {
      throw new Error(`ip_lookup: ${err.message}`);
    }
  },
};

// ── ip_whitelist ──────────────────────────────────────────────────────────────
export const ip_whitelist = {
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
