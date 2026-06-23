import { spawn, execSync } from "child_process";
import axios from "axios";

const BASE = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");

class OllamaManager {
  _proc = null;
  _ready = false;

  isInstalled() {
    try {
      execSync("ollama --version", { stdio: "ignore", timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  async isAlive() {
    try {
      await axios.get(`${BASE}/api/tags`, { timeout: 2500 });
      return true;
    } catch (e) {
      if (e.response) return true; // got a response = process is up
      return false;
    }
  }

  async start() {
    if (!this.isInstalled()) {
      console.log("[OllamaManager] ollama binary not found — server-side Ollama unavailable");
      return false;
    }

    if (await this.isAlive()) {
      console.log("[OllamaManager] ollama already running at", BASE);
      this._ready = true;
      return true;
    }

    console.log("[OllamaManager] starting ollama serve...");
    this._proc = spawn("ollama", ["serve"], {
      stdio: "ignore",
      detached: false,
      env: { ...process.env },
    });

    this._proc.on("error", (err) => {
      console.warn("[OllamaManager] process error:", err.message);
    });

    this._proc.on("exit", (code) => {
      console.log("[OllamaManager] process exited, code:", code);
      this._ready = false;
      this._proc = null;
    });

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await this.isAlive()) {
        this._ready = true;
        console.log("[OllamaManager] ready at", BASE);
        return true;
      }
    }

    console.warn("[OllamaManager] started process but not responding at", BASE);
    return false;
  }

  async getModels() {
    try {
      const r = await axios.get(`${BASE}/api/tags`, { timeout: 5000 });
      return (r.data?.models || []).map((m) => m.name).filter(Boolean);
    } catch {
      return [];
    }
  }

  getStatus() {
    return {
      installed: this.isInstalled(),
      running: this._ready,
      base: BASE,
    };
  }

  stop() {
    if (this._proc) {
      this._proc.kill("SIGTERM");
      this._proc = null;
    }
    this._ready = false;
  }
}

export const ollamaManager = new OllamaManager();
