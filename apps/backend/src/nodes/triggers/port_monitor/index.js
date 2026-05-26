import net from "net";

export default {
  async run(config, input) {
    if (input?.isOpen != null && input?.host) return input;
    const host = (config.host || config.hostname || "localhost").replace(/^https?:\/\//, "").split("/")[0];
    const ports = config.ports ? String(config.ports).split(",").map(p => parseInt(p.trim())).filter(Boolean) : [parseInt(config.port || 80)];
    const timeout = Math.min(config.timeout || 5000, 30000);
    const results = await Promise.all(ports.map(port => checkPort(host, port, timeout)));
    const allOpen = results.every(r => r.isOpen);
    const anyOpen = results.some(r => r.isOpen);
    return {
      host,
      ports: results,
      openPorts: results.filter(r => r.isOpen).map(r => r.port),
      closedPorts: results.filter(r => !r.isOpen).map(r => r.port),
      allOpen, anyOpen, isUp: config.requireAll ? allOpen : anyOpen,
      checkedAt: new Date().toISOString(),
    };
  },
};

function checkPort(host, port, timeout) {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();
    const done = (isOpen, error) => {
      socket.destroy();
      resolve({ port, isOpen, responseTime: Date.now() - start, error: error ?? null, service: knownPort(port) });
    };
    socket.setTimeout(timeout);
    socket.connect(port, host, () => done(true));
    socket.on("error", err => done(false, err.code || err.message));
    socket.on("timeout", () => done(false, "TIMEOUT"));
  });
}

function knownPort(port) {
  const map = { 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 465: "SMTPS", 587: "SMTP", 993: "IMAPS", 995: "POP3S", 3306: "MySQL", 5432: "PostgreSQL", 6379: "Redis", 27017: "MongoDB", 8080: "HTTP-Alt", 8443: "HTTPS-Alt" };
  return map[port] || "Unknown";
}
