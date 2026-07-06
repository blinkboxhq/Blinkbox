import crypto from "node:crypto";
import { SLACK_SIGNING_SECRET } from "../../config/env.js";
import { dispatchSlackEvent } from "../../infra/realtime.hub.js";

// Shared Blinkbox Slack app — Events API endpoint. One URL receives events from
// every workspace that installed the app; dispatchSlackEvent routes by team_id.
// Verified once with the platform signing secret (Basic Information → App
// Credentials), so users never paste a secret: they just "Add to Slack".
export async function handleSlackEvents(req, res) {
  // URL verification handshake — answered before any signature check.
  if (req.body?.type === "url_verification") {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  if (!SLACK_SIGNING_SECRET) {
    return res.status(503).json({ error: "Slack events not configured" });
  }

  const ts = req.headers["x-slack-request-timestamp"] || "";
  const sig = req.headers["x-slack-signature"] || "";
  if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    return res.status(401).json({ error: "Slack request timestamp too old" });
  }
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const computed = "v0=" + crypto.createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(`v0:${ts}:${rawBody.toString()}`).digest("hex");
  const sigBuf = Buffer.from(sig.padEnd(computed.length));
  const expBuf = Buffer.from(computed);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ error: "Invalid Slack signature" });
  }

  // Ack within Slack's 3s window, then fan out asynchronously.
  res.status(200).end();

  if (req.body?.type === "event_callback" && req.body.event) {
    dispatchSlackEvent(req.body.team_id, req.body.event)
      .catch((err) => console.error("[SlackEvents] dispatch error:", err.message));
  }
}
