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
      enum: ["pending", "waiting", "completed", "failed"],
      default: "pending",
    },
    retries: { type: Number, default: 0 },
    resumeAt: { type: Date, default: null, index: true },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    parentCursorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

const NodeLogSchema = new mongoose.Schema(
  {
    nodeId: String,
    nodeType: String,
    status: { type: String, enum: ["success", "failed"] },
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
      enum: ["pending", "executed", "failed", "partial"],
      default: "pending",
    },

    context: { type: Object, default: {} },
    cursors: { type: [CursorSchema], default: [] },
    logs: { type: [NodeLogSchema], default: [] },

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

    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
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

export default mongoose.model("Execution", ExecutionSchema);
