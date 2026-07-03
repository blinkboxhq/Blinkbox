/**
 * DOCKER — Image & System resource. listImages preserved verbatim from the
 * monolith; inspectImage, pullImage, removeImage, listVolumes, listNetworks,
 * pruneContainers, info added for parity. Handlers receive (config, client).
 */

async function opListImages(config, client) {
  const res = await client.get("/images/json");
  return { images: res.data.map((i) => ({ id: i.Id.slice(7, 19), tags: i.RepoTags, size: i.Size, created: new Date(i.Created * 1000).toISOString() })), count: res.data.length };
}

async function opInspectImage(config, client) {
  if (!config.imageId) return { success: false, error: "docker inspectImage: 'imageId' is required.", skipped: true };
  const res = await client.get(`/images/${encodeURIComponent(config.imageId)}/json`);
  const d = res.data;
  return { id: d.Id?.slice(7, 19), tags: d.RepoTags, size: d.Size, architecture: d.Architecture, os: d.Os, created: d.Created };
}

async function opPullImage(config, client) {
  if (!config.image) return { success: false, error: "docker pullImage: 'image' is required.", skipped: true };
  const ref = config.image.includes(":") ? config.image : `${config.image}:latest`;
  await client.post(`/images/create?fromImage=${encodeURIComponent(ref)}`);
  return { image: ref, pulled: true };
}

async function opRemoveImage(config, client) {
  if (!config.imageId) return { success: false, error: "docker removeImage: 'imageId' is required.", skipped: true };
  const res = await client.del(`/images/${encodeURIComponent(config.imageId)}?force=${config.force === true}`);
  return { imageId: config.imageId, removed: true, details: res.data };
}

async function opListVolumes(config, client) {
  const res = await client.get("/volumes");
  return { volumes: (res.data.Volumes || []).map((v) => ({ name: v.Name, driver: v.Driver, mountpoint: v.Mountpoint })), count: (res.data.Volumes || []).length };
}

async function opListNetworks(config, client) {
  const res = await client.get("/networks");
  return { networks: res.data.map((n) => ({ id: n.Id?.slice(0, 12), name: n.Name, driver: n.Driver, scope: n.Scope })), count: res.data.length };
}

async function opPruneContainers(config, client) {
  const res = await client.post("/containers/prune");
  return { deleted: res.data.ContainersDeleted || [], spaceReclaimed: res.data.SpaceReclaimed || 0 };
}

async function opInfo(config, client) {
  const res = await client.get("/info");
  const d = res.data;
  return { containers: d.Containers, running: d.ContainersRunning, images: d.Images, serverVersion: d.ServerVersion, os: d.OperatingSystem, ncpu: d.NCPU, memTotal: d.MemTotal };
}

export const imageOperations = {
  listImages: opListImages,
  inspectImage: opInspectImage,
  pullImage: opPullImage,
  removeImage: opRemoveImage,
  listVolumes: opListVolumes,
  listNetworks: opListNetworks,
  pruneContainers: opPruneContainers,
  info: opInfo,
};
