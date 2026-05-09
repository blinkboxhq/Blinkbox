/**
 * Telemetry Service — Decoupled execution logging.
 *
 * Instead of writing to MongoDB on every node step (which kills perf at scale),
 * logs are pushed to a Redis List as serialized JSON. A background flusher
 * drains the list in batches and bulk-inserts into the database.
 *
 * Architecture:
 *   Activity → telemetryService.logNodeStep() → Redis RPUSH (<1ms)
 *   Flusher  → Redis LPOP × 1000 every 5s     → MongoDB bulkWrite (or ClickHouse later)
 */

import { redis } from "../../infra/redis.client.js";

// ── Redis Key ───────────────────────────────────────────────────────────────────

export const TELEMETRY_QUEUE_KEY = "bb:telemetry:logs";

// ── Log Types ───────────────────────────────────────────────────────────────────

export interface ExecutionStartLog {
  type: "execution_start";
  workflowId: string;
  automationId: string;
  trigger: string;
  triggerData: Record<string, unknown>;
  timestamp: string;
}

export interface NodeStepLog {
  type: "node_step";
  workflowId: string;
  automationId: string;
  nodeId: string;
  nodeType: string;
  status: "success" | "failed";
  durationMs: number;
  input: unknown;
  output: unknown;
  error?: string;
  timestamp: string;
}

export interface ExecutionEndLog {
  type: "execution_end";
  workflowId: string;
  automationId: string;
  status: "completed" | "failed";
  totalNodes: number;
  timestamp: string;
}

export type TelemetryLog = ExecutionStartLog | NodeStepLog | ExecutionEndLog;

// ── Service Interface ───────────────────────────────────────────────────────────

export interface ITelemetryService {
  logExecutionStart(params: Omit<ExecutionStartLog, "type" | "timestamp">): Promise<void>;
  logNodeStep(params: Omit<NodeStepLog, "type" | "timestamp">): Promise<void>;
  logExecutionEnd(params: Omit<ExecutionEndLog, "type" | "timestamp">): Promise<void>;
}

// Cap serialized payload to prevent large blobs inflating Redis/MongoDB
const LOG_PAYLOAD_MAX_BYTES = 32 * 1024; // 32 KB

function capPayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const str = JSON.stringify(value);
  if (str.length <= LOG_PAYLOAD_MAX_BYTES) return value;
  return { __truncated: true, preview: str.slice(0, 200) };
}

// ── Redis Implementation ────────────────────────────────────────────────────────

class RedisTelemetryService implements ITelemetryService {
  private async push(log: TelemetryLog): Promise<void> {
    await redis.rpush(TELEMETRY_QUEUE_KEY, JSON.stringify(log));
  }

  async logExecutionStart(
    params: Omit<ExecutionStartLog, "type" | "timestamp">,
  ): Promise<void> {
    await this.push({
      ...params,
      type: "execution_start",
      timestamp: new Date().toISOString(),
    });
  }

  async logNodeStep(
    params: Omit<NodeStepLog, "type" | "timestamp">,
  ): Promise<void> {
    await this.push({
      ...params,
      input: capPayload(params.input),
      output: capPayload(params.output),
      type: "node_step",
      timestamp: new Date().toISOString(),
    });
  }

  async logExecutionEnd(
    params: Omit<ExecutionEndLog, "type" | "timestamp">,
  ): Promise<void> {
    await this.push({
      ...params,
      type: "execution_end",
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Singleton Export ────────────────────────────────────────────────────────────

export const telemetryService: ITelemetryService = new RedisTelemetryService();
