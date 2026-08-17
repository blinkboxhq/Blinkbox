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
import { Queue, Worker } from "../infra/bullmq.prefixed.js";
import { Router } from "express";
import crypto from "crypto";
import { redis } from "../infra/redis.client.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, ALLOW_LOCAL_REQUESTS } from "../config/env.js";
import { assertSafeUrlResolved } from "../utils/ssrf.js";

// Stealth mode: spoofs navigator.webdriver, removes headless signals, etc.
puppeteer.use(StealthPlugin());

// Blocks the headless browser from being pointed at internal/metadata hosts.
// Mirrors httpRequest.node.js: loopback allowed only when ALLOW_LOCAL_REQUESTS.
async function guardBrowserUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error(`Virtual Computer: invalid URL "${rawUrl}"`); }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Virtual Computer: only http/https URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  const isLoopback = hostname === "localhost" || /^127\./.test(hostname) || hostname === "::1";
  if (isLoopback && ALLOW_LOCAL_REQUESTS) return;
  try {
    await assertSafeUrlResolved(rawUrl);
  } catch (err) {
    throw new Error(`Virtual Computer: ${err.message}`);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POOL_MIN             = 2;
const POOL_MAX             = 10;
const MAX_CTX_PER_BROWSER  = 5;      // contexts per browser process
const SESSION_TTL_MS       = 30 * 60_000;
const DEFAULT_TIMEOUT      = 120_000;
const NAV_TIMEOUT          = 120_000;
const ACTION_RETRIES       = 3;
const RENDER_SETTLE_MS     = 4_000;  // max wait for SPA hydration after navigation
const RATE_LIMIT_RPM       = 100;
const SCREENSHOT_QUALITY   = 80;     // JPEG, keeps sizes small (~50-100KB)

// Fixed viewport — deterministic geometry so coordinate clicks the model reads
// off a screenshot land exactly where it intends. A random width breaks the
// 1:1 mapping between screenshot pixels and click coordinates.
const SCREEN_W = 1280;
const SCREEN_H = 800;

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

// Normalise human/xdotool key names → Puppeteer key names.
const KEY_ALIASES = {
  return: "Enter", enter: "Enter", esc: "Escape", escape: "Escape",
  backspace: "Backspace", back_space: "Backspace", bksp: "Backspace",
  del: "Delete", delete: "Delete", tab: "Tab", space: "Space", spacebar: "Space",
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
  pageup: "PageUp", page_up: "PageUp", pagedown: "PageDown", page_down: "PageDown",
  home: "Home", end: "End", insert: "Insert",
};
const MOD_ALIASES = {
  ctrl: "Control", control: "Control", cmd: "Meta", meta: "Meta", super: "Meta",
  alt: "Alt", option: "Alt", shift: "Shift",
};

// Parse "ctrl+shift+k", "ctrl_a", "Return", "BackSpace" → { mods, base }.
function parseKeyCombo(raw) {
  const parts = String(raw || "Enter").split(/[+_]/).map(p => p.trim()).filter(Boolean);
  const mods = [];
  let base = "Enter";
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (MOD_ALIASES[lower] && i < parts.length - 1) { mods.push(MOD_ALIASES[lower]); continue; }
    base = KEY_ALIASES[lower] || (parts[i].length === 1 ? parts[i] : parts[i][0].toUpperCase() + parts[i].slice(1));
  }
  return { mods, base };
}

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
    this._lastDialog = null;              // last native dialog seen (surfaced in meta)
    this._lastIndex  = [];                // last read_page element index (for click_index)
  }

  async init() {
    this._entry = await pool.acquire();
    this._ctx   = await this._entry.browser.createBrowserContext();
    this._page  = await this._ctx.newPage();

    await this._wirePage(this._page);

    return this;
  }

  // Wire listeners + viewport onto a page. Reused for popups/new tabs so a
  // page opened via target=_blank behaves identically to the original.
  async _wirePage(page) {
    const ua = randUA();
    await page.setUserAgent(ua);
    await page.setViewport({ width: SCREEN_W, height: SCREEN_H });
    await page.setDefaultTimeout(DEFAULT_TIMEOUT);
    await page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    // Block fonts + media → faster loads, still screenshot-ready
    await page.setRequestInterception(true);
    page.on("request", req => {
      ["font", "media"].includes(req.resourceType()) ? req.abort() : req.continue();
    });

    // Capture (don't silently swallow) alert/confirm/prompt dialogs so the
    // agent learns one fired. We still auto-accept so execution never hangs.
    page.on("dialog", async (dlg) => {
      this._lastDialog = { type: dlg.type(), message: dlg.message(), at: Date.now() };
      try {
        if (dlg.type() === "beforeunload") await dlg.accept();
        else await dlg.accept();
      } catch { try { await dlg.dismiss(); } catch {} }
    });

    // Suppress uncaught errors on the page (don't crash the session)
    page.on("pageerror", () => {});

    // Follow popups / target=_blank: make the newest page the active one so the
    // agent doesn't get orphaned on the original tab after a link opens a new tab.
    page.on("popup", async (popup) => {
      if (!popup) return;
      try {
        await this._wirePage(popup);
        this._page = popup;
      } catch {}
    });
  }

  // ── Serial queue — all actions for this session run one-at-a-time ──────────
  _run(fn) {
    this._serial = this._serial.then(() => fn(), () => fn());
    return this._serial;
  }

  // ── Core result wrapper: retry + screenshot + structured response ───────────
  // `coordSafe` actions (raw x/y clicks) must NOT auto-scroll between retries —
  // scrolling shifts every pixel and would make the model's coordinate land
  // somewhere else. Selector-based actions may scroll since they re-resolve.
  async _exec(fn, retries = ACTION_RETRIES, { coordSafe = false } = {}) {
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
        } else if (!coordSafe && (msg.includes("not found") || msg.includes("No node"))) {
          // Selector not visible — scroll a little and retry. Skipped for
          // coordinate clicks, where scrolling would invalidate the target.
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
    const out = { url: "", title: "" };
    try { out.url = this._page.url(); out.title = await this._page.title(); } catch {}
    // Surface a dialog that fired during the last ~3s so the model knows a
    // confirm/alert/prompt was triggered (and auto-accepted) by its action.
    if (this._lastDialog && Date.now() - this._lastDialog.at < 3_000) {
      out.dialog = { type: this._lastDialog.type, message: this._lastDialog.message };
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  screenshot() {
    return this._run(() => this._exec(async () => null));
  }

  openUrl(url, waitUntil = "networkidle2") {
    let attempt = 0;
    return this._run(() => this._exec(async () => {
      // SSRF guard: the headless browser must not be steerable to cloud-metadata
      // endpoints or internal services. Resolves DNS to catch rebinding too.
      await guardBrowserUrl(url);
      // First try waits for network-idle (best for SPAs). If that times out,
      // retries fall back to domcontentloaded so a slow-to-settle page (long-
      // polling, analytics beacons) still loads instead of failing outright.
      const mode = attempt++ === 0 ? waitUntil : "domcontentloaded";
      await this._page.goto(url, { waitUntil: mode, timeout: NAV_TIMEOUT });
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
    const isCoord = target && typeof target === "object" && "x" in target;
    return this._run(() => this._exec(async () => {
      if (isCoord) {
        await this._humanMove(target.x, target.y);
        await this._page.mouse.click(target.x + rnd(-2, 2), target.y + rnd(-1, 1), { button: opts.button || "left" });
      } else {
        await this._scrollTo(target);
        await this._page.waitForSelector(target, { timeout: opts.timeout || 10_000 });
        await this._humanClick(target);
      }
      await sleep(400);
    }, ACTION_RETRIES, { coordSafe: isCoord }));
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

  // type(selector, text, { clearFirst }) — if selector is omitted/empty, types
  // at the current focus (e.g. after a click_index landed on a field).
  type(selector, text, { clearFirst = true } = {}) {
    const hasSelector = typeof selector === "string" && selector.length > 0;
    // Focus-typing form: type(text) — caller passed only one positional arg.
    const focusText = !hasSelector
      ? (typeof text === "string" ? text : (typeof selector === "string" ? selector : ""))
      : null;
    return this._run(() => this._exec(async () => {
      if (hasSelector) {
        await this._scrollTo(selector);
        await this._page.waitForSelector(selector, { timeout: 10_000 });
        if (clearFirst) await this._clearField(selector);
        await this._typeHuman(selector, String(text ?? ""));
      } else {
        await this._page.keyboard.type(String(focusText ?? ""), { delay: rnd(50, 120) });
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
      const { mods, base } = parseKeyCombo(key);
      for (const m of mods) await this._page.keyboard.down(m);
      await this._page.keyboard.press(base);
      for (const m of [...mods].reverse()) await this._page.keyboard.up(m);
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

  // ── read_page — the accuracy backbone ─────────────────────────────────────
  // Enumerates every visible, interactive element (links, buttons, inputs,
  // selects, [role], [onclick]) and returns a numbered index with each one's
  // center coordinate, tag, role, text/label, and value. The model reads this
  // list and then calls click_index/N — no pixel guessing, no ambiguity.
  // The index is cached on the session so click_index can resolve N → coords.
  readPage({ max = 120 } = {}) {
    return this._run(() => this._exec(async () => {
      const elements = await this._page.evaluate((MAX) => {
        const SEL = [
          "a[href]", "button", "input:not([type=hidden])", "textarea", "select",
          "[role=button]", "[role=link]", "[role=tab]", "[role=menuitem]",
          "[role=checkbox]", "[role=radio]", "[role=switch]", "[role=option]",
          "[onclick]", "[contenteditable=true]", "summary", "label",
        ].join(",");
        const nodes = Array.from(document.querySelectorAll(SEL));
        const seen = new Set();
        const out = [];
        const vw = window.innerWidth, vh = window.innerHeight;
        for (const el of nodes) {
          if (out.length >= MAX) break;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;            // invisible / collapsed
          if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue; // off-screen
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
          const cx = Math.round(r.left + r.width / 2);
          const cy = Math.round(r.top + r.height / 2);
          const key = `${cx},${cy},${el.tagName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          let text = (el.innerText || el.value || el.getAttribute("aria-label") ||
                      el.getAttribute("placeholder") || el.getAttribute("title") ||
                      el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 80);
          const type = el.getAttribute("type") || "";
          out.push({ tag, role, type, text, x: cx, y: cy,
                     href: tag === "a" ? (el.getAttribute("href") || "").slice(0, 120) : undefined });
        }
        return out;
      }, max).catch(() => []);

      this._lastIndex = elements;
      // Compact, model-friendly listing: "[3] button "Sign in" @ (640,420)"
      const listing = elements.map((e, i) => {
        const label = e.text || `(${e.role || e.tag})`;
        const kind = e.type ? `${e.tag}[${e.type}]` : (e.role ? `${e.tag}/${e.role}` : e.tag);
        return `[${i}] ${kind} "${label}" @ (${e.x},${e.y})`;
      }).join("\n");
      return { count: elements.length, elements, listing };
    }, 1));
  }

  // Click the Nth element from the most recent read_page index.
  clickIndex(index) {
    return this._run(() => this._exec(async () => {
      const el = this._lastIndex[index];
      if (!el) throw new Error(`click_index: no element [${index}] — call read_page first (last index had ${this._lastIndex.length} items)`);
      await this._humanMove(el.x, el.y);
      await this._page.mouse.click(el.x + rnd(-2, 2), el.y + rnd(-1, 1));
      await sleep(400);
      return { clicked: { index, text: el.text, x: el.x, y: el.y } };
    }, 1, { coordSafe: true }));
  }

  // Click the first visible element whose text matches `query` (case-insensitive).
  // Robust to dynamic layouts where selectors/coords change between loads.
  clickText(query) {
    return this._run(() => this._exec(async () => {
      const hit = await this._page.evaluate((q) => {
        const needle = q.toLowerCase().trim();
        const CAND = "a,button,[role=button],[role=link],[role=tab],[role=menuitem],input[type=submit],input[type=button],summary,label,[onclick]";
        const nodes = Array.from(document.querySelectorAll(CAND));
        const vh = window.innerHeight, vw = window.innerWidth;
        let exact = null, partial = null;
        for (const el of nodes) {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
          const t = (el.innerText || el.value || el.getAttribute("aria-label") || "").toLowerCase().trim();
          if (!t) continue;
          const c = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: t.slice(0, 80) };
          if (t === needle && !exact) exact = c;
          else if (t.includes(needle) && !partial) partial = c;
        }
        return exact || partial;
      }, query).catch(() => null);
      if (!hit) throw new Error(`click_text: no clickable element matching "${query}"`);
      await this._humanMove(hit.x, hit.y);
      await this._page.mouse.click(hit.x + rnd(-2, 2), hit.y + rnd(-1, 1));
      await sleep(400);
      return { clicked: hit };
    }, 1, { coordSafe: true }));
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
    case "type":              return args.selector
                                ? s.type(args.selector, args.text, args)
                                : s.type(args.text ?? "", undefined, args);
    case "read_page":         return s.readPage(args);
    case "click_index":       return s.clickIndex(Number(args.index));
    case "click_text":        return s.clickText(args.text || args.query || args.label);
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

// Tenant key from the authenticated identity — never trust a client-supplied
// workspaceId, or one user could drive another's browser session.
const vcTenant = (req) => req.user?.id?.toString() || req.user?.workspaceId?.toString() || "default";
// Internal session-map key is namespaced by tenant; clients only ever see their
// own raw id, so a guessed id can't reach another tenant's session.
const vcScopedSid = (wid, clientSid) => `${wid}:${clientSid}`;

// POST /api/vc/action
// Body: { sessionId?, action, ...actionArgs }
vcRouter.post("/action", async (req, res) => {
  const { sessionId, action, ...args } = req.body;
  const wid = vcTenant(req);
  const clientSid = sessionId ? String(sessionId) : `vc_${crypto.randomUUID()}`;
  const sid = vcScopedSid(wid, clientSid);
  try {
    await checkRate(wid);
    const result = await dispatchAction(sid, wid, action, args);
    res.json({ ...result, sessionId: clientSid });
  } catch (err) {
    const screenshot = await (async () => {
      const s = _sessions.get(sid);
      return s ? s._snap() : null;
    })();
    res.status(err.message.includes("Rate limit") ? 429 : 500).json({
      success: false, error: err.message, screenshot, data: null, sessionId: clientSid,
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
  const sid = vcScopedSid(vcTenant(req), req.params.id);
  const s = _sessions.get(sid);
  if (!s) return res.status(404).json({ error: "Session not found" });
  res.json({
    sessionId: req.params.id,
    idleSecs:  Math.floor((Date.now() - s.lastUsed) / 1000),
    url:       s._page?.url() ?? null,
  });
});

// DELETE /api/vc/session/:id
vcRouter.delete("/session/:id", async (req, res) => {
  res.json(await closeSession(vcScopedSid(vcTenant(req), req.params.id)));
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO NAMESPACE — /vc
// Real-time streaming: client sends "action" events, receives "result" events
// ─────────────────────────────────────────────────────────────────────────────

export function initVCSocket(io) {
  const ns = io.of("/vc");

  // Namespace middleware does not inherit the main io.use — authenticate here or
  // the /vc namespace is an open door to the headless-browser pool.
  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(String(token), JWT_SECRET);
      socket.wid = (decoded.id || decoded.workspaceId || "default").toString();
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  ns.on("connection", (socket) => {
    const wid = socket.wid;
    const clientSid = socket.handshake.query.sessionId || `vc_${crypto.randomUUID()}`;
    const sid = `${wid}:${clientSid}`;

    socket.emit("connected", { sessionId: clientSid });

    socket.on("action", async ({ action, ...args }) => {
      try {
        await checkRate(wid);
        const result = await dispatchAction(sid, wid, action, args);
        socket.emit("result", { ...result, sessionId: clientSid, action });
      } catch (err) {
        const s = _sessions.get(sid);
        const screenshot = s ? await s._snap() : null;
        socket.emit("error", { error: err.message, screenshot, sessionId: clientSid, action });
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
