import net from "net";

export default {
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
