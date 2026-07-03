/**
 * SFTP — File & Directory resource. listFiles / downloadFile / uploadFile /
 * deleteFile / makeDirectory / renameFile preserved verbatim from the monolith;
 * getStat, exists, downloadBinary, uploadBinary, copyFile, removeDirectory added
 * for parity. Handlers receive (config, ctx) where ctx is
 * { sftp, remotePath, input }.
 */

async function opListFiles(config, { sftp, remotePath }) {
  const files = await sftp.list(remotePath);
  return {
    files: files.map((f) => ({ name: f.name, size: f.size, type: f.type, modified: new Date(f.modifyTime * 1000).toISOString() })),
    count: files.length,
    path: remotePath,
  };
}

async function opDownloadFile(config, { sftp, remotePath }) {
  const content = await sftp.get(remotePath);
  return { content: content.toString("utf8"), path: remotePath };
}

async function opUploadFile(config, { sftp, remotePath, input }) {
  const fileContent = config.content || input.content || "";
  await sftp.put(Buffer.from(fileContent), remotePath);
  return { success: true, path: remotePath, size: fileContent.length };
}

async function opDeleteFile(config, { sftp, remotePath }) {
  await sftp.delete(remotePath);
  return { success: true, deleted: remotePath };
}

async function opMakeDirectory(config, { sftp, remotePath }) {
  await sftp.mkdir(remotePath, true);
  return { success: true, created: remotePath };
}

async function opRenameFile(config, { sftp, remotePath, input }) {
  const destPath = config.destPath || input.destPath || "";
  if (!destPath) return { success: false, error: "SFTP renameFile: 'destPath' required.", skipped: true };
  await sftp.rename(remotePath, destPath);
  return { success: true, from: remotePath, to: destPath };
}

async function opGetStat(config, { sftp, remotePath }) {
  const stat = await sftp.stat(remotePath);
  return {
    path: remotePath,
    size: stat.size,
    mode: stat.mode,
    isDirectory: stat.isDirectory,
    isFile: stat.isFile,
    modified: new Date(stat.modifyTime * 1000).toISOString(),
    accessed: new Date(stat.accessTime * 1000).toISOString(),
  };
}

async function opExists(config, { sftp, remotePath }) {
  const type = await sftp.exists(remotePath);
  return { path: remotePath, exists: type !== false, type: type || null };
}

async function opDownloadBinary(config, { sftp, remotePath }) {
  const content = await sftp.get(remotePath);
  return { contentBase64: content.toString("base64"), path: remotePath, size: content.length };
}

async function opUploadBinary(config, { sftp, remotePath, input }) {
  const b64 = config.contentBase64 || input.contentBase64 || "";
  if (!b64) return { success: false, error: "SFTP uploadBinary: 'contentBase64' required.", skipped: true };
  const buf = Buffer.from(b64, "base64");
  await sftp.put(buf, remotePath);
  return { success: true, path: remotePath, size: buf.length };
}

async function opCopyFile(config, { sftp, remotePath, input }) {
  const destPath = config.destPath || input.destPath || "";
  if (!destPath) return { success: false, error: "SFTP copyFile: 'destPath' required.", skipped: true };
  const content = await sftp.get(remotePath);
  await sftp.put(Buffer.isBuffer(content) ? content : Buffer.from(content), destPath);
  return { success: true, from: remotePath, to: destPath };
}

async function opRemoveDirectory(config, { sftp, remotePath }) {
  await sftp.rmdir(remotePath, true);
  return { success: true, removed: remotePath };
}

export const fileOperations = {
  listFiles: opListFiles,
  downloadFile: opDownloadFile,
  uploadFile: opUploadFile,
  deleteFile: opDeleteFile,
  makeDirectory: opMakeDirectory,
  renameFile: opRenameFile,
  getStat: opGetStat,
  exists: opExists,
  downloadBinary: opDownloadBinary,
  uploadBinary: opUploadBinary,
  copyFile: opCopyFile,
  removeDirectory: opRemoveDirectory,
};
