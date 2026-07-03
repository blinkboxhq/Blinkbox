/**
 * SUPABASE — Storage resource. New for parity with n8n's storage surface:
 * listBuckets, listFiles, createSignedUrl, getPublicUrl, deleteFile. Handlers
 * receive (config, supabase). File uploads accept base64 content.
 */
function requireBucket(config, op) {
  if (!config.bucket) return { success: false, error: `Supabase ${op}: 'bucket' is required.`, skipped: true };
  return null;
}

async function opListBuckets(_config, supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return { buckets: data ?? [], count: data?.length ?? 0 };
}

async function opListFiles(config, supabase) {
  const miss = requireBucket(config, "listFiles"); if (miss) return miss;
  const { data, error } = await supabase.storage.from(config.bucket).list(config.path || "", { limit: Number(config.limit) || 100 });
  if (error) throw error;
  return { files: data ?? [], count: data?.length ?? 0, bucket: config.bucket };
}

async function opCreateSignedUrl(config, supabase) {
  const miss = requireBucket(config, "createSignedUrl"); if (miss) return miss;
  if (!config.path) return { success: false, error: "Supabase createSignedUrl: 'path' is required.", skipped: true };
  const expiresIn = Number(config.expiresIn) || 3600;
  const { data, error } = await supabase.storage.from(config.bucket).createSignedUrl(config.path, expiresIn);
  if (error) throw error;
  return { signedUrl: data?.signedUrl, bucket: config.bucket, path: config.path, expiresIn };
}

async function opGetPublicUrl(config, supabase) {
  const miss = requireBucket(config, "getPublicUrl"); if (miss) return miss;
  if (!config.path) return { success: false, error: "Supabase getPublicUrl: 'path' is required.", skipped: true };
  const { data } = supabase.storage.from(config.bucket).getPublicUrl(config.path);
  return { publicUrl: data?.publicUrl, bucket: config.bucket, path: config.path };
}

async function opDeleteFile(config, supabase) {
  const miss = requireBucket(config, "deleteFile"); if (miss) return miss;
  const paths = Array.isArray(config.paths) ? config.paths : (config.path ? [config.path] : []);
  if (!paths.length) return { success: false, error: "Supabase deleteFile: 'path' is required.", skipped: true };
  const { data, error } = await supabase.storage.from(config.bucket).remove(paths);
  if (error) throw error;
  return { removed: data ?? [], count: paths.length, bucket: config.bucket };
}

export const storageOperations = {
  listBuckets: opListBuckets,
  listFiles: opListFiles,
  createSignedUrl: opCreateSignedUrl,
  getPublicUrl: opGetPublicUrl,
  deleteFile: opDeleteFile,
};
