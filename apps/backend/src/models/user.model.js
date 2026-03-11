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

    role: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
