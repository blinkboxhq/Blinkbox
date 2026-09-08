import mongoose from "mongoose";

const selfHostInstanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    licenseId: { type: String, required: true, index: true },
    // The name the installer asked for, after slugging and collision-versioning.
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    hostname: { type: String, required: true },
    // The address DNS actually points at — set only after the box answered a
    // probe there, never from an unverified claim.
    ip: { type: String, default: null },

    // What the box *thinks* it is, kept for diagnostics. egressIp is where its
    // outbound traffic appears from; on a NAT'd or multi-homed host that is a
    // different address from the one the world can reach it at, which is the
    // trap that used to send the subdomain somewhere unrelated.
    egressIp: { type: String, default: null },
    candidateIps: { type: [String], default: [] },

    // Last reachability verdict, so the dashboard can say *why* a site is down
    // instead of showing a hostname and leaving the owner guessing.
    reachable: { type: Boolean, default: false },
    lastProbeAt: { type: Date, default: null },
    probeError: { type: String, default: null },
    dnsState: { type: String, default: "pending" },

    // Shared once at registration over the authenticated HTTPS call; never read
    // back out to any client.
    probeToken: { type: String, default: null, select: false },
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
