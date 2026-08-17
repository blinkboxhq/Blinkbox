/**
 * Self-hosted liveness beacon.
 *
 * The cloud has a /heartbeat endpoint and a lastSeenAt column the dashboard
 * renders, but nothing on the instance ever called it — so every box read as
 * last seen at install time forever. This is the missing client.
 *
 * Deliberately quiet: a failed beat is not an error worth surfacing. Metering
 * already decides what an unreachable cloud means (see credit.remote.js); this
 * only reports "still here" and must never affect whether workflows run.
 */

import axios from "axios";
import { SELF_HOSTED, CLOUD_API_URL, SELF_HOST_LICENSE_KEY, BLINKBOX_TAG } from "../config/env.js";

const INTERVAL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10000;

let timer = null;

async function beat() {
  try {
    await axios.post(
      `${CLOUD_API_URL.replace(/\/$/, "")}/api/self-host/heartbeat`,
      { version: BLINKBOX_TAG },
      {
        timeout: TIMEOUT_MS,
        headers: { Authorization: `Bearer ${SELF_HOST_LICENSE_KEY}` },
      },
    );
  } catch {
    // Intentionally silent. An outage is already reported once, with context,
    // by the credit client; repeating it every five minutes only buries logs.
  }
}

export function startHeartbeat() {
  if (!SELF_HOSTED || !SELF_HOST_LICENSE_KEY || timer) return;

  // Beat immediately so a box that just came up shows as live rather than
  // sitting stale for the first five minutes.
  beat();

  timer = setInterval(beat, INTERVAL_MS);
  // Never hold the process open for a liveness ping.
  timer.unref?.();
  console.log("[SelfHost] heartbeat every 5m to", CLOUD_API_URL);
}

export function stopHeartbeat() {
  if (timer) clearInterval(timer);
  timer = null;
}
