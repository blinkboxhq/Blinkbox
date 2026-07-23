// A connected MCP server should look like itself on the canvas, and the only
// artwork every server is guaranteed to have is its favicon. Resolved through
// Google's cache rather than hitting the host directly — servers routinely sit
// behind auth that would 401 a bare /favicon.ico request.
export function faviconUrl(url, size = 64) {
  const host = hostOf(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

export function hostOf(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname || null;
  } catch {
    return null;
  }
}
