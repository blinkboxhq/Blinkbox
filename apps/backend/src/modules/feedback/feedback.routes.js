import express from "express";
import nodemailer from "nodemailer";
import { verifyToken } from "../auth/auth.middleware.js";
import { redis } from "../../infra/redis.client.js";

const router = express.Router();

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function feedbackRateLimit(req, res, next) {
  try {
    const key = `bb:rl:feedback:${req.user.id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    if (count > 5) return res.status(429).json({ error: "Too many feedback submissions. Try again in an hour." });
  } catch { /* Redis down — fail open */ }
  next();
}

router.post("/", verifyToken, feedbackRateLimit, async (req, res) => {
  const { message, type = "feedback", page } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });

  const from = process.env.ALERT_EMAIL_FROM || "";
  const pass = process.env.ALERT_EMAIL_PASS || "";
  const to   = process.env.ALERT_EMAIL_TO   || "support@blinkbox.net";

  const user = req.user;
  const subject = `[Blinkbox Beta] ${type === "bug" ? "🐛 Bug Report" : type === "idea" ? "💡 Feature Idea" : "💬 Feedback"} from ${user.email || user.id}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#7c3aed">Blinkbox Beta Feedback</h2>
      <p><strong>Type:</strong> ${esc(type)}</p>
      <p><strong>From:</strong> ${esc(user.email || "unknown")} (${esc(user.id)})</p>
      ${page ? `<p><strong>Page:</strong> ${esc(page)}</p>` : ""}
      <hr>
      <p style="white-space:pre-wrap">${esc(message.trim())}</p>
    </div>
  `;

  if (from && pass) {
    try {
      const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: from, pass } });
      await transporter.sendMail({ from: `"Blinkbox Feedback" <${from}>`, to, subject, html });
    } catch (err) {
      console.error("[Feedback] Email failed:", err.message);
    }
  } else {
    console.log("[Feedback]", subject, "\n", message.trim());
  }

  res.json({ success: true });
});

export default router;
