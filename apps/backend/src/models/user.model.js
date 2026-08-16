import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Make password NOT required, because Google users won't have one
    password: { type: String, required: false },

    // Track how they signed up
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },
    picture: { type: String, default: "" },

    role: { type: String, enum: ["admin", "user"], default: "user" },
    emailVerified: { type: Boolean, default: false },

    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: {
      type: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
      default: null,
      select: false,
    },
    avatar: { type: String, default: "" },
    stripeCustomerId:     { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },

    // Self-hosted installs have exactly one owner, seeded by the installer.
    // isOwner is the login subject on a password-only sign-in, so it is indexed
    // and must stay unique — two owners would make that lookup ambiguous.
    isOwner: { type: Boolean, default: false, index: true },
    mustChangePassword: { type: Boolean, default: false },
    bootstrapExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
