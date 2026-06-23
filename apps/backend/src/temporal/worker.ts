/**
 * Temporal Worker — Connects to the Temporal server and polls
 * the 'blinkbox-workflows' task queue for activity AND workflow tasks.
 *
 * Activities run in the main Node process (not a sandbox) because
 * they need access to Mongoose, Redis, and the Vault.
 *
 * Workflows are bundled by Temporal's webpack bundler and executed
 * in a deterministic V8 sandbox.
 */

import { fileURLToPath } from "url";
import path from "path";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
const TASK_QUEUE = "blinkbox-workflows";

export async function startTemporalWorker(): Promise<void> {
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
    connectTimeout: { seconds: 5 },
  });

  const worker = await Worker.create({
    connection,
    taskQueue: TASK_QUEUE,
    activities,
    workflowsPath: path.resolve(__dirname, "./workflows"),
  });

  console.log(`Temporal worker listening on queue "${TASK_QUEUE}" (${TEMPORAL_ADDRESS})`);

  // Worker.run() blocks until shutdown signal. Let it run in the background.
  worker.run().catch((err) => {
    console.error("Temporal worker crashed:", err);
    process.exit(1);
  });
}
