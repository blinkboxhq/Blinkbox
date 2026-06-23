import mongoose from "mongoose";

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
    await mongoose.connect(MONGO_URI);
  } catch (err) {
    console.error("❌ Could not connect to MongoDB:", err);
    process.exit(1);
  }
}
