import { Router } from "express";
import { register, login, googleLogin } from "./auth.controller.js";
import { redis } from "../../infra/redis.client.js";

const router = Router();

// 10 attempts per 15-minute window per IP — brute-force protection
async function loginRateLimit(req, res, next) {
  try {
    const ip = (req.headers["x-forwarded-for"] || req.ip || "unknown").toString().split(",")[0].trim();
    const key = `bb:ratelimit:login:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 900); // 15-min window
    if (current > 10) {
      return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
    }
  } catch {
    // Redis down — fail open (don't block legitimate users if cache is unavailable)
  }
  next();
}

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/google", googleLogin);

export default router;
