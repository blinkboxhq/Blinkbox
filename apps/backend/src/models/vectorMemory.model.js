import mongoose from "mongoose";

const vectorMemorySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    namespace: { type: String, default: "default" },
    memoryKey: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

vectorMemorySchema.index({ workspaceId: 1, namespace: 1 });
vectorMemorySchema.index({ workspaceId: 1, namespace: 1, memoryKey: 1 });

export default mongoose.model("VectorMemory", vectorMemorySchema);
