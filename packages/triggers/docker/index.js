import Dockerode from "dockerode";

export default {
  async run(config, input) {
    if (input?.containers || input?.events) return input;
    const opts = {};
    if (config.socketPath) opts.socketPath = config.socketPath;
    else if (config.host) { opts.host = config.host; opts.port = config.port || 2376; if (config.ca) opts.ca = config.ca; if (config.cert) opts.cert = config.cert; if (config.key) opts.key = config.key; }
    else opts.socketPath = "/var/run/docker.sock";
    const docker = new Dockerode(opts);
    const listContainers = config.mode !== "events";
    if (listContainers) {
      const filters = {};
      if (config.status) filters.status = [config.status];
      if (config.label) filters.label = Array.isArray(config.label) ? config.label : [config.label];
      const containers = await docker.listContainers({ all: config.includeAll ?? true, filters: JSON.stringify(filters) });
      const normalized = containers.map(c => ({
        id: c.Id?.slice(0, 12), fullId: c.Id, names: c.Names?.map(n => n.replace(/^\//, "")), name: c.Names?.[0]?.replace(/^\//, ""),
        image: c.Image, imageId: c.ImageID?.slice(7, 19), command: c.Command, created: new Date(c.Created * 1000).toISOString(),
        status: c.Status, state: c.State,
        ports: (c.Ports ?? []).map(p => ({ ip: p.IP, privatePort: p.PrivatePort, publicPort: p.PublicPort, type: p.Type })),
        labels: c.Labels ?? {}, networks: Object.keys(c.NetworkSettings?.Networks ?? {}),
        mounts: (c.Mounts ?? []).map(m => ({ type: m.Type, source: m.Source, destination: m.Destination })),
        sizeRw: c.SizeRw, sizeRootFs: c.SizeRootFs,
      }));
      const running = normalized.filter(c => c.state === "running");
      const stopped = normalized.filter(c => c.state === "exited");
      return { containers: normalized, count: normalized.length, running: running.length, stopped: stopped.length, runningContainers: running, stoppedContainers: stopped, triggeredAt: new Date().toISOString() };
    }
    return { event: "docker.event", message: "Event mode requires a streaming setup", triggeredAt: new Date().toISOString() };
  },
};
