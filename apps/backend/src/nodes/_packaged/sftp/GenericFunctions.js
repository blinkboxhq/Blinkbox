/**
 * SFTP — shared primitives. Resolves the connection credential (JSON blob or
 * "host:username:password" string — silent fall-through to raw config on
 * failure, verbatim from the monolith), hardens the target host against private
 * addresses, defensively dynamic-imports ssh2-sftp-client (an OPTIONAL dep — a
 * missing package SKIPS, verbatim), and owns the connect/end lifecycle.
 * Handlers receive (config, ctx) where ctx is { sftp, remotePath, input }.
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { assertSafeHost } from "../../../utils/ssrf.js";

export const OP_ALIAS = { upload: "uploadFile", download: "downloadFile", list: "listFiles", delete: "deleteFile", mkdir: "makeDirectory" };

export async function resolveConnection(config, input, context) {
  let host = config.host || input.host || "";
  let username = config.username || input.username || "";
  let password = config.password || input.password || "";
  let privateKey = config.privateKey;

  if (config.credentialId && context.workspaceId) {
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "SFTP");
      try {
        const parsed = JSON.parse(raw);
        host = parsed.host || host;
        username = parsed.username || username;
        password = parsed.password || password;
        if (parsed.privateKey) privateKey = parsed.privateKey;
      } catch {
        const parts = raw.split(":");
        if (parts.length >= 3) { host = parts[0]; username = parts[1]; password = parts.slice(2).join(":"); }
      }
    } catch { /* fall through to raw config */ }
  }

  return { host, username, password, privateKey, port: parseInt(config.port) || 22 };
}

export async function loadClient() {
  try { return (await import("ssh2-sftp-client")).default; }
  catch { return null; }
}

export async function connect(SftpClient, conn) {
  const sftp = new SftpClient();
  const connConfig = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    ...(conn.privateKey ? { privateKey: conn.privateKey } : { password: conn.password }),
  };
  await sftp.connect(connConfig);
  return sftp;
}

export function guardHost(host) {
  try { assertSafeHost(host); return null; }
  catch (e) { return { success: false, error: `SFTP: Blocked host — ${e.message}`, skipped: true }; }
}

export function unknownOperationSkip(operation) {
  return { success: false, error: `SFTP: Unknown operation "${operation}".`, skipped: true };
}
