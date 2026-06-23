import https from "https";
import tls from "tls";

export default {
  async run(config, input) {
    if (input?.subject && input?.validTo) return input;
    const hostname = (config.hostname || config.host || config.url || "").replace(/^https?:\/\//, "").split("/")[0];
    if (!hostname) throw new Error("[ssl_trigger] hostname is required");
    const port = parseInt(config.port || 443);
    return new Promise((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: Math.min(config.timeout || 10000, 30000) }, () => {
        const cert = socket.getPeerCertificate(true);
        socket.destroy();
        if (!cert || !cert.subject) return reject(new Error("[ssl_trigger] No certificate returned"));
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.floor((validTo - now) / 86400000);
        const isExpired = now > validTo;
        const isValid = !isExpired && now >= validFrom;
        const alertDays = config.alertDays || 30;
        resolve({
          hostname, port, isValid, isExpired,
          daysRemaining, expiresWithinAlertDays: daysRemaining <= alertDays,
          subject: cert.subject?.CN || cert.subject,
          issuer: cert.issuer?.O || cert.issuer?.CN,
          issuerCN: cert.issuer?.CN,
          subjectAltNames: cert.subjectaltname || null,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          protocol: socket.getProtocol?.() || "TLS",
          cipher: socket.getCipher?.()?.name,
          authorized: socket.authorized,
          authorizationError: socket.authorizationError || null,
          checkedAt: now.toISOString(),
        });
      });
      socket.on("error", err => reject(new Error(`[ssl_trigger] ${err.message}`)));
      socket.setTimeout(config.timeout || 10000, () => { socket.destroy(); reject(new Error("[ssl_trigger] Connection timed out")); });
    });
  },
};
