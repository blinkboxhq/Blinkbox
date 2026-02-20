import dotenv from "dotenv";
dotenv.config();

import { redis } from "./infra/redis.client.js"; // Redis singleton
import { connectDB } from "./core/database.js";
import { startServer } from "./core/server.js";

// Action nodes (single source of truth)
import sendEmailNode from "./nodes/sendEmail.node.js";
import callWebhookNode from "./nodes/callWebhook.node.js";

export const actionRegistry = {
  send_email: sendEmailNode,
  call_webhook: callWebhookNode,
};

async function bootstrap() {
  try {
    console.log("BOOTSTRAP: starting");

    // 1️⃣ Connect DB
    await connectDB();

    // 2️⃣ Test Redis
    await redis.set("ping", "pong");
    const pong = await redis.get("ping");
    console.log("✅ Redis ping:", pong);

    // 3️⃣ Start server & workers
    await startServer();

    console.log("BOOTSTRAP: server started 🚀");
  } catch (err) {
    console.error("BOOTSTRAP FAILED ❌", err);
    process.exit(1);
  }
}

bootstrap();
