import mongoose from "mongoose";

const AutomationVersionSchema = new mongoose.Schema(
  {
    automationId: { type: mongoose.Schema.Types.ObjectId, ref: "Automation", required: true },
    workspaceId: { type: String, required: true },
    version: { type: Number, required: true },
    name: { type: String, default: "" },
    nodes: { type: mongoose.Schema.Types.Mixed, default: [] },
    edges: { type: mongoose.Schema.Types.Mixed, default: [] },
    entryNodeId: { type: String, default: null },
    savedBy: { type: String, default: null },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

AutomationVersionSchema.index({ automationId: 1, version: -1 });

const AutomationVersion = mongoose.model("AutomationVersion", AutomationVersionSchema);
export default AutomationVersion;
