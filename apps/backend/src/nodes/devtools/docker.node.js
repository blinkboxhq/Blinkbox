import axios from "axios";

export default {
  async run(config, input) {
    const operation = config.operation || "listContainers";
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

    const dockerRequest = (method, path, data) =>
      axios({ method, socketPath, url: `http://localhost${path}`, data, timeout: 30000 })
        .catch((err) => { throw new Error(`docker: ${err.response?.data?.message || err.message}`); });

    if (operation === "listContainers") {
      const res = await dockerRequest("get", `/containers/json?all=${config.all !== false}`);
      return { containers: res.data.map((c) => ({ id: c.Id.slice(0, 12), names: c.Names, image: c.Image, status: c.Status, state: c.State })), count: res.data.length };
    }
    if (operation === "listImages") {
      const res = await dockerRequest("get", "/images/json");
      return { images: res.data.map((i) => ({ id: i.Id.slice(7, 19), tags: i.RepoTags, size: i.Size, created: new Date(i.Created * 1000).toISOString() })), count: res.data.length };
    }
    if (operation === "start") {
      await dockerRequest("post", `/containers/${config.containerId}/start`);
      return { containerId: config.containerId, started: true };
    }
    if (operation === "stop") {
      await dockerRequest("post", `/containers/${config.containerId}/stop`);
      return { containerId: config.containerId, stopped: true };
    }
    if (operation === "logs") {
      const res = await dockerRequest("get", `/containers/${config.containerId}/logs?stdout=true&stderr=true&tail=${config.tail || 100}`);
      return { logs: String(res.data), containerId: config.containerId };
    }
    if (operation === "stats") {
      const res = await dockerRequest("get", `/containers/${config.containerId}/stats?stream=false`);
      return { cpuPercent: null, memoryUsage: res.data.memory_stats?.usage, containerId: config.containerId };
    }
    throw new Error(`docker: Unknown operation "${operation}".`);
  },
};
