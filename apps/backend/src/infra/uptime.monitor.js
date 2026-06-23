import axios from "axios";
import nodemailer from "nodemailer";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const CHECK_TIMEOUT_MS  = 10_000;

const TARGET_URL  = process.env.MONITOR_URL      || "https://blinkbox.net";
const ALERT_TO    = process.env.ALERT_EMAIL_TO   || "blinkbox.co.in@gmail.com";
const ALERT_FROM  = process.env.ALERT_EMAIL_FROM || "";
const ALERT_PASS  = process.env.ALERT_EMAIL_PASS || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

let wasDown = false; // tracks previous state to avoid repeat emails

async function composeEmail(isDown, statusCode, latencyMs) {
  if (!ANTHROPIC_KEY) {
    return isDown
      ? { subject: `🔴 ${TARGET_URL} is DOWN`, body: `Your site ${TARGET_URL} is unreachable. Check Railway logs immediately.` }
      : { subject: `✅ ${TARGET_URL} is back UP`, body: `Good news — ${TARGET_URL} is responding normally again.` };
  }

  const prompt = isDown
    ? `Write a short, professional alert email (3-4 sentences) notifying the owner that their website ${TARGET_URL} is DOWN and unreachable. Mention they should check their hosting provider. No greeting needed, start with the alert.`
    : `Write a short, professional recovery email (2-3 sentences) notifying the owner that their website ${TARGET_URL} is back UP and responding normally (latency: ${latencyMs}ms). No greeting needed, start with the good news.`;

  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 15_000,
      },
    );
    const text = res.data.content?.[0]?.text || "";
    const subject = isDown ? `🔴 Site Down: ${TARGET_URL}` : `✅ Site Recovered: ${TARGET_URL}`;
    return { subject, body: text };
  } catch {
    const subject = isDown ? `🔴 Site Down: ${TARGET_URL}` : `✅ Site Recovered: ${TARGET_URL}`;
    const body = isDown
      ? `${TARGET_URL} is DOWN. HTTP status: ${statusCode || "no response"}. Check your Railway deployment immediately.`
      : `${TARGET_URL} is back UP (latency: ${latencyMs}ms).`;
    return { subject, body };
  }
}

async function sendAlert(subject, body) {
  if (!ALERT_FROM || !ALERT_PASS) {
    console.warn("[UptimeMonitor] ALERT_EMAIL_FROM / ALERT_EMAIL_PASS not set — skipping email");
    return;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: ALERT_FROM, pass: ALERT_PASS },
  });
  await transporter.sendMail({
    from: `"Blinkbox Monitor" <${ALERT_FROM}>`,
    to: ALERT_TO,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br>")}</p><hr><small>Blinkbox Uptime Monitor — checking every 5 min</small>`,
  });
  console.log(`[UptimeMonitor] Alert sent: ${subject}`);
}

async function checkSite() {
  let isDown = false;
  let statusCode = null;
  let latencyMs = 0;

  const start = Date.now();
  try {
    const res = await axios.get(TARGET_URL, {
      timeout: CHECK_TIMEOUT_MS,
      validateStatus: () => true,
    });
    latencyMs = Date.now() - start;
    statusCode = res.status;
    isDown = res.status >= 500;
  } catch {
    isDown = true;
    latencyMs = Date.now() - start;
  }

  if (isDown && !wasDown) {
    console.warn(`[UptimeMonitor] ${TARGET_URL} is DOWN (${statusCode || "no response"})`);
    wasDown = true;
    try {
      const { subject, body } = await composeEmail(true, statusCode, latencyMs);
      await sendAlert(subject, body);
    } catch (err) {
      console.error("[UptimeMonitor] Failed to send down alert:", err.message);
    }
  } else if (!isDown && wasDown) {
    console.log(`[UptimeMonitor] ${TARGET_URL} recovered (${latencyMs}ms)`);
    wasDown = false;
    try {
      const { subject, body } = await composeEmail(false, statusCode, latencyMs);
      await sendAlert(subject, body);
    } catch (err) {
      console.error("[UptimeMonitor] Failed to send recovery alert:", err.message);
    }
  } else {
    console.log(`[UptimeMonitor] ${TARGET_URL} — ${isDown ? "still DOWN" : `OK ${latencyMs}ms`}`);
  }
}

export function startUptimeMonitor() {
  console.log(`[UptimeMonitor] Watching ${TARGET_URL} every 5 min`);
  checkSite();
  setInterval(checkSite, CHECK_INTERVAL_MS);
}
