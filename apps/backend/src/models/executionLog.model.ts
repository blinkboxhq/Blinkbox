/**
 * ExecutionLog — Bulk-insert target for the telemetry flusher.
 *
 * Designed for high-throughput writes (insertMany) and time-range queries.
 * This collection is the MongoDB stand-in for a future ClickHouse table.
 * Schema is intentionally flat and denormalized for OLAP-style access patterns.
 */

import mongoose from "mongoose";

const ExecutionLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["execution_start", "node_step", "execution_end"],
      required: true,
      index: true,
    },
    workflowId: { type: String, required: true, index: true },
    automationId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },

    // node_step fields
    nodeId: { type: String, default: null },
    nodeType: { type: String, default: null },
    status: { type: String, default: null },
    durationMs: { type: Number, default: null },
    input: { type: mongoose.Schema.Types.Mixed, default: null },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },

    // execution_start fields
    trigger: { type: String, default: null },
    triggerData: { type: mongoose.Schema.Types.Mixed, default: null },

    // execution_end fields
    totalNodes: { type: Number, default: null },
  },
  {
    timestamps: false, // we use our own `timestamp` field
    versionKey: false, // no __v for bulk-insert perf
  },
);

// Compound index for the most common query: "show me all logs for this workflow run"
ExecutionLogSchema.index({ workflowId: 1, timestamp: 1 });
// Analytics queries filter by automationId + type + time range
ExecutionLogSchema.index({ automationId: 1, type: 1, timestamp: -1 });

export default mongoose.model("ExecutionLog", ExecutionLogSchema);
