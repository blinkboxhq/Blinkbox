/**
 * SFTP NODE — Secure file transfer operations.
 * Uses the ssh2-sftp-client npm package if available, otherwise returns
 * a clear error message asking the user to install it.
 */
export default {
  async run(config, input, context = {}) {
    const OP_ALIAS = { upload: "uploadFile", download: "downloadFile", list: "listFiles", delete: "deleteFile", mkdir: "makeDirectory" };
    const operation = OP_ALIAS[config.operation] || config.operation || "listFiles";
    const host = config.host || input.host || "";
    if (!host) return { success: false, error: "SFTP: 'host' is required.", skipped: true };

    let SftpClient;
    try { SftpClient = (await import("ssh2-sftp-client")).default; }
    catch { return { success: false, error: "SFTP: ssh2-sftp-client package not installed. Run: npm i ssh2-sftp-client in the backend.", skipped: true }; }

    const sftp = new SftpClient();
    const connConfig = {
      host,
      port: config.port || 22,
      username: config.username || input.username || "",
      ...(config.privateKey ? { privateKey: config.privateKey } : { password: config.password || input.password || "" }),
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
