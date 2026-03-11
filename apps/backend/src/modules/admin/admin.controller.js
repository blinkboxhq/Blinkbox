import { redis } from "../../infra/redis.client.js";
import os from "os";

/**
 * ☢️ GLOBAL KILL SWITCH
 * Stops all workers from picking up new tasks instantly.
 */
export async function toggleKillSwitch(req, res) {
  const { active } = req.body; // true to kill, false to resume
  const key = "bb:locks:global_kill_switch";

  if (active) {
    await redis.set(key, "STOP", "EX", 3600); // 1-hour safety cap
    return res.json({
      success: true,
      message: "🚨 NUCLEAR KILL SWITCH ACTIVATED. Workers idling.",
    });
  } else {
    await redis.del(key);
    return res.json({
      success: true,
      message: "🟢 Workers resumed. Bunker online.",
    });
  }
}

/**
 * 📊 BUNKER TELEMETRY
 * Returns hardware stats and bunker status for your 2027 Dashboard.
 */
export async function getBunkerStats(req, res) {
  const isKilled = await redis.get("bb:locks:global_kill_switch");

  const stats = {
    status: isKilled ? "OFFLINE (HALTED)" : "ONLINE (ACTIVE)",
    hardware: {
      cpus: os.cpus().length,
      load: os.loadavg(),
      freeMem: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      totalMem: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    },
    uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
  };

  res.json({ success: true, stats });
}
