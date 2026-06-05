export default {
  async run(config, input, context) {
    const { NodeSSH } = await import("node-ssh").catch(() => { throw new Error("ssh: node-ssh package not installed."); });
    const host = config.host || input?.host;
    const command = config.command || input?.command;
    if (!host) return { success: false, error: "ssh: 'host' is required.", skipped: true };
    if (!command) return { success: false, error: "ssh: 'command' is required.", skipped: true };

    const client = new NodeSSH();
    await client.connect({
      host, port: parseInt(config.port || 22),
      username: config.username || "ubuntu",
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      readyTimeout: 15000,
    });

    try {
      const result = await client.execCommand(command, { cwd: config.cwd || "/" });
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.code, host, command };
    } finally {
      client.dispose();
    }
  },
};
