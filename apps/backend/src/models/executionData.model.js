import mongoose from "mongoose";

const ExecutionDataSchema = new mongoose.Schema(
  {
    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Execution",
      required: true,
      index: true,
    },
    nodeId: {
      type: String,
      required: true,
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    log: {
      nodeType: String,
      status: { type: String, enum: ["success", "skipped", "failed"] },
      input: mongoose.Schema.Types.Mixed,
      error: String,
      executedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

// Fast lookups by execution and node
ExecutionDataSchema.index({ executionId: 1, nodeId: 1 }, { unique: true });

export default mongoose.model("ExecutionData", ExecutionDataSchema);
