import { Router } from "express";
import { register, login, googleLogin, forgotPassword, resetPassword } from "./auth.controller.js";
import { redis } from "../../infra/redis.client.js";

const router = Router();

function makeRateLimiter({ key, max, windowSecs, message }) {
  return async (req, res, next) => {
    try {
      const ip = (req.headers["x-forwarded-for"] || req.ip || "unknown").toString().split(",")[0].trim();
      const k = `${key}:${ip}`;
      const current = await redis.incr(k);
      if (current === 1) await redis.expire(k, windowSecs);
      if (current > max) return res.status(429).json({ error: message });
    } catch { /* Redis down — fail open */ }
    next();
  };
}

const loginRateLimit    = makeRateLimiter({ key: 'bb:rl:login',    max: 10, windowSecs: 900,  message: 'Too many login attempts. Try again in 15 minutes.' });
const registerRateLimit = makeRateLimiter({ key: 'bb:rl:register', max: 5,  windowSecs: 3600, message: 'Too many accounts created from this IP. Try again in 1 hour.' });

router.post("/register", registerRateLimit, register);
router.post("/login", loginRateLimit, login);
router.post("/google", googleLogin);
router.post("/forgot-password", makeRateLimiter({ key: 'bb:rl:forgot', max: 3, windowSecs: 3600, message: 'Too many reset attempts. Try again in 1 hour.' }), forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
