import { redis } from "../../infra/redis.client.js";
import os from "os";

/**
 * ☢️ GLOBAL KILL SWITCH
 * Stops all workers from picking up new tasks instantly.
 */
export async function toggleKillSwitch(req, res) {
  try {
    const { active } = req.body;
    const key = "bb:locks:global_kill_switch";

    if (active) {
      await redis.set(key, "STOP", "EX", 3600);
      return res.json({ success: true, message: "Workers halted." });
    } else {
      await redis.del(key);
      return res.json({ success: true, message: "Workers resumed." });
    }
  } catch (err) {
    console.error("[Admin] toggleKillSwitch error:", err.message);
    res.status(500).json({ error: "Failed to toggle kill switch." });
  }
}

export async function getBunkerStats(req, res) {
  try {
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
  } catch (err) {
    console.error("[Admin] getBunkerStats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
}
