/**
 * FIGMA — File resource. getFile/getComponents/exportImage preserved verbatim
 * from the monolith; getFileNodes, getImageFills, getVersions, getStyles added
 * for parity. Every handler needs `fileKey` (validated in the slim entry).
 * Handlers receive (config, client) where config carries a resolved `fileKey`.
 */

async function opGetFile(config, client) {
  const res = await client.get(`${client.base}/files/${config.fileKey}`, { depth: config.depth || 2 });
  return { name: res.data.name, lastModified: res.data.lastModified, thumbnailUrl: res.data.thumbnailUrl, version: res.data.version, pages: res.data.document?.children?.map((c) => ({ id: c.id, name: c.name })) };
}

async function opGetComponents(config, client) {
  const res = await client.get(`${client.base}/files/${config.fileKey}/components`);
  return { components: res.data.meta?.components || [], count: (res.data.meta?.components || []).length };
}

async function opExportImage(config, client) {
  const nodeId = config.nodeId;
  if (!nodeId) return { success: false, error: "figma exportImage: 'nodeId' required.", skipped: true };
  const res = await client.get(`${client.base}/images/${config.fileKey}`, { ids: nodeId, format: config.format || "png", scale: config.scale || 2 });
  return { images: res.data.images, err: res.data.err };
}

async function opGetFileNodes(config, client) {
  if (!config.nodeId) return { success: false, error: "figma getFileNodes: 'nodeId' required.", skipped: true };
  const res = await client.get(`${client.base}/files/${config.fileKey}/nodes`, { ids: config.nodeId, depth: config.depth || 1 });
  return { nodes: res.data.nodes, name: res.data.name };
}

async function opGetImageFills(config, client) {
  const res = await client.get(`${client.base}/files/${config.fileKey}/images`);
  return { images: res.data.meta?.images || {}, count: Object.keys(res.data.meta?.images || {}).length };
}

async function opGetVersions(config, client) {
  const res = await client.get(`${client.base}/files/${config.fileKey}/versions`);
  return { versions: (res.data.versions || []).map((v) => ({ id: v.id, label: v.label, created_at: v.created_at, user: v.user?.handle })), count: (res.data.versions || []).length };
}

async function opGetStyles(config, client) {
  const res = await client.get(`${client.base}/files/${config.fileKey}/styles`);
  return { styles: res.data.meta?.styles || [], count: (res.data.meta?.styles || []).length };
}

export const fileOperations = {
  getFile: opGetFile,
  getComponents: opGetComponents,
  exportImage: opExportImage,
  getFileNodes: opGetFileNodes,
  getImageFills: opGetImageFills,
  getVersions: opGetVersions,
  getStyles: opGetStyles,
};
