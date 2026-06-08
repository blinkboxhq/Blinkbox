/**
 * VirtualComputer.js — Production Browser Automation Engine
 *
 * Architecture:
 *   BrowserPool    → manages 2-10 Chromium processes, auto-restarts on crash
 *   VCSession      → per-session browser context, serial action queue, retry
 *   SessionMap     → 30-min TTL store keyed by sessionId
 *   ActionQueue    → BullMQ worker (20 concurrent, 100 req/min per workspace)
 *   vcRouter       → Express REST API at /api/vc/*
 *   initVCSocket   → Socket.IO /vc namespace for real-time streaming
 *
 * Usage (agent tool):
 *   import { dispatchAction } from "./VirtualComputer.js";
 *   const result = await dispatchAction(sessionId, workspaceId, "open_url", { url: "https://..." });
 *
 * Usage (REST):
 *   POST /api/vc/action { sessionId, action, url, ... }
 *
 * Build once, reuse always. Sessions survive across tool calls within one
 * execution (pass the same sessionId). Browser pool stays warm between runs.
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Queue, Worker } from "bullmq";
import { Router } from "express";
import crypto from "crypto";
import { redis } from "../infra/redis.client.js";

// Stealth mode: spoofs navigator.webdriver, removes headless signals, etc.
puppeteer.use(StealthPlugin());

// ─── Constants ────────────────────────────────────────────────────────────────

const POOL_MIN             = 2;
const POOL_MAX             = 10;
const MAX_CTX_PER_BROWSER  = 5;      // contexts per browser process
const SESSION_TTL_MS       = 30 * 60_000;
const DEFAULT_TIMEOUT      = 30_000;
const NAV_TIMEOUT          = 60_000;
const ACTION_RETRIES       = 3;
const RENDER_SETTLE_MS     = 4_000;  // max wait for SPA hydration after navigation
const RATE_LIMIT_RPM       = 100;
const SCREENSHOT_QUALITY   = 80;     // JPEG, keeps sizes small (~50-100KB)

const SCREEN_W = () => 1280 + Math.floor(Math.random() * 640); // 1280–1920
const SCREEN_H = 900;

// Rotated on every new session — covers Chrome, Firefox, Edge, Mac/Windows/Linux
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
];

// Chromium flags: no sandbox (container-safe), no GPU, anti-detection
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=TranslateUI,site-per-process",
  "--disable-blink-features=AutomationControlled",  // hides headless marker
  "--disable-infobars",
  "--no-first-run",
  "--no-default-browser-check",
  "--allow-running-insecure-content",
  "--ignore-certificate-errors",
  "--password-store=basic",
  "--use-mock-keychain",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep   = (ms) => new Promise(r => setTimeout(r, ms));
const rnd     = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const randUA  = () => USER_AGENTS[rnd(0, USER_AGENTS.length - 1)];

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER POOL
// Up to POOL_MAX browsers, up to MAX_CTX_PER_BROWSER contexts each.
// Crash → exponential-backoff restart → auto-replenish to POOL_MIN.
// ─────────────────────────────────────────────────────────────────────────────

class BrowserPool {
  constructor() {
    this._pool    = new Map(); // id → entry
    this._nextId  = 0;
    this._ready   = false;
  }

  async ensureReady() {
    if (this._ready) return;
    this._ready = true;
    for (let i = 0; i < POOL_MIN; i++) {
      await this._spawn().catch(err => console.warn("[VC:Pool] Warm-up failed:", err.message));
    }
    setInterval(() => this._healthCheck(), 60_000);
  }

  async _spawn(backoff = 1_000) {
    const id      = ++this._nextId;
    const browser = await puppeteer.launch({
      headless: true,
      args: LAUNCH_ARGS,
      ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=IdleDetection"],
    });

    const entry = { id, browser, ctxCount: 0, healthy: true, backoff };
    this._pool.set(id, entry);

    browser.once("disconnected", async () => {
      console.warn(`[VC:Pool] Browser #${id} crashed — retrying in ${entry.backoff}ms`);
      entry.healthy = false;
      this._pool.delete(id);
      await sleep(entry.backoff);
      if (this._totalContexts() < POOL_MIN * MAX_CTX_PER_BROWSER) {
        await this._spawn(Math.min(entry.backoff * 2, 30_000)).catch(() => {});
      }
    });

    return entry;
  }

  // Return a browser entry that can host another context (or create a new browser)
  async acquire() {
    await this.ensureReady();

    for (const entry of this._pool.values()) {
      if (entry.healthy && entry.ctxCount < MAX_CTX_PER_BROWSER) {
        entry.ctxCount++;
        return entry;
      }
    }

    if (this._totalContexts() >= POOL_MAX * MAX_CTX_PER_BROWSER) {
      throw new Error("Virtual Computer: browser pool is at capacity. Try again shortly.");
    }

    const entry = await this._spawn();
    entry.ctxCount++;
    return entry;
  }

  release(entry) {
    if (entry && this._pool.has(entry.id)) {
      entry.ctxCount = Math.max(0, entry.ctxCount - 1);
    }
  }

  async _healthCheck() {
    for (const [id, e] of this._pool) {
      if (!e.browser.isConnected()) {
        e.healthy = false;
        this._pool.delete(id);
      }
    }
    while (this._pool.size < POOL_MIN) {
      await this._spawn().catch(() => {});
    }
  }

  _totalContexts() {
    return [...this._pool.values()].reduce((n, e) => n + e.ctxCount, 0);
  }

  status() {
    return {
      browsers: this._pool.size,
      healthy:  [...this._pool.values()].filter(e => e.healthy).length,
      contexts: this._totalContexts(),
      capacity: POOL_MAX * MAX_CTX_PER_BROWSER,
    };
  }

  async shutdown() {
    for (const e of this._pool.values()) {
      await e.browser.close().catch(() => {});
    }
    this._pool.clear();
  }
}

// Singleton pool — shared across all sessions
export const pool = new BrowserPool();

// ─────────────────────────────────────────────────────────────────────────────
// VC SESSION
// One browser context + page per session.
// Actions are serialised within a session (serial queue) but different
// sessions execute in parallel.
// ─────────────────────────────────────────────────────────────────────────────

class VCSession {
  constructor(sessionId, workspaceId) {
    this.sessionId   = sessionId;
    this.workspaceId = workspaceId;
    this.lastUsed    = Date.now();
    this._entry      = null;
    this._ctx        = null;
    this._page       = null;
    this._serial     = Promise.resolve(); // serial action queue
  }

  async init() {
    this._entry = await pool.acquire();
    this._ctx   = await this._entry.browser.createBrowserContext();
    this._page  = await this._ctx.newPage();

    const ua = randUA();
    const w  = SCREEN_W();
    await this._page.setUserAgent(ua);
    await this._page.setViewport({ width: w, height: SCREEN_H });
    await this._page.setDefaultTimeout(DEFAULT_TIMEOUT);
    await this._page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    // Block fonts + media → faster loads, still screenshot-ready
    await this._page.setRequestInterception(true);
    this._page.on("request", req => {
      ["font", "media"].includes(req.resourceType()) ? req.abort() : req.continue();
    });

    // Auto-dismiss alert/confirm/prompt dialogs
    this._page.on("dialog", dlg => dlg.dismiss().catch(() => {}));

    // Suppress uncaught errors on the page (don't crash the session)
    this._page.on("pageerror", () => {});

    return this;
  }

  // ── Serial queue — all actions for this session run one-at-a-time ──────────
  _run(fn) {
    this._serial = this._serial.then(() => fn(), () => fn());
    return this._serial;
  }

  // ── Core result wrapper: retry + screenshot + structured response ───────────
  async _exec(fn, retries = ACTION_RETRIES) {
    this.lastUsed = Date.now();
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const data       = await fn();
        const screenshot = await this._snap();
        const meta       = await this._meta();
        return { success: true, data: data ?? null, screenshot, error: null, ...meta };
      } catch (err) {
        lastErr = err;

        // Classify error and decide retry strategy
        const msg = err.message || "";
        if (msg.includes("Navigation timeout") || msg.includes("net::ERR")) {
          await sleep(2_000 * Math.pow(2, attempt));
        } else if (msg.includes("not found") || msg.includes("No node")) {
          // Element not visible — scroll and retry
          await this._page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
          await sleep(1_000);
        } else {
          await sleep(800 * Math.pow(2, attempt));
        }
      }
    }
    // All retries exhausted — still return screenshot for debugging
    const screenshot = await this._snap();
    const meta       = await this._meta().catch(() => ({ url: "", title: "" }));
    return { success: false, data: null, screenshot, error: lastErr?.message || "Action failed", ...meta };
  }

  // ── Screenshot (JPEG for size) ─────────────────────────────────────────────
  async _snap() {
    try {
      const b64 = await this._page.screenshot({ encoding: "base64", type: "jpeg", quality: SCREENSHOT_QUALITY });
      return `data:image/jpeg;base64,${b64}`;
    } catch { return null; }
  }

  async _meta() {
    try { return { url: this._page.url(), title: await this._page.title() }; }
    catch { return { url: "", title: "" }; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  screenshot() {
    return this._run(() => this._exec(async () => null));
  }

  openUrl(url, waitUntil = "networkidle2") {
    return this._run(() => this._exec(async () => {
      await this._page.goto(url, { waitUntil, timeout: NAV_TIMEOUT });
      // SPAs (React/Vue/etc.) often finish "networkidle" before their JS has
      // mounted and painted — capturing right away yields an empty root div.
      // Poll briefly for visible body content so screenshots/get_html reflect
      // the rendered page, not the pre-hydration shell.
      await this._page.waitForFunction(
        () => document.body && document.body.innerText.trim().length > 0,
        { timeout: RENDER_SETTLE_MS }
      ).catch(() => {});
    }));
  }

  // target: CSS selector string OR { x, y } pixel coords
  click(target, opts = {}) {
    return this._run(() => this._exec(async () => {
      if (target && typeof target === "object" && "x" in target) {
        await this._humanMove(target.x, target.y);
        await this._page.mouse.click(target.x + rnd(-2, 2), target.y + rnd(-1, 1), { button: opts.button || "left" });
      } else {
        await this._scrollTo(target);
        await this._page.waitForSelector(target, { timeout: opts.timeout || 10_000 });
        await this._humanClick(target);
      }
      await sleep(400);
    }));
  }

  rightClick(x, y) {
    return this._run(() => this._exec(async () => {
      await this._humanMove(x, y);
      await this._page.mouse.click(x, y, { button: "right" });
      await sleep(300);
    }));
  }

  doubleClick(x, y) {
    return this._run(() => this._exec(async () => {
      await this._humanMove(x, y);
      await this._page.mouse.click(x, y, { clickCount: 2 });
      await sleep(300);
    }));
  }

  mouseMove(x, y) {
    return this._run(() => this._exec(async () => {
      await this._humanMove(x, y);
    }));
  }

  // type(selector, text, { clearFirst }) — selector optional (types at focus)
  type(selector, text, { clearFirst = true } = {}) {
    const hasSelector = text !== undefined;
    return this._run(() => this._exec(async () => {
      if (hasSelector) {
        await this._scrollTo(selector);
        await this._page.waitForSelector(selector, { timeout: 10_000 });
        if (clearFirst) await this._clearField(selector);
        await this._typeHuman(selector, text);
      } else {
        // Type at current focus (selector is actually the text)
        await this._page.keyboard.type(selector, { delay: rnd(50, 120) });
      }
    }));
  }

  scroll(direction = "down", amount = 3, x, y) {
    return this._run(() => this._exec(async () => {
      if (x != null && y != null) await this._page.mouse.move(x, y);
      const delta = direction === "up" ? -120 * amount : 120 * amount;
      await this._page.mouse.wheel({ deltaY: delta });
      await sleep(300);
    }));
  }

  waitForSelector(selector, timeout = DEFAULT_TIMEOUT) {
    return this._run(() => this._exec(async () => {
      await this._page.waitForSelector(selector, { timeout, visible: true });
    }, 1)); // no retry on explicit wait
  }

  // evaluate: runs JS in page context, returns serialisable result
  evaluate(jsCode) {
    return this._run(() => this._exec(async () => {
      return this._page.evaluate(jsCode);
    }, 1));
  }

  getHtml(selector) {
    return this._run(() => this._exec(async () => {
      if (selector) return this._page.$eval(selector, el => el.outerHTML).catch(() => null);
      const html = await this._page.evaluate(() => document.documentElement.outerHTML);
      return html.slice(0, 200_000); // 200KB cap
    }, 1));
  }

  getText(selector) {
    return this._run(() => this._exec(async () => {
      if (selector) return this._page.$eval(selector, el => el.innerText).catch(() => null);
      return this._page.evaluate(() => document.body.innerText);
    }, 1));
  }

  hover(selector) {
    return this._run(() => this._exec(async () => {
      await this._scrollTo(selector);
      await this._page.waitForSelector(selector, { timeout: 10_000 });
      await this._page.hover(selector);
      await sleep(200);
    }));
  }

  selectDropdown(selector, value) {
    return this._run(() => this._exec(async () => {
      await this._page.waitForSelector(selector, { timeout: 10_000 });
      await this._page.select(selector, value);
    }));
  }

  uploadFile(selector, filePath) {
    return this._run(() => this._exec(async () => {
      const el = await this._page.$(selector);
      if (!el) throw new Error(`upload_file: element not found "${selector}"`);
      await el.uploadFile(filePath);
      await sleep(500);
    }, 1));
  }

  pressKey(key) {
    return this._run(() => this._exec(async () => {
      // Map xdotool/human-readable names to Puppeteer key names
      const MAP = {
        Return: "Enter", ctrl_a: ["Control","a"], ctrl_c: ["Control","c"],
        ctrl_v: ["Control","v"], ctrl_x: ["Control","x"], ctrl_z: ["Control","z"],
        ctrl_s: ["Control","s"], ctrl_l: ["Control","l"], ctrl_r: ["Control","r"],
        "ctrl+a": ["Control","a"], "ctrl+c": ["Control","c"], "ctrl+v": ["Control","v"],
        "ctrl+s": ["Control","s"], "ctrl+l": ["Control","l"], "ctrl+z": ["Control","z"],
        "alt+Left":  ["Alt","ArrowLeft"],  "alt+Right": ["Alt","ArrowRight"],
        "shift+Tab": ["Shift","Tab"],
      };
      const mapped = MAP[key];
      if (Array.isArray(mapped)) {
        const [mod, char] = mapped;
        await this._page.keyboard.down(mod);
        await this._page.keyboard.press(char);
        await this._page.keyboard.up(mod);
      } else {
        await this._page.keyboard.press(mapped || key);
      }
      await sleep(300);
    }));
  }

  wait(ms) {
    return this._run(() => this._exec(async () => {
      await sleep(Math.min(ms || 1_000, 60_000));
    }, 1));
  }

  navigate(direction) {
    return this._run(() => this._exec(async () => {
      const opts = { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT };
      if (direction === "back")    await this._page.goBack(opts);
      else if (direction === "forward") await this._page.goForward(opts);
      else if (direction === "reload")  await this._page.reload(opts);
    }));
  }

  // Smart form filler — finds field by label text, placeholder, name, id, aria-label
  fillField(query, value, { clearFirst = true } = {}) {
    return this._run(() => this._exec(async () => {
      const selector = await this._findField(query);
      if (!selector) throw new Error(`fill_field: could not find input matching "${query}"`);
      if (clearFirst) await this._clearField(selector);
      await this._typeHuman(selector, value);
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  // Find a form field by label/placeholder/name/id/aria-label
  async _findField(query) {
    const q = query.replace(/"/g, '\\"');
    const exactSelectors = [
      `input[name="${q}"]`, `textarea[name="${q}"]`,
      `input[id="${q}"]`,   `textarea[id="${q}"]`,
      `[name="${q}"]`,
    ];
    const fuzzySelectors = [
      `input[placeholder*="${q}" i]`, `textarea[placeholder*="${q}" i]`,
      `[aria-label*="${q}" i]`,       `input[data-testid*="${q}" i]`,
    ];
    for (const sel of [...exactSelectors, ...fuzzySelectors]) {
      try {
        const el = await this._page.$(sel);
        if (el) return sel;
      } catch {}
    }
    // XPath: find label containing text → following input
    // Uses evaluate() to avoid deprecated page.$x() in Puppeteer v22+
    const foundSel = await this._page.evaluate((q) => {
      const lower = q.toLowerCase();
      const xpath = `//label[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${lower}')]/following::input[1]`;
      const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (!el) return null;
      if (el.id)   return `#${CSS.escape(el.id)}`;
      if (el.name) return `[name="${el.name}"]`;
      return null;
    }, query);
    return foundSel || null;
  }

  // Clear a field: set .value + dispatch React/Vue/Angular events + select-all-delete
  async _clearField(selector) {
    await this._page.$eval(selector, el => {
      const nativeInput = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(el), "value"
      );
      if (nativeInput?.set) nativeInput.set.call(el, "");
      el.value = "";
      el.dispatchEvent(new Event("input",  { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }).catch(() => {});
    // Fallback for inputs that ignore programmatic changes (e.g. strict React)
    await this._page.click(selector).catch(() => {});
    await this._page.keyboard.down("Control");
    await this._page.keyboard.press("a");
    await this._page.keyboard.up("Control");
    await this._page.keyboard.press("Backspace");
  }

  // Human-like typing: variable per-char delay, occasional micro-pauses
  async _typeHuman(selector, text) {
    await this._page.click(selector).catch(() => {});
    for (const char of text) {
      await this._page.keyboard.type(char, { delay: rnd(50, 130) });
      if (Math.random() < 0.04) await sleep(rnd(80, 220)); // occasional pause
    }
  }

  // Realistic mouse movement: curved path with jitter toward target
  async _humanMove(tx, ty) {
    const { x: sx, y: sy } = await this._page.evaluate(() => ({
      x: window.innerWidth  / 2 + (Math.random() - 0.5) * 20,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 20,
    })).catch(() => ({ x: tx - 50, y: ty - 50 }));
    const STEPS = 6 + rnd(0, 4);
    for (let i = 1; i <= STEPS; i++) {
      const t  = i / STEPS;
      // Ease-in-out cubic + slight lateral wobble
      const et = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      await this._page.mouse.move(
        Math.round(sx + (tx - sx) * et + rnd(-4, 4)),
        Math.round(sy + (ty - sy) * et + rnd(-3, 3))
      );
      await sleep(rnd(6, 20));
    }
  }

  // Click a selector via its center coordinates (more natural than page.click)
  async _humanClick(selector) {
    const box = await this._page.$eval(selector, el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }).catch(() => null);
    if (box && box.w > 0 && box.h > 0) {
      await this._humanMove(box.x, box.y);
      await this._page.mouse.click(
        box.x + rnd(-Math.floor(box.w * 0.1), Math.floor(box.w * 0.1)),
        box.y + rnd(-Math.floor(box.h * 0.1), Math.floor(box.h * 0.1))
      );
    } else {
      await this._page.click(selector);
    }
  }

  // Scroll a selector into the viewport before interacting
  async _scrollTo(selector) {
    if (!selector || typeof selector !== "string") return;
    await this._page.$eval(selector, el =>
      el.scrollIntoView({ behavior: "instant", block: "center" })
    ).catch(() => {});
    await sleep(80);
  }

  async dispose() {
    try {
      await this._page?.close().catch(() => {});
      await this._ctx?.close().catch(() => {});
    } finally {
      pool.release(this._entry);
      this._page  = null;
      this._ctx   = null;
      this._entry = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MAP — TTL 30 min, swept every 5 min
// ─────────────────────────────────────────────────────────────────────────────

const _sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of _sessions) {
    if (now - s.lastUsed > SESSION_TTL_MS) {
      s.dispose().catch(() => {});
      _sessions.delete(id);
    }
  }
}, 5 * 60_000);

async function getOrCreate(sessionId, workspaceId) {
  if (_sessions.has(sessionId)) {
    const s = _sessions.get(sessionId);
    s.lastUsed = Date.now();
    return s;
  }
  const session = await new VCSession(sessionId, workspaceId).init();
  _sessions.set(sessionId, session);
  return session;
}

export async function closeSession(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return { closed: false, reason: "session not found" };
  await s.dispose();
  _sessions.delete(sessionId);
  return { closed: true, sessionId };
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER — sliding 1-minute window per workspace, stored in Redis
// ─────────────────────────────────────────────────────────────────────────────

async function checkRate(workspaceId) {
  const key   = `vc:rl:${workspaceId}:${Math.floor(Date.now() / 60_000)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 70);
  if (count > RATE_LIMIT_RPM)
    throw new Error(`Rate limit: max ${RATE_LIMIT_RPM} VC requests/min per workspace`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION DISPATCHER — maps action name → VCSession method
// Called by tool_virtual_computer, REST API, and Socket.IO handler
// ─────────────────────────────────────────────────────────────────────────────

export async function dispatchAction(sessionId, workspaceId, action, args = {}) {
  const s = await getOrCreate(sessionId, workspaceId);

  switch (action) {
    case "screenshot":        return s.screenshot();
    case "open_url":          return s.openUrl(args.url, args.waitUntil);
    case "click":             return s.click(
                                args.selector
                                  ? args.selector
                                  : args.x != null ? { x: args.x, y: args.y } : null,
                                args
                              );
    case "right_click":       return s.rightClick(args.x, args.y);
    case "double_click":      return s.doubleClick(args.x, args.y);
    case "mouse_move":        return s.mouseMove(args.x, args.y);
    case "type":              return s.type(args.selector, args.text, args);
    case "scroll":            return s.scroll(args.direction, args.amount, args.x, args.y);
    case "wait_for_selector": return s.waitForSelector(args.selector, args.timeout);
    case "evaluate":          return s.evaluate(args.code || args.js || args.text || "null");
    case "get_html":          return s.getHtml(args.selector);
    case "get_text":          return s.getText(args.selector);
    case "hover":             return s.hover(args.selector);
    case "select_dropdown":   return s.selectDropdown(args.selector, args.value);
    case "upload_file":       return s.uploadFile(args.selector, args.filePath);
    case "press_key":         return s.pressKey(args.key || args.text);
    case "key":               return s.pressKey(args.key || args.text);
    case "wait":              return s.wait(args.ms);
    case "fill_field":        return s.fillField(args.query || args.label, args.value || args.text, args);
    case "navigate":          return s.navigate(args.direction);
    case "back":              return s.navigate("back");
    case "forward":           return s.navigate("forward");
    case "reload":            return s.navigate("reload");
    case "close":             return closeSession(sessionId);
    default:                  throw new Error(`Unknown VC action: "${action}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BULLMQ ACTION QUEUE
// Concurrent across sessions (concurrency=20), rate-limited globally.
// Used by REST API. Agent tool uses dispatchAction() directly (no queue overhead).
// ─────────────────────────────────────────────────────────────────────────────

const VC_QUEUE_NAME = "vc:actions";
let _vcQueue  = null;
let _vcWorker = null;

export function initVCQueue() {
  const connOpts = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: null, // required by BullMQ
  };

  _vcQueue = new Queue(VC_QUEUE_NAME, { connection: connOpts });

  _vcWorker = new Worker(VC_QUEUE_NAME, async (job) => {
    const { sessionId, workspaceId, action, args } = job.data;
    return dispatchAction(sessionId, workspaceId, action, args);
  }, {
    connection: { ...connOpts },
    concurrency: 20,
  });

  _vcWorker.on("failed", (job, err) => {
    console.error(`[VC:Queue] Job ${job?.id} failed:`, err.message);
  });

  return { queue: _vcQueue, worker: _vcWorker };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS REST ROUTER — /api/vc/*
// ─────────────────────────────────────────────────────────────────────────────

export const vcRouter = Router();

// POST /api/vc/action
// Body: { sessionId?, workspaceId?, action, ...actionArgs }
vcRouter.post("/action", async (req, res) => {
  const { sessionId, workspaceId, action, ...args } = req.body;
  const sid = sessionId || `vc_${crypto.randomUUID()}`;
  const wid = workspaceId || req.user?.workspaceId?.toString() || "default";
  try {
    await checkRate(wid);
    const result = await dispatchAction(sid, wid, action, args);
    res.json({ ...result, sessionId: sid });
  } catch (err) {
    const screenshot = await (async () => {
      const s = _sessions.get(sid);
      return s ? s._snap() : null;
    })();
    res.status(err.message.includes("Rate limit") ? 429 : 500).json({
      success: false, error: err.message, screenshot, data: null, sessionId: sid,
    });
  }
});

// GET /api/vc/health
vcRouter.get("/health", (_req, res) => {
  res.json({
    pool:     pool.status(),
    sessions: _sessions.size,
    queue:    _vcQueue ? "active" : "direct",
  });
});

// GET /api/vc/session/:id
vcRouter.get("/session/:id", (req, res) => {
  const s = _sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: "Session not found" });
  res.json({
    sessionId: req.params.id,
    idleSecs:  Math.floor((Date.now() - s.lastUsed) / 1000),
    url:       s._page?.url() ?? null,
  });
});

// DELETE /api/vc/session/:id
vcRouter.delete("/session/:id", async (req, res) => {
  res.json(await closeSession(req.params.id));
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO NAMESPACE — /vc
// Real-time streaming: client sends "action" events, receives "result" events
// ─────────────────────────────────────────────────────────────────────────────

export function initVCSocket(io) {
  const ns = io.of("/vc");

  ns.on("connection", (socket) => {
    const sid = socket.handshake.query.sessionId || `vc_${crypto.randomUUID()}`;
    const wid = socket.handshake.query.workspaceId || "default";

    socket.emit("connected", { sessionId: sid });

    socket.on("action", async ({ action, ...args }) => {
      try {
        await checkRate(wid);
        const result = await dispatchAction(sid, wid, action, args);
        socket.emit("result", { ...result, sessionId: sid, action });
      } catch (err) {
        const s = _sessions.get(sid);
        const screenshot = s ? await s._snap() : null;
        socket.emit("error", { error: err.message, screenshot, sessionId: sid, action });
      }
    });

    socket.on("close_session", async () => {
      await closeSession(sid);
      socket.emit("closed", { sessionId: sid });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// desktop.pool.js COMPATIBLE API
// Keeps existing tool_virtual_computer import chain working unchanged
// ─────────────────────────────────────────────────────────────────────────────

export async function screenshot(sessionId, workspaceId) {
  return (await getOrCreate(sessionId, workspaceId)).screenshot();
}

export async function openUrl(sessionId, workspaceId, url) {
  return (await getOrCreate(sessionId, workspaceId)).openUrl(url);
}

export async function leftClick(sessionId, workspaceId, x, y) {
  return (await getOrCreate(sessionId, workspaceId)).click({ x, y });
}

export async function rightClick(sessionId, workspaceId, x, y) {
  return (await getOrCreate(sessionId, workspaceId)).rightClick(x, y);
}

export async function doubleClick(sessionId, workspaceId, x, y) {
  return (await getOrCreate(sessionId, workspaceId)).doubleClick(x, y);
}

export async function mouseMove(sessionId, workspaceId, x, y) {
  return (await getOrCreate(sessionId, workspaceId)).mouseMove(x, y);
}

export async function typeText(sessionId, workspaceId, text) {
  const s = await getOrCreate(sessionId, workspaceId);
  return s.type(text); // no selector = type at current focus
}

export async function pressKey(sessionId, workspaceId, key) {
  return (await getOrCreate(sessionId, workspaceId)).pressKey(key);
}

export async function scroll(sessionId, workspaceId, x, y, direction = "down", amount = 3) {
  return (await getOrCreate(sessionId, workspaceId)).scroll(direction, amount, x, y);
}

export async function runCommand(sessionId, workspaceId, cmd) {
  return (await getOrCreate(sessionId, workspaceId)).evaluate(cmd);
}

export { getOrCreate as getOrCreateSession };

export function sessionInfo(sessionId) {
  const s = _sessions.get(sessionId);
  if (!s) return null;
  return { sessionId, idleSecs: Math.floor((Date.now() - s.lastUsed) / 1000) };
}
