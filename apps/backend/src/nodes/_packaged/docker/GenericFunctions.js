/**
 * DOCKER — shared primitives. Talks to the Docker Engine API over the local Unix
 * socket (DOCKER_SOCKET or /var/run/docker.sock). No credential — access is
 * governed by socket permissions. Errors are mapped under the `docker:` prefix.
 * Import depth THREE levels (no util imports needed).
 */
import axios from "axios";

const PREFIX = "docker:";
const TIMEOUT = 30000;

export function getClient() {
  const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  const request = (method, path, data, extra) =>
    axios({ method, socketPath, url: `http://localhost${path}`, data, timeout: TIMEOUT, ...extra });
  return {
    get: (path) => request("get", path),
    post: (path, data) => request("post", path, data),
    del: (path) => request("delete", path),
    raw: request,
  };
}

export function handleError(err) {
  if (err.__skip) return { success: false, error: err.message, skipped: true };
  if (err.message?.startsWith(PREFIX)) throw err;
  const code = err.code;
  const msg = err.response?.data?.message ?? err.message;
  if (code === "ENOENT" || code === "ECONNREFUSED") throw new Error(`${PREFIX} Cannot reach the Docker daemon at the socket. Is Docker running?`);
  const status = err.response?.status;
  if (status === 404) throw new Error(`${PREFIX} Not found — ${msg}. Check the container/image ID.`);
  if (status === 409) throw new Error(`${PREFIX} Conflict — ${msg}`);
  throw new Error(`${PREFIX} ${msg}`);
}
