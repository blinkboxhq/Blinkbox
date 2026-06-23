import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import authRoutes from "../modules/auth/auth.routes.js";
import profileRoutes from "../modules/profile/profile.routes.js";
import inviteRoutes from "../modules/collab/invite.routes.js";
import brianRoutes from "../modules/brian/brian.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import automationRoutes from "../modules/automation/automation.routes.js";
import executionRoutes from "../modules/execution/execution.routes.js";
import analyticsRoutes from "../modules/execution/analytics.routes.js";
import credentialRoutes from "../modules/credentials/credential.routes.js";
import oauthRoutes from "../modules/credentials/oauth.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import feedbackRoutes from "../modules/feedback/feedback.routes.js";
import chatRoutes from "../modules/chat/chat.routes.js";
import mcpRoutes from "../modules/mcp/mcp.routes.js";
import mcpOauthRoutes from "../modules/mcp/oauth.routes.js";
import apiKeyRoutes from "../modules/mcp/apiKey.routes.js";
import { vcRouter } from "../nodes/VirtualComputer.js";
import ollamaRoutes from "../modules/ollama/ollama.routes.js";
import { handlePublicWebhook } from "../modules/automation/webhook.controller.js";
import { handleApprovalSignal } from "../modules/automation/signal.controller.js";
import { redis } from "../infra/redis.client.js";
import { MCP_HOST } from "../config/env.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const app = express();

// Read the brand mark once at boot so both api. and mcp. hosts can serve a
// favicon. These are JSON API hosts with no HTML, so connector cards and
// browsers fetch /favicon.ico directly — a 404 there is what makes the domain
// read as untrustworthy. We keep PNG variants too: many clients (including
// connector preview cards and older browsers) request /favicon.ico and refuse
// to render an SVG served under that name, so .ico must be a real raster.
// Paths are resolved from this module, not cwd.
const ASSET_DIR = join(dirname(fileURLToPath(import.meta.url)), "assets");
const FAVICON_SVG = readFileSync(join(ASSET_DIR, "blinkbox-logo.svg"));
const FAVICON_PNG_32 = readFileSync(join(ASSET_DIR, "favicon-32.png"));
const FAVICON_PNG_180 = readFileSync(join(ASSET_DIR, "favicon-180.png"));

// ── Dedicated MCP host (mcp.blinkbox.net) ─────────────────────────────────────
// higgsfield's connector works because it serves MCP at the ROOT of a dedicated
// subdomain, so its OAuth resource is a bare origin and discovery happens at the
// root well-known — the shape every chat relay handles without issue. We mirror
// that: when a request lands on MCP_HOST, the transport lives at the root
// (`/` and `/mcp`). We reuse the already-tested /api/mcp machinery by rewriting
// the path, so CORS, the compression exclusion, body parsing, the transport and
// the rawHeaders Accept fix all apply unchanged. OAuth discovery + flow paths
// (`/.well-known/*`, `/oauth/*`) are root-served and host-agnostic already, so
// they pass straight through.
const MCP_ROOT_RE = /^\/(mcp\/?)?$/; // "/", "/mcp", "/mcp/"
app.use((req, _res, next) => {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0].toLowerCase();
  if (host !== String(MCP_HOST).toLowerCase()) return next();
  const pathOnly = req.url.split("?")[0];
  const query = req.url.slice(pathOnly.length);
  if (MCP_ROOT_RE.test(pathOnly)) {
    req.url = "/api/mcp" + query;
  }
  next();
});

// ── Favicon (served on every host, before auth/CORS) ──────────────────────────
// Long cache — the brand mark rarely changes. .ico is served as a real PNG
// (clients reject SVG-under-an-.ico-name), .svg stays vector for crisp scaling,
// and apple-touch-icon covers the iOS/preview-card 180px request.
function favicon(buf, type) {
  return (_req, res) => {
    res.set("Content-Type", type);
    res.set("Cache-Control", "public, max-age=604800, immutable");
    res.send(buf);
  };
}
app.get("/favicon.ico", favicon(FAVICON_PNG_32, "image/png"));
app.get("/favicon-32.png", favicon(FAVICON_PNG_32, "image/png"));
app.get("/favicon.png", favicon(FAVICON_PNG_180, "image/png"));
app.get("/apple-touch-icon.png", favicon(FAVICON_PNG_180, "image/png"));
app.get("/apple-touch-icon-precomposed.png", favicon(FAVICON_PNG_180, "image/png"));
app.get("/favicon.svg", favicon(FAVICON_SVG, "image/svg+xml"));

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // API-only; no HTML served here
  crossOriginEmbedderPolicy: false,
}));
app.use(
  compression({
    // Never compress the MCP endpoint — its SSE responses must stream unbuffered,
    // and gzip buffering is a classic cause of connectors hanging on "connecting".
    filter: (req, res) => {
      if (req.path.startsWith("/api/mcp")) return false;
      return compression.filter(req, res);
    },
  }),
);

// ── MCP CORS ──────────────────────────────────────────────────────────────────
// Chat connectors (Claude, ChatGPT) add a server from the browser, so the
// preflight + request carry an Origin of claude.ai / openai.com that the strict
// app CORS below would reject — the connector then shows "Couldn't connect to
// the server." This layer is scoped to /api/mcp only: it reflects known chat
// origins, exposes the Streamable-HTTP session header so the browser SDK can
// read it, and allows the MCP protocol-version + auth headers on preflight.
const MCP_ORIGIN_RE =
  /^https:\/\/([a-z0-9-]+\.)*(claude\.ai|claude\.com|anthropic\.com|chatgpt\.com|openai\.com|chat\.com|x\.ai|grok\.com)$/i;

const mcpCors = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, MCP_ORIGIN_RE.test(origin.trim().replace(/\/$/, "")));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "MCP-Protocol-Version", "Accept"],
  exposedHeaders: ["Mcp-Session-Id"],
  credentials: true,
  maxAge: 86400,
});
app.use("/api/mcp", mcpCors);
app.options(/^\/api\/mcp(\/.*)?$/, mcpCors);

// The OAuth discovery + flow endpoints (served at root) are fetched by the same
// browser connectors, so they need the same permissive CORS.
const MCP_OAUTH_PATH_RE = /^\/(\.well-known\/(oauth-|openid-)|oauth\/)/;
app.use((req, res, next) => {
  if (MCP_OAUTH_PATH_RE.test(req.path)) return mcpCors(req, res, next);
  next();
});
app.options(/^\/oauth\/.*/, mcpCors);

// Body parser for the OAuth token/register endpoints, which arrive as JSON or
// application/x-www-form-urlencoded. A RegExp mount path (app.use(re, parser))
// does not reliably fire in Express 4 — it silently left req.body empty, so
// Claude's dynamic client registration came back with no client_name/redirect_uris
// and Claude rejected the connector before ever reaching /oauth/authorize. Gate
// with a function instead (same pattern as the CORS layer above) so the parser
// runs for every OAuth path. Mounted before the global parsers and strict CORS.
const oauthJson = express.json({ limit: "64kb" });
const oauthForm = express.urlencoded({ extended: true, limit: "64kb" });
app.use((req, res, next) => {
  if (!MCP_OAUTH_PATH_RE.test(req.path)) return next();
  oauthJson(req, res, (err) => (err ? next(err) : oauthForm(req, res, next)));
});
app.use("/", mcpOauthRoutes);

// 1. Clean up the origins array to destroy hidden spaces, quotes, and slashes
const rawOrigins =
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:3001,https://blinkbox.net,https://www.blinkbox.net";
const ALLOWED_ORIGINS = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/['"]/g, "").replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // 2. Allow requests with no origin (like server-to-server or Postman)
      if (!origin) return callback(null, true);

      // 3. Clean the incoming origin string just to be safe
      const cleanOrigin = origin.trim().replace(/\/$/, "");

      // Chat connectors (Claude, ChatGPT) call from their own origins. The
      // scoped mcpCors layer above already reflects them for /api/mcp and the
      // OAuth well-knowns, but their relay also touches sibling paths that fall
      // through to this strict layer — which then stripped the allow-origin
      // header and logged "[CORS Blocked] claude.ai", breaking the connector.
      // Honour the same known chat origins here so no MCP request is rejected.
      if (ALLOWED_ORIGINS.includes(cleanOrigin) || MCP_ORIGIN_RE.test(cleanOrigin)) {
        callback(null, true);
      } else {
        // 4. Log the exact mismatch to Railway console so we can see the culprit
        console.error(
          `🔴 [CORS Blocked] Browser sent: '${origin}'. Allowed list:`,
          ALLOWED_ORIGINS,
        );
        // Return false instead of throwing an Error so Express doesn't crash 500
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Preserve raw body buffer for HMAC signature verification on webhook endpoints
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Health / readiness probe ──────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  const checks = { mongo: "ok", redis: "ok" };
  let healthy = true;

  if (mongoose.connection.readyState !== 1) {
    checks.mongo = "down";
    healthy = false;
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = "down";
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || "unknown").slice(0, 7),
    ...checks,
  });
});

// ── Public webhook endpoint (no auth required) ────────────────────────────────
// Supports both POST (form/JSON payloads) and GET (query-param triggers)
app.post("/webhook/:automationId", handlePublicWebhook);
app.get("/webhook/:automationId", handlePublicWebhook);

// ── Public approval signal endpoint (no auth — the workflowId is the capability token)
// GET for one-click email links, POST for API/Slack interactive payloads
app.get("/api/automations/signal/:workflowId", handleApprovalSignal);
app.post("/api/automations/signal/:workflowId", handleApprovalSignal);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/brian", brianRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/credentials", credentialRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/vc", vcRouter);
app.use("/api/ollama", ollamaRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid ID format." });
  }
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ error: msg });
  }
  console.error("[Unhandled Express Error]", err.message);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

export default app;
