/**
 * SSH NODE — runs a command or moves a file on a remote host over SSH.
 *
 * Gated behind ENABLE_SHELL_TOOLS. Remote command execution is arbitrary code
 * execution on someone else's box; it stays off unless an operator turns it on.
 *
 * Reuses SFTP's credential resolver so one saved credential drives both nodes.
 */
import { Client } from "ssh2";
import { ENABLE_SHELL_TOOLS } from "../../config/env.js";
import { assertSafeHost } from "../../utils/ssrf.js";
import { resolveConnection } from "../_packaged/sftp/GenericFunctions.js";

export const OPERATIONS = ["executeCommand", "uploadFile", "downloadFile", "listFiles"];
export const DEFAULT_OPERATION = "executeCommand";
export const OP_ALIAS = { exec: "executeCommand", upload: "uploadFile", download: "downloadFile", list: "listFiles" };

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30000;

function openConnection(conn, timeout) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const fail = (e) => { client.end(); reject(e); };
    client.on("ready", () => resolve(client));
    client.on("error", (e) => fail(new Error(`SSH: connection failed — ${e.message}`)));
    client.connect({
      host: conn.host,
      port: conn.port,
      username: conn.username,
      ...(conn.privateKey ? { privateKey: conn.privateKey } : { password: conn.password }),
      readyTimeout: timeout,
    });
  });
}

function exec(client, command, timeout) {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) return reject(new Error(`SSH: exec failed — ${err.message}`));
      let stdout = "", stderr = "", truncated = false;
      const timer = setTimeout(() => { stream.close(); reject(new Error(`SSH: command timed out after ${timeout}ms`)); }, timeout);
      const cap = (buf, cur) => {
        if (cur.length >= MAX_OUTPUT_BYTES) { truncated = true; return cur; }
        return cur + buf.toString("utf-8");
      };
      stream.on("data", (d) => { stdout = cap(d, stdout); });
      stream.stderr.on("data", (d) => { stderr = cap(d, stderr); });
      stream.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 0, truncated });
      });
    });
  });
}

function withSftp(client, fn) {
  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) return reject(new Error(`SSH: could not open SFTP channel — ${err.message}`));
      fn(sftp, resolve, reject);
    });
  });
}

export default {
  async run(config, input = {}, context = {}) {
    if (!ENABLE_SHELL_TOOLS) {
      return { success: false, error: "SSH: remote command execution is disabled. Set ENABLE_SHELL_TOOLS=true to enable it.", skipped: true };
    }

    const operation = OP_ALIAS[config.operation] || config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS.includes(operation)) {
      return { success: false, error: `SSH: Unknown operation "${operation}".`, skipped: true };
    }

    const conn = await resolveConnection(config, input, context);
    if (!conn.host) return { success: false, error: "SSH: 'host' is required.", skipped: true };
    if (!conn.username) return { success: false, error: "SSH: 'username' is required.", skipped: true };
    if (!conn.password && !conn.privateKey) {
      return { success: false, error: "SSH: provide a password or a private key.", skipped: true };
    }

    await assertSafeHost(conn.host);

    const timeout = Math.min(Math.max(parseInt(config.timeout) || DEFAULT_TIMEOUT_MS, 1000), 300000);
    const client = await openConnection(conn, timeout);

    try {
      switch (operation) {
        case "executeCommand": {
          if (!config.command) return { success: false, error: "SSH: 'command' is required.", skipped: true };
          const out = await exec(client, config.command, timeout);
          return { success: out.exitCode === 0, ...out };
        }
        case "uploadFile": {
          if (!config.remotePath) return { success: false, error: "SSH: 'remotePath' is required.", skipped: true };
          const body = config.content ?? "";
          await withSftp(client, (sftp, resolve, reject) => {
            const stream = sftp.createWriteStream(config.remotePath);
            stream.on("close", resolve);
            stream.on("error", (e) => reject(new Error(`SSH: upload failed — ${e.message}`)));
            stream.end(Buffer.from(body, "utf-8"));
          });
          return { success: true, path: config.remotePath, bytes: Buffer.byteLength(body) };
        }
        case "downloadFile": {
          if (!config.remotePath) return { success: false, error: "SSH: 'remotePath' is required.", skipped: true };
          const content = await withSftp(client, (sftp, resolve, reject) => {
            sftp.readFile(config.remotePath, (e, buf) => {
              if (e) return reject(new Error(`SSH: download failed — ${e.message}`));
              if (buf.length > MAX_OUTPUT_BYTES) return reject(new Error(`SSH: file exceeds ${MAX_OUTPUT_BYTES} bytes.`));
              resolve(buf.toString("utf-8"));
            });
          });
          return { success: true, path: config.remotePath, content };
        }
        case "listFiles": {
          const dir = config.remotePath || ".";
          const files = await withSftp(client, (sftp, resolve, reject) => {
            sftp.readdir(dir, (e, list) => {
              if (e) return reject(new Error(`SSH: list failed — ${e.message}`));
              resolve(list.map((f) => ({
                name: f.filename,
                size: f.attrs.size,
                isDirectory: f.attrs.isDirectory(),
                modifiedAt: new Date(f.attrs.mtime * 1000).toISOString(),
              })));
            });
          });
          return { success: true, path: dir, files };
        }
      }
    } finally {
      client.end();
    }
  },
};
