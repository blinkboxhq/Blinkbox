import express from "express";
import cors from "cors";
import authRoutes from "../modules/auth/auth.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import automationRoutes from "../modules/automation/automation.routes.js";
import executionRoutes from "../modules/execution/execution.routes.js";
import credentialRoutes from "../modules/credentials/credential.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import { handlePublicWebhook } from "../modules/automation/webhook.controller.js";

const app = express();

// ── Security & parsing middleware ─────────────────────────────────────────────

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

      if (ALLOWED_ORIGINS.includes(cleanOrigin)) {
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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Public webhook endpoint (no auth required) ────────────────────────────────
// Supports both POST (form/JSON payloads) and GET (query-param triggers)
app.post("/webhook/:automationId", handlePublicWebhook);
app.get("/webhook/:automationId", handlePublicWebhook);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/credentials", credentialRoutes);
app.use("/api/billing", billingRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches anything thrown with next(err) or unhandled express errors
app.use((err, req, res, _next) => {
  console.error("[Unhandled Express Error]", err.message);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
  });
});

export default app;
