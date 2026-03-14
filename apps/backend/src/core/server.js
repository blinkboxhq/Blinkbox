import http from "http";
import app from "./app.js";
import { startExecutionResumer } from "../modules/workers/execution.resumer.js";
import { startCursorWorker } from "../modules/workers/cursor.worker.js";
import { startDelayScheduler } from "../infra/delay.scheduler.js";
import { startCronScheduler } from "../infra/cron.scheduler.js";
import { startTelemetryFlusher } from "../modules/telemetry/telemetry.flusher.js";
import { initSocketServer } from "../infra/socket.server.js";
import automationRoutes from "../modules/automation/automation.routes.js";
import executionRoutes from "../modules/execution/execution.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import credentialRoutes from "../modules/credentials/credential.routes.js";

app.use("/api/automation", automationRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/credentials", credentialRoutes);

export async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Create HTTP server and attach Socket.io
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  // 1. Start BullMQ cursor worker
  await startCursorWorker();

  // 2. Start delay scheduler (Redis Sorted Sets)
  startDelayScheduler();

  // 3. Start cron scheduler (BullMQ repeatable jobs)
  await startCronScheduler();

  // 4. Start crash recovery resumer
  startExecutionResumer();

  // 5. Start telemetry flusher (Redis → MongoDB batch insert)
  startTelemetryFlusher();

  // 6. Start HTTP + WebSocket server
  httpServer.listen(PORT, () => {
    console.log(`BlinkBox API online on Port ${PORT} (PID: ${process.pid})`);
  });
}
