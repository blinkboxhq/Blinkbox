import express from "express";
import axios from "axios";
import { verifyToken } from "../auth/auth.middleware.js";
import { ollamaManager } from "../../infra/ollama.manager.js";

const router = express.Router();
const BASE = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");

router.get("/status", verifyToken, async (req, res) => {
  const status = ollamaManager.getStatus();
  const models = status.running ? await ollamaManager.getModels() : [];
  res.json({ ...status, models });
});

router.get("/models", verifyToken, async (req, res) => {
  if (!ollamaManager._ready) {
    return res.status(503).json({ error: "Ollama not running on this server." });
  }
  const models = await ollamaManager.getModels();
  res.json({ models });
});

router.post("/pull", verifyToken, async (req, res) => {
  const { model } = req.body;
  if (!model?.trim()) return res.status(400).json({ error: "model name required" });
  if (!ollamaManager._ready) {
    return res.status(503).json({ error: "Ollama is not running on this server." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const response = await axios.post(
      `${BASE}/api/pull`,
      { name: model.trim(), stream: true },
      { responseType: "stream", timeout: 600_000 }
    );

    response.data.on("data", (chunk) => {
      try { res.write(chunk); } catch {}
    });

    response.data.on("end", () => res.end());
    response.data.on("error", (err) => {
      try { res.write(JSON.stringify({ error: err.message }) + "\n"); res.end(); } catch {}
    });
  } catch (err) {
    try { res.write(JSON.stringify({ error: err.message }) + "\n"); res.end(); } catch {}
  }
});

export default router;
