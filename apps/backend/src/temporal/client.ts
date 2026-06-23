/**
 * Temporal Client Singleton — used to start and signal workflows.
 *
 * Lazily connects on first call so the backend can still boot
 * even when Temporal server is unavailable.
 */

import { Client, Connection } from "@temporalio/client";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  const connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  client = new Client({ connection });
  return client;
}

export const TASK_QUEUE = "blinkbox-workflows";
