import dotenv from "dotenv";
dotenv.config();

// These three are loaded inside bootstrap(), not here. In managed self-host mode
// the Mongo and Redis credentials do not exist until primeManagedStorage() has
// fetched them, and config/env.js — which redis.client.js pulls in — freezes
// process.env into consts the first time it is imported. A static import at the
// top of this file would therefore capture the placeholder URIs compose hands
// down and connect to nothing.
import { primeManagedStorage } from "./infra/selfhost.bootstrap.js";

async function bootstrap() {
  try {
    console.log("BOOTSTRAP: starting");

    // 0. Lease tenant-scoped storage credentials (no-op on cloud / local mode)
    await primeManagedStorage();

    const { redis } = await import("./infra/redis.client.js");
    const { connectDB } = await import("./core/database.js");
    const { startServer } = await import("./core/server.js");

    // 1. Connect DB
    await connectDB();

    // 2. Test Redis
    await redis.set("ping", "pong");
    const pong = await redis.get("ping");
    console.log("Redis ping:", pong);

    // 3. Pre-warm browser cluster in background (non-blocking — lazy init on first scrape if Chrome absent)
    import("./core/browser.manager.js").then(({ browserCluster }) => {
      browserCluster.getCluster().catch((err) =>
        console.warn("Puppeteer cluster pre-warm skipped:", err.message)
      );
    }).catch(() => {});

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

    // 6. Start weekly usage digest (non-fatal)
    try {
      const { startWeeklyDigest } = await import("./infra/digest.scheduler.js");
      startWeeklyDigest();
    } catch (err) {
      console.warn("Weekly digest skipped:", err.message);
    }

    // 6b. Self-hosted liveness beacon (no-op on cloud)
    try {
      const { startHeartbeat } = await import("./infra/selfhost.heartbeat.js");
      startHeartbeat();
    } catch (err) {
      console.warn("Self-host heartbeat skipped:", err.message);
    }

    // 7. Start server + workers
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
