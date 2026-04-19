import Docker from "dockerode";

const docker = new Docker();

const LANGUAGE_CONFIG = {
  bash:       { image: "node:20-alpine", cmd: (code) => ["sh", "-c", code] },
  python:     { image: "python:3.12-alpine", cmd: (code) => ["python3", "-c", code] },
  node:       { image: "node:20-alpine", cmd: (code) => ["node", "-e", code] },
  powershell: { image: "node:20-alpine", cmd: (code) => ["sh", "-c", code] },
};

export default {
  async run(config) {
    const language = LANGUAGE_CONFIG[config.language] ? config.language : "bash";
    const command  = config.command || config.commands || "";
    const timeoutMs = Math.min(Math.max(parseInt(config.timeoutSeconds || 30) * 1000, 1000), 300_000);

    if (!command.trim()) return { stdout: "", stderr: "", exitCode: 0, language, executionTimeMs: 0 };

    const { image, cmd } = LANGUAGE_CONFIG[language];
    const startedAt = Date.now();

    const envVars = Array.isArray(config.envVars)
      ? config.envVars.filter(e => e.key).map(e => `${e.key}=${e.value ?? ""}`)
      : [];

    let container;
    try {
      container = await docker.createContainer({
        Image: image,
        Cmd: cmd(command),
        Env: envVars,
        HostConfig: {
          Memory: 512 * 1024 * 1024,
          NanoCpus: 1e9,
          NetworkMode: "none",
          AutoRemove: true,
        },
        AttachStdout: true,
        AttachStderr: true,
      });

      await container.start();

      // Race: wait for container vs timeout
      let timedOut = false;
      const timeoutHandle = setTimeout(async () => {
        timedOut = true;
        try { await container.kill(); } catch (_) {}
      }, timeoutMs);

      const [exitData, logsBuffer] = await Promise.all([
        container.wait(),
        container.logs({ stdout: true, stderr: true, follow: true })
          .then(stream => new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", c => chunks.push(c));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
          })),
      ]);

      clearTimeout(timeoutHandle);

      // Docker multiplexes stdout/stderr — demux the stream
      let stdout = "";
      let stderr = "";
      let offset = 0;
      while (offset + 8 <= logsBuffer.length) {
        const streamType = logsBuffer[offset];
        const size = logsBuffer.readUInt32BE(offset + 4);
        offset += 8;
        const chunk = logsBuffer.slice(offset, offset + size).toString("utf8");
        offset += size;
        if (streamType === 1) stdout += chunk;
        else stderr += chunk;
      }

      return {
        stdout,
        stderr,
        exitCode: timedOut ? -1 : (exitData?.StatusCode ?? 0),
        language,
        executionTimeMs: Date.now() - startedAt,
        timedOut,
      };
    } catch (err) {
      // If AutoRemove already cleaned up, ignore "no such container" errors
      if (container) {
        try { await container.remove({ force: true }); } catch (_) {}
      }
      throw new Error(`Virtual Computer: ${err.message}`);
    }
  },
};
