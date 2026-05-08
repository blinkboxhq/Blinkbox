import express from "express";
import nodemailer from "nodemailer";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  const { message, type = "feedback", page } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });

  const from = process.env.ALERT_EMAIL_FROM || "";
  const pass = process.env.ALERT_EMAIL_PASS || "";
  const to   = process.env.ALERT_EMAIL_TO   || "blinkbox.co.in@gmail.com";

  const user = req.user;
  const subject = `[Blinkbox Beta] ${type === "bug" ? "🐛 Bug Report" : type === "idea" ? "💡 Feature Idea" : "💬 Feedback"} from ${user.email || user.id}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#7c3aed">Blinkbox Beta Feedback</h2>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>From:</strong> ${user.email || "unknown"} (${user.id})</p>
      ${page ? `<p><strong>Page:</strong> ${page}</p>` : ""}
      <hr>
      <p style="white-space:pre-wrap">${message.trim()}</p>
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
