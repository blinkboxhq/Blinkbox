/**
 * SFTP NODE — slim entry. Resolves the connection credential, hardens the target
 * host, defensively loads the OPTIONAL ssh2-sftp-client package, opens the
 * connection, and delegates op dispatch to the modular router under
 * _packaged/sftp/. Preserves the original node's contract EXACTLY: op aliases
 * (upload/download/list/delete/mkdir), silent credential fall-through, a missing
 * host SKIPS, a missing package SKIPS, an unknown operation SKIPS (double-quoted),
 * per-op validation SKIPS, and the connection is always closed in `finally`.
 * Handlers receive (config, ctx) where ctx is { sftp, remotePath, input }.
 */
import {
  OP_ALIAS,
  resolveConnection,
  loadClient,
  connect,
  guardHost,
} from "../_packaged/sftp/GenericFunctions.js";
import { run as runSftp, DEFAULT_OPERATION } from "../_packaged/sftp/router.js";

export default {
  async run(config, input = {}, context = {}) {
    const operation = OP_ALIAS[config.operation] || config.operation || DEFAULT_OPERATION;

    const conn = await resolveConnection(config, input, context);
    if (!conn.host) return { success: false, error: "SFTP: 'host' is required.", skipped: true };

    const hostSkip = guardHost(conn.host);
    if (hostSkip) return hostSkip;

    const SftpClient = await loadClient();
    if (!SftpClient) return { success: false, error: "SFTP: ssh2-sftp-client package not installed. Run: npm i ssh2-sftp-client in the backend.", skipped: true };

    const sftp = await connect(SftpClient, conn);
    try {
      const remotePath = config.remotePath || "/";
      return await runSftp({ ...config, operation }, { sftp, remotePath, input });
    } finally {
      sftp.end().catch(() => {});
    }
  },
};
