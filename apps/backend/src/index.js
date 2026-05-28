import dotenv from "dotenv";
dotenv.config();

import { redis } from "./infra/redis.client.js";
import { connectDB } from "./core/database.js";
import { startServer } from "./core/server.js";

async function bootstrap() {
  try {
    console.log("BOOTSTRAP: starting");

    // 1. Connect DB
    await connectDB();

    // 2. Test Redis
    await redis.set("ping", "pong");
    const pong = await redis.get("ping");
    console.log("Redis ping:", pong);

    // 3. Pre-warm browser cluster (non-fatal)
    try {
      const { browserCluster } = await import("./core/browser.manager.js");
      console.log("Pre-warming browser cluster...");
      await browserCluster.getCluster();
    } catch (err) {
      console.warn("Puppeteer cluster pre-warm skipped:", err.message);
    }

    // 3a. Start server-side Ollama (non-fatal — skipped if ollama binary not installed)
    try {
      const { ollamaManager } = await import("./infra/ollama.manager.js");
      await ollamaManager.start();
    } catch (err) {
      console.warn("[OllamaManager] init skipped:", err.message);
    }

    // 3b. Container pool — orphan cleanup + image warming (non-fatal, skipped if Docker absent)
    try {
      const { warmImages, cleanupOrphans, scheduleOrphanScan, isDockerAvailable } = await import("./infra/container.pool.js");
      if (await isDockerAvailable()) {
        await cleanupOrphans();
        warmImages().catch((err) => console.warn("[ContainerPool] image warm error:", err.message));
        scheduleOrphanScan();
      }
    } catch (err) {
      console.warn("Container pool init skipped:", err.message);
    }

    // 4. Start Temporal worker (non-fatal — runs without Temporal in dev)
    try {
      const { startTemporalWorker } = await import("./temporal/worker.js");
      await startTemporalWorker();
    } catch (err) {
      console.warn("Temporal worker skipped:", err.message);
    }

    // 5. Start uptime monitor (non-fatal)
    try {
      const { startUptimeMonitor } = await import("./infra/uptime.monitor.js");
      startUptimeMonitor();
    } catch (err) {
      console.warn("Uptime monitor skipped:", err.message);
    }

    // 6. Start server + workers
    await startServer();

    console.log("BOOTSTRAP: server started");
  } catch (err) {
    console.error("BOOTSTRAP FAILED:", err.message);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection]", reason instanceof Error ? reason.stack : reason);
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err.stack || err.message);
  process.exit(1);
});

bootstrap();
