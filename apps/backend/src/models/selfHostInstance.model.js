import mongoose from "mongoose";

const selfHostInstanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    licenseId: { type: String, required: true, index: true },
    // The name the installer asked for, after slugging and collision-versioning.
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    hostname: { type: String, required: true },
    ip: { type: String, default: null },
    version: { type: String, default: null },
    // Cloudflare record id, kept so revoking a license can tear the DNS down.
    dnsRecordId: { type: String, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const SelfHostInstance =
  mongoose.models.SelfHostInstance || mongoose.model("SelfHostInstance", selfHostInstanceSchema);
export default SelfHostInstance;
