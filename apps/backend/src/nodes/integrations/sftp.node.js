import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const OP_ALIAS = { upload: "uploadFile", download: "downloadFile", list: "listFiles", delete: "deleteFile", mkdir: "makeDirectory" };
    const operation = OP_ALIAS[config.operation] || config.operation || "listFiles";

    // Resolve credentials — credential stores "host:port:username:password" or JSON
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
          // If not JSON, treat as "host:username:password"
          const parts = raw.split(":");
          if (parts.length >= 3) { host = parts[0]; username = parts[1]; password = parts.slice(2).join(":"); }
        }
      } catch { /* fall through to raw config */ }
    }

    if (!host) return { success: false, error: "SFTP: 'host' is required.", skipped: true };

    let SftpClient;
    try { SftpClient = (await import("ssh2-sftp-client")).default; }
    catch { return { success: false, error: "SFTP: ssh2-sftp-client package not installed. Run: npm i ssh2-sftp-client in the backend.", skipped: true }; }

    const sftp = new SftpClient();
    const connConfig = {
      host,
      port: parseInt(config.port) || 22,
      username,
      ...(privateKey ? { privateKey } : { password }),
    };

    try {
      await sftp.connect(connConfig);
      const remotePath = config.remotePath || "/";

      switch (operation) {
        case "listFiles": {
          const files = await sftp.list(remotePath);
          return { files: files.map(f => ({ name: f.name, size: f.size, type: f.type, modified: new Date(f.modifyTime * 1000).toISOString() })), count: files.length, path: remotePath };
        }
        case "downloadFile": {
          const content = await sftp.get(remotePath);
          return { content: content.toString("utf8"), path: remotePath };
        }
        case "uploadFile": {
          const fileContent = config.content || input.content || "";
          await sftp.put(Buffer.from(fileContent), remotePath);
          return { success: true, path: remotePath, size: fileContent.length };
        }
        case "deleteFile": {
          await sftp.delete(remotePath);
          return { success: true, deleted: remotePath };
        }
        case "makeDirectory": {
          await sftp.mkdir(remotePath, true);
          return { success: true, created: remotePath };
        }
        case "renameFile": {
          const destPath = config.destPath || input.destPath || "";
          if (!destPath) return { success: false, error: "SFTP renameFile: 'destPath' required.", skipped: true };
          await sftp.rename(remotePath, destPath);
          return { success: true, from: remotePath, to: destPath };
        }
        default:
          return { success: false, error: `SFTP: Unknown operation "${operation}".`, skipped: true };
      }
    } finally {
      sftp.end().catch(() => {});
    }
  },
};
