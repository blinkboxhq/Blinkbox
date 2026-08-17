import mongoose from "mongoose";

// Instance-side metering state — one document, on the self-hosted instance's own
// database. It exists so a container restart during a cloud outage does not
// collapse the grace window and stop every workflow on the box.
const meterStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "meter" },
    lastGoodCheckAt: { type: Date, default: null },
    // Policy as last handed down by the cloud, so the window survives a restart
    // with the same length the cloud set rather than the local fallback.
    graceHours: { type: Number, default: null },
    // Spend that happened while the cloud was unreachable. Replayed on the next
    // successful contact, so a grace window is not free execution.
    deferred: [
      {
        _id: false,
        executionId: { type: String, required: true },
        nodeId: { type: String, default: "" },
        nodeType: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { versionKey: false, timestamps: true },
);

const MeterState = mongoose.models.MeterState || mongoose.model("MeterState", meterStateSchema);
export default MeterState;
