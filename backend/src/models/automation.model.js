import mongoose from "mongoose";

/**
 * ===============================
 * NODE SCHEMA
 * ===============================
 * Represents a step or action in the automation flow
 */
const NodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true }, // send_email, call_webhook, condition, etc.
    config: { type: Object, default: {} },
    description: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * ===============================
 * EDGE SCHEMA
 * ===============================
 * Connects nodes together and supports conditional branching
 */
const EdgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    condition: {
      type: mongoose.Schema.Types.Mixed, // Phase 7 allows object-based conditions
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
 * ===============================
 * AUTOMATION SCHEMA
 * ===============================
 */
const AutomationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    trigger: { type: String, required: true },
    active: { type: Boolean, default: true },

    actions: { type: Array, default: [] },

    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    entryNodeId: { type: String, default: null },

    settings: {
      type: Object,
      default: {
        maxParallel: 10, // Phase 7 setting
      },
    },

    description: { type: String, default: "" },
  },
  { timestamps: true },
);

// Unique combination of trigger + name to prevent duplicates
AutomationSchema.index({ trigger: 1, name: 1 }, { unique: true });

export default mongoose.model("Automation", AutomationSchema);
