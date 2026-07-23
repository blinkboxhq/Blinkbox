import tls from "tls";

export default {
  async run(config, input) {
    const hostname = config.hostname || input?.hostname || input?.domain;
    const port = parseInt(config.port || 443);
    if (!hostname) return { success: false, error: "ssl: 'hostname' is required.", skipped: true };

    return new Promise((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port, servername: hostname, timeout: 120000 }, () => {
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
