import mongoose from "mongoose";
import type {
  NodeConfig,
  EdgeConfig,
  WorkflowDefinition,
} from "../schemas.js";

/**
 * Node subdocument — mirrors NodeConfigSchema from @blinkbox/shared-types.
 */
const NodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Object, default: {} },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    description: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * Edge subdocument — mirrors EdgeConfigSchema from @blinkbox/shared-types.
 */
const EdgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String, default: null },
    targetHandle: { type: String, default: null },
    condition: {
      type: mongoose.Schema.Types.Mixed,
      default: "always",
    },
    type: {
      type: String,
      enum: ["onSuccess", "onFailure"],
      default: "onSuccess",
    },
    description: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * Automation document — mirrors WorkflowDefinitionSchema from @blinkbox/shared-types.
 *
 * MIGRATION NOTE: Field renames from the original JS model:
 *   - Node: `config` → `data`, added `position`
 *   - Edge: `from` → `source`, `to` → `target`, added `id`, `sourceHandle`, `targetHandle`
 *   - Removed: `actions` (legacy, unused)
 */
const AutomationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    trigger: { type: String, required: true },
    active: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "active"], default: "draft" },
    workspaceId: { type: String, required: true, index: true },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    entryNodeId: { type: String, default: null },
    triggerNodes: {
      type: [{ nodeId: { type: String, required: true }, type: { type: String, required: true }, _id: false }],
      default: [],
    },
    settings: {
      type: Object,
      default: { maxParallel: 10 },
    },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    // Concurrency token for the canvas. Separate from `updatedAt` because
    // thumbnails, activation and renames also touch the doc — using updatedAt
    // would make those look like a conflicting graph edit.
    graphUpdatedAt: { type: Date, default: null },
    collaborators: {
      type: [
        {
          userId: { type: String, required: true },
          email: { type: String, required: true },
          name: { type: String, default: "" },
          avatar: { type: String, default: "" },
          picture: { type: String, default: "" },
          role: { type: String, enum: ["editor", "viewer"], default: "editor" },
          addedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

AutomationSchema.index({ workspaceId: 1, name: 1 });
AutomationSchema.index({ trigger: 1, active: 1 });

export default mongoose.model("Automation", AutomationSchema);
