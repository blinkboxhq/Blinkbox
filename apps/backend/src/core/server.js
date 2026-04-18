import http from "http";
import app from "./app.js";
import { startExecutionResumer } from "../modules/workers/execution.resumer.js";
import { startCursorWorker } from "../modules/workers/cursor.worker.js";
import { startWebhookWorker } from "../modules/workers/webhook.worker.js";
import { startDelayScheduler } from "../infra/delay.scheduler.js";
import { startCronScheduler } from "../infra/cron.scheduler.js";
import { startRssPoller } from "../infra/rss.poller.js";
import { startImapPoller } from "../infra/imap.poller.js";
import { startDbPoller } from "../infra/db.poller.js";
import { startGmailPoller } from "../infra/gmail.poller.js";
import { startAirtablePoller } from "../infra/airtable.poller.js";
import { startNotionPoller } from "../infra/notion.poller.js";
import { startHubSpotPoller } from "../infra/hubspot.poller.js";
import { startTelemetryFlusher } from "../modules/telemetry/telemetry.flusher.js";
import { startPayloadFlusher } from "../infra/payload.flusher.js";
import { warmPool as warmIsolatePool } from "../infra/isolate.pool.js";
import { initSocketServer } from "../infra/socket.server.js";

export async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Create HTTP server and attach Socket.io
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  // 1. Start BullMQ cursor worker
  await startCursorWorker();

  // 2. Start BullMQ webhook worker (shock absorber)
  await startWebhookWorker();

  // 3. Start delay scheduler (Redis Sorted Sets)
  startDelayScheduler();

  // 4. Start cron scheduler (BullMQ repeatable jobs)
  await startCronScheduler();

  // 4a. Start RSS feed poller
  await startRssPoller();

  // 4b. Start IMAP email poller
  await startImapPoller();

  // 4c. Start database row poller
  await startDbPoller();

  // 4d. Start integration pollers (Gmail, Airtable, Notion, HubSpot)
  await startGmailPoller();
  await startAirtablePoller();
  await startNotionPoller();
  await startHubSpotPoller();

  // 5. Start crash recovery resumer
  startExecutionResumer();

  // 6. Start telemetry flusher (Redis → MongoDB batch insert)
  startTelemetryFlusher();

  // 7. Start payload flusher (Redis → MongoDB for vault blobs)
  startPayloadFlusher();

  // 8. Pre-warm isolate pool for code node execution
  warmIsolatePool();

  // 9. Start HTTP + WebSocket server
  httpServer.listen(PORT, () => {
    console.log(`BlinkBox API online on Port ${PORT} (PID: ${process.pid})`);
  });
}
