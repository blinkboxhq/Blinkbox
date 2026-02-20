import { dequeueCursor } from "./cursor.queue.js";
import { processCursor } from "./cursor.executor.js";

export async function startCursorWorker() {
  console.log("🚀 Cursor worker started");

  while (true) {
    const payload = await dequeueCursor();
    try {
      await processCursor(payload);
    } catch (err) {
      console.error("Cursor error:", err.message);
    }
  }
}
