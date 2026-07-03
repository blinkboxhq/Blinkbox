/**
 * DOCKER — Container resource. listContainers/start/stop/logs/stats preserved
 * verbatim from the monolith; restart/kill/pause/unpause/remove/inspect/create
 * added for parity. Handlers receive (config, client).
 */

function requireContainer(config, op) {
  if (config.containerId) return null;
  return { success: false, error: `docker ${op}: 'containerId' is required.`, skipped: true };
}

async function opListContainers(config, client) {
  const res = await client.get(`/containers/json?all=${config.all !== false}`);
  return { containers: res.data.map((c) => ({ id: c.Id.slice(0, 12), names: c.Names, image: c.Image, status: c.Status, state: c.State })), count: res.data.length };
}

async function opStart(config, client) {
  const miss = requireContainer(config, "start"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/start`);
  return { containerId: config.containerId, started: true };
}

async function opStop(config, client) {
  const miss = requireContainer(config, "stop"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/stop`);
  return { containerId: config.containerId, stopped: true };
}

async function opRestart(config, client) {
  const miss = requireContainer(config, "restart"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/restart`);
  return { containerId: config.containerId, restarted: true };
}

async function opKill(config, client) {
  const miss = requireContainer(config, "kill"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/kill`);
  return { containerId: config.containerId, killed: true };
}

async function opPause(config, client) {
  const miss = requireContainer(config, "pause"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/pause`);
  return { containerId: config.containerId, paused: true };
}

async function opUnpause(config, client) {
  const miss = requireContainer(config, "unpause"); if (miss) return miss;
  await client.post(`/containers/${config.containerId}/unpause`);
  return { containerId: config.containerId, paused: false };
}

async function opRemove(config, client) {
  const miss = requireContainer(config, "remove"); if (miss) return miss;
  await client.del(`/containers/${config.containerId}?force=${config.force === true}&v=${config.removeVolumes === true}`);
  return { containerId: config.containerId, removed: true };
}

async function opInspect(config, client) {
  const miss = requireContainer(config, "inspect"); if (miss) return miss;
  const res = await client.get(`/containers/${config.containerId}/json`);
  const d = res.data;
  return { id: d.Id?.slice(0, 12), name: d.Name, image: d.Config?.Image, state: d.State?.Status, running: d.State?.Running, createdAt: d.Created, ports: d.NetworkSettings?.Ports };
}

async function opLogs(config, client) {
  const miss = requireContainer(config, "logs"); if (miss) return miss;
  const res = await client.get(`/containers/${config.containerId}/logs?stdout=true&stderr=true&tail=${config.tail || 100}`);
  return { logs: String(res.data), containerId: config.containerId };
}

async function opStats(config, client) {
  const miss = requireContainer(config, "stats"); if (miss) return miss;
  const res = await client.get(`/containers/${config.containerId}/stats?stream=false`);
  return { cpuPercent: null, memoryUsage: res.data.memory_stats?.usage, containerId: config.containerId };
}

async function opCreate(config, client) {
  if (!config.image) return { success: false, error: "docker create: 'image' is required.", skipped: true };
  const body = { Image: config.image };
  if (config.cmd) body.Cmd = Array.isArray(config.cmd) ? config.cmd : String(config.cmd).split(" ");
  if (config.env) body.Env = config.env;
  if (config.exposedPorts) body.ExposedPorts = config.exposedPorts;
  const res = await client.raw("post", `/containers/create${config.name ? `?name=${encodeURIComponent(config.name)}` : ""}`, body);
  return { containerId: res.data.Id?.slice(0, 12), warnings: res.data.Warnings || [] };
}

export const containerOperations = {
  listContainers: opListContainers,
  start: opStart,
  stop: opStop,
  restart: opRestart,
  kill: opKill,
  pause: opPause,
  unpause: opUnpause,
  remove: opRemove,
  inspect: opInspect,
  logs: opLogs,
  stats: opStats,
  create: opCreate,
};
