import app from "./app.js";
import { startExecutionResumer } from "../modules/workers/execution.resumer.js";
import { startCursorWorker } from "../modules/workers/cursor.worker.js";

export async function startServer() {
  const PORT = process.env.PORT || 3000;

  // 🔥 Start background workers
  startCursorWorker();
  startExecutionResumer();

  app.listen(PORT, () => {
    console.log(`🚀 BlinkBox backend running on port ${PORT}`);
  });
}
