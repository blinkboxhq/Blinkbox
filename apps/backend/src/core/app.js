import express from "express";
import cors from "cors";
import authRoutes from "../modules/auth/auth.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import { handlePublicWebhook } from "../modules/automation/webhook.controller.js";

const app = express();

// ── Security & parsing middleware ─────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:3001").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
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
app.get("/webhook/:automationId",  handlePublicWebhook);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",  authRoutes);
app.use("/api/admin", adminRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches anything thrown with next(err) or unhandled express errors
app.use((err, req, res, _next) => {
  console.error("[Unhandled Express Error]", err.message);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
  });
});

export default app;
