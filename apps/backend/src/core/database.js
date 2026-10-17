import mongoose from "mongoose";
import { attachDbMonitor } from "../infra/dbHealth.js";

export async function connectDB() {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blinkbox";

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    console.log("✅ MongoDB connected"),
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌ MongoDB connection error:", err),
  );

  try {
    // Command monitoring lets dbHealth notice "storage full" write failures.
    await mongoose.connect(MONGO_URI, { monitorCommands: true });
    attachDbMonitor(mongoose.connection.getClient());
  } catch (err) {
    console.error("❌ Could not connect to MongoDB:", err);
    process.exit(1);
  }
}
