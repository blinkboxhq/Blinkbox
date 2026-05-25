import { Client } from "ssh2";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.stdout != null) return input;
    const host = config.host || config.hostname;
    const port = parseInt(config.port || 22);
    const username = config.username || config.user || "root";
    const command = config.command || input?.command || "uptime";
    const timeout = Math.min(config.timeout || 30000, 60000);
    let auth = {};
    if (config.privateKey) auth = { privateKey: config.privateKey, passphrase: config.passphrase };
    else if (config.credentialId) {
      const token = await getOAuthToken(config.credentialId, config.workspaceId, "SSH").catch(() => null);
      if (token) auth = token.startsWith("-----BEGIN") ? { privateKey: token } : { password: token };
    } else auth = { password: config.password || "" };
    return new Promise((resolve, reject) => {
      const client = new Client();
      const timer = setTimeout(() => { client.end(); reject(new Error("[ssh_trigger] Connection timed out")); }, timeout);
      client.on("ready", () => {
        client.exec(command, (err, stream) => {
          if (err) { clearTimeout(timer); client.end(); return reject(new Error(`[ssh_trigger] ${err.message}`)); }
          let stdout = "", stderr = "";
          stream.on("data", d => { stdout += d; });
          stream.stderr.on("data", d => { stderr += d; });
          stream.on("close", (code) => {
            clearTimeout(timer);
            client.end();
            resolve({ host, port, username, command, stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code, success: code === 0, lines: stdout.trim().split("\n").filter(Boolean), executedAt: new Date().toISOString() });
          });
        });
      });
      client.on("error", err => { clearTimeout(timer); reject(new Error(`[ssh_trigger] ${err.message}`)); });
      client.connect({ host, port, username, readyTimeout: timeout, ...auth });
    });
  },
};
