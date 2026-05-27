/**
 * Desktop Pool — Persistent Virtual Computer Sessions
 *
 * Each session is a Docker container running:
 *   - Xvfb :99  — 1280×800 virtual display
 *   - openbox   — minimal window manager
 *   - chromium  — browser
 *   - xdotool   — mouse/keyboard control
 *   - imagemagick — screenshots
 *
 * Build the image once before using:
 *   cd apps/backend && docker build -f Dockerfile.desktop -t blinkbox-desktop:latest .
 *
 * Session lifecycle:
 *   - Created on first use, keyed by sessionId
 *   - Auto-destroyed after 30 min of inactivity
 *   - Manually closeable via closeSession()
 */

import Docker from "dockerode";

const docker = new Docker();
const DESKTOP_IMAGE = process.env.DESKTOP_IMAGE || "blinkbox-desktop:latest";
const SCREEN_W = 1280;
const SCREEN_H = 800;
const SESSION_TTL_MS = 30 * 60 * 1000;

const _sessions = new Map();

// ── Cleanup idle sessions ─────────────────────────────────────────────────────

setInterval(async () => {
  const now = Date.now();
  for (const [id, s] of _sessions) {
    if (now - s.lastUsed > SESSION_TTL_MS) {
      await _kill(s.containerId);
      _sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

async function _kill(containerId) {
  try {
    const c = docker.getContainer(containerId);
    await c.stop({ t: 0 }).catch(() => {});
    await c.remove({ force: true }).catch(() => {});
  } catch {}
}

// ── Docker exec helper — demuxes stdout/stderr ────────────────────────────────

async function _exec(containerId, cmd, timeoutMs = 30000) {
  const container = docker.getContainer(containerId);
  const execObj = await container.exec({
    Cmd: ["sh", "-c", cmd],
    AttachStdout: true,
    AttachStderr: true,
    Env: ["DISPLAY=:99", "DBUS_SESSION_BUS_ADDRESS=disabled"],
  });

  const stream = await execObj.start({ hijack: true, stdin: false });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error(`exec timeout: ${cmd.slice(0, 80)}`)), timeoutMs);

    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => {
      clearTimeout(timer);
      let stdout = "", stderr = "";
      const buf = Buffer.concat(chunks);
      let offset = 0;
      while (offset + 8 <= buf.length) {
        const type = buf[offset];
        const sz   = buf.readUInt32BE(offset + 4);
        const text = buf.slice(offset + 8, offset + 8 + sz).toString("utf8");
        if (type === 1) stdout += text;
        else if (type === 2) stderr += text;
        offset += 8 + sz;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
    stream.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// ── Session management ────────────────────────────────────────────────────────

async function _getOrCreate(sessionId, workspaceId) {
  if (_sessions.has(sessionId)) {
    const s = _sessions.get(sessionId);
    s.lastUsed = Date.now();
    return s;
  }

  try { await docker.ping(); } catch {
    throw new Error("Virtual Computer: Docker is not available on this server. Self-hosted deployment with Docker required.");
  }

  let imageExists = false;
  try { await docker.getImage(DESKTOP_IMAGE).inspect(); imageExists = true; } catch {}
  if (!imageExists) {
    throw new Error(
      `Virtual Computer: Desktop image "${DESKTOP_IMAGE}" not found. ` +
      `Build it with: cd apps/backend && docker build -f Dockerfile.desktop -t blinkbox-desktop:latest .`
    );
  }

  const container = await docker.createContainer({
    Image: DESKTOP_IMAGE,
    Labels: {
      "blinkbox.managed":    "true",
      "blinkbox.type":       "desktop",
      "blinkbox.workspace":  String(workspaceId),
      "blinkbox.created_at": String(Date.now()),
    },
    HostConfig: {
      Memory:    768 * 1024 * 1024,
      NanoCpus:  1_000_000_000,
      ShmSize:   256 * 1024 * 1024,
      AutoRemove: false,
    },
  });

  await container.start();

  // Wait for Xvfb + openbox to be ready
  await new Promise(r => setTimeout(r, 1800));

  const session = { containerId: container.id, lastUsed: Date.now() };
  _sessions.set(sessionId, session);
  return session;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function screenshot(sessionId, workspaceId) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  const { stdout, stderr } = await _exec(
    s.containerId,
    `import -window root -resize ${SCREEN_W}x${SCREEN_H} png:- 2>/dev/null | base64 -w 0`,
    15000
  );
  if (!stdout) throw new Error(`Screenshot failed${stderr ? ": " + stderr : " — display may not be ready"}`);
  return {
    screenshot: `data:image/png;base64,${stdout}`,
    width: SCREEN_W,
    height: SCREEN_H,
  };
}

export async function openUrl(sessionId, workspaceId, url) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  // Kill any existing chromium first, then open fresh
  await _exec(s.containerId, `pkill -f chromium 2>/dev/null; sleep 0.3`).catch(() => {});
  await _exec(
    s.containerId,
    `chromium-browser --no-sandbox --disable-gpu --disable-software-rasterizer ` +
    `--window-size=${SCREEN_W},${SCREEN_H} --start-maximized '${url.replace(/'/g, "\\'")}' &`
  );
  await new Promise(r => setTimeout(r, 3500));
  return screenshot(sessionId, workspaceId);
}

export async function leftClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  await _exec(s.containerId, `xdotool mousemove ${x} ${y} click 1`);
  await new Promise(r => setTimeout(r, 400));
  return screenshot(sessionId, workspaceId);
}

export async function rightClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  await _exec(s.containerId, `xdotool mousemove ${x} ${y} click 3`);
  await new Promise(r => setTimeout(r, 400));
  return screenshot(sessionId, workspaceId);
}

export async function doubleClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  await _exec(s.containerId, `xdotool mousemove ${x} ${y} click --repeat 2 --delay 100 1`);
  await new Promise(r => setTimeout(r, 400));
  return screenshot(sessionId, workspaceId);
}

export async function mouseMove(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  await _exec(s.containerId, `xdotool mousemove ${x} ${y}`);
  return screenshot(sessionId, workspaceId);
}

export async function typeText(sessionId, workspaceId, text) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  // Use clipboard for reliable unicode/special character support
  const b64 = Buffer.from(text, "utf8").toString("base64");
  await _exec(
    s.containerId,
    `echo '${b64}' | base64 -d | xclip -selection clipboard && xdotool key --clearmodifiers ctrl+v`
  );
  await new Promise(r => setTimeout(r, 300));
  return screenshot(sessionId, workspaceId);
}

export async function pressKey(sessionId, workspaceId, key) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  await _exec(s.containerId, `xdotool key --clearmodifiers '${key}'`);
  await new Promise(r => setTimeout(r, 400));
  return screenshot(sessionId, workspaceId);
}

export async function scroll(sessionId, workspaceId, x, y, direction = "down", amount = 3) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  const btn = direction === "up" ? 4 : 5;
  const safeAmount = Math.min(Math.max(Math.floor(amount), 1), 20);
  await _exec(s.containerId, `xdotool mousemove ${x} ${y} click --repeat ${safeAmount} ${btn}`);
  await new Promise(r => setTimeout(r, 300));
  return screenshot(sessionId, workspaceId);
}

export async function runCommand(sessionId, workspaceId, cmd) {
  const s = await _getOrCreate(sessionId, workspaceId);
  s.lastUsed = Date.now();
  const { stdout, stderr } = await _exec(s.containerId, cmd, 60000);
  return { stdout, stderr, exitedWith: stderr ? "stderr" : "ok" };
}

export async function closeSession(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return { closed: false, reason: "session not found" };
  await _kill(s.containerId);
  _sessions.delete(sessionId);
  return { closed: true, sessionId };
}

export function sessionInfo(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return null;
  return {
    sessionId,
    containerId: s.containerId,
    idleSecs: Math.floor((Date.now() - s.lastUsed) / 1000),
  };
}
