/**
 * Desktop Pool — Persistent Browser Sessions via Puppeteer
 *
 * Replaces the Docker/Xvfb approach with Puppeteer's native coordinate API:
 *   page.mouse.click(x, y)   — pixel-precise clicking
 *   page.mouse.wheel(delta)  — scrolling
 *   page.keyboard.type()     — text input
 *   page.screenshot()        — screenshots as base64
 *
 * Same public API as the Docker version — tool_virtual_computer does not change.
 *
 * Session lifecycle:
 *   - Created on first use, keyed by sessionId
 *   - Auto-destroyed after 30 min of inactivity
 *   - Manually closeable via closeSession()
 */

const SCREEN_W = 1280;
const SCREEN_H = 800;
const SESSION_TTL_MS = 30 * 60 * 1000;

const _sessions = new Map();

setInterval(async () => {
  const now = Date.now();
  for (const [id, s] of _sessions) {
    if (now - s.lastUsed > SESSION_TTL_MS) {
      await s.browser.close().catch(() => {});
      _sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

async function _getOrCreate(sessionId) {
  if (_sessions.has(sessionId)) {
    const s = _sessions.get(sessionId);
    s.lastUsed = Date.now();
    return s;
  }

  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    throw new Error("Virtual Computer: Puppeteer is not installed. Run: npm install puppeteer");
  }

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      `--window-size=${SCREEN_W},${SCREEN_H}`,
    ],
    headless: "new",
    defaultViewport: { width: SCREEN_W, height: SCREEN_H },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: SCREEN_W, height: SCREEN_H });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const session = { browser, page, lastUsed: Date.now() };
  _sessions.set(sessionId, session);
  return session;
}

async function _snap(page) {
  const b64 = await page.screenshot({ encoding: "base64" });
  return { screenshot: `data:image/png;base64,${b64}`, width: SCREEN_W, height: SCREEN_H };
}

export async function screenshot(sessionId, workspaceId) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  return _snap(s.page);
}

export async function openUrl(sessionId, workspaceId, url) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  return _snap(s.page);
}

export async function leftClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.mouse.click(x, y, { button: "left" });
  await new Promise(r => setTimeout(r, 500));
  return _snap(s.page);
}

export async function rightClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.mouse.click(x, y, { button: "right" });
  await new Promise(r => setTimeout(r, 400));
  return _snap(s.page);
}

export async function doubleClick(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.mouse.click(x, y, { button: "left", clickCount: 2 });
  await new Promise(r => setTimeout(r, 400));
  return _snap(s.page);
}

export async function mouseMove(sessionId, workspaceId, x, y) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.mouse.move(x, y);
  return _snap(s.page);
}

export async function typeText(sessionId, workspaceId, text) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.keyboard.type(text, { delay: 15 });
  await new Promise(r => setTimeout(r, 300));
  return _snap(s.page);
}

// Maps xdotool-style key names to Puppeteer key names
const KEY_MAP = {
  "Return":    "Enter",
  "ctrl+a":    ["Control", "a"],
  "ctrl+c":    ["Control", "c"],
  "ctrl+v":    ["Control", "v"],
  "ctrl+x":    ["Control", "x"],
  "ctrl+z":    ["Control", "z"],
  "ctrl+y":    ["Control", "y"],
  "ctrl+s":    ["Control", "s"],
  "ctrl+l":    ["Control", "l"],
  "ctrl+r":    ["Control", "r"],
  "ctrl+t":    ["Control", "t"],
  "ctrl+w":    ["Control", "w"],
  "ctrl+plus": ["Control", "+"],
  "ctrl+minus":["Control", "-"],
  "alt+Left":  ["Alt", "ArrowLeft"],
  "alt+Right": ["Alt", "ArrowRight"],
  "alt+F4":    ["Alt", "F4"],
};

export async function pressKey(sessionId, workspaceId, key) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  const mapped = KEY_MAP[key];
  if (Array.isArray(mapped)) {
    const [mod, char] = mapped;
    await s.page.keyboard.down(mod);
    await s.page.keyboard.press(char);
    await s.page.keyboard.up(mod);
  } else {
    await s.page.keyboard.press(mapped || key);
  }
  await new Promise(r => setTimeout(r, 400));
  return _snap(s.page);
}

export async function scroll(sessionId, workspaceId, x, y, direction = "down", amount = 3) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  await s.page.mouse.move(x, y);
  const delta = direction === "up" ? -120 * amount : 120 * amount;
  await s.page.mouse.wheel({ deltaY: delta });
  await new Promise(r => setTimeout(r, 400));
  return _snap(s.page);
}

export async function runCommand(sessionId, workspaceId, cmd) {
  const s = await _getOrCreate(sessionId);
  s.lastUsed = Date.now();
  try {
    const result = await s.page.evaluate(async (c) => {
      try { return { ok: true, value: String(eval(c)) }; }
      catch (e) { return { ok: false, error: e.message }; }
    }, cmd);
    return result.ok
      ? { stdout: result.value, stderr: "", exitedWith: "ok" }
      : { stdout: "", stderr: result.error, exitedWith: "error" };
  } catch (err) {
    return { stdout: "", stderr: err.message, exitedWith: "error" };
  }
}

export async function closeSession(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return { closed: false, reason: "session not found" };
  await s.browser.close().catch(() => {});
  _sessions.delete(sessionId);
  return { closed: true, sessionId };
}

export function sessionInfo(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return null;
  return { sessionId, idleSecs: Math.floor((Date.now() - s.lastUsed) / 1000) };
}
