import mongoose from "mongoose";

const CursorSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    nodeId: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "waiting",
        "running",
        "completed",
        "skipped",
        "failed",
        "cancelled",
      ], // Added running & cancelled
      default: "pending",
    },
    retries: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    resumeAt: { type: Date, default: null, index: true },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    parentCursorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Parked by a wait_for_event node. Has no resumeAt and must never be
    // swept up by the resumer's stale-waiting recovery — only its webhook
    // releases it, however long that takes.
    waitingForWebhook: { type: Boolean, default: false },
    // Set by loop fan-out: the specific item this cursor should process
    _loopItemOverride: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const NodeLogSchema = new mongoose.Schema(
  {
    nodeId: String,
    nodeType: String,
    status: { type: String, enum: ["success", "skipped", "failed"] },
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: String,
    executedAt: { type: Date, default: Date.now },
    parentCursorId: mongoose.Schema.Types.ObjectId,
  },
  { _id: false },
);

const ExecutionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      index: true,
      required: true,
    },

    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Automation",
      required: true,
      index: true,
    },

    name: String,
    trigger: String,

    idempotencyKey: { type: String },

    status: {
      type: String,
      enum: ["pending", "running", "executed", "failed", "partial", "cancelled"],
      default: "pending",
    },

    cursors: { type: [CursorSchema], default: [] },
    completedAt: Date,

    events: [
      {
        type: {
          type: String,
          required: true,
        },
        nodeId: String,
        message: String,
        meta: Object,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// 🔥 CRITICAL SCALE INDEXES
ExecutionSchema.index(
  { automationId: 1, idempotencyKey: 1, workspaceId: 1 },
  { unique: true, sparse: true },
);

ExecutionSchema.index({
  workspaceId: 1,
  "cursors.status": 1,
  "cursors.resumeAt": 1,
});

// Index for resumer crash recovery queries
ExecutionSchema.index({ "cursors.status": 1, "cursors.lockedAt": 1 });
// Index for stuck-waiting recovery (status + cursors.status + updatedAt)
ExecutionSchema.index({ status: 1, "cursors.status": 1, updatedAt: 1 });

export default mongoose.model("Execution", ExecutionSchema);
