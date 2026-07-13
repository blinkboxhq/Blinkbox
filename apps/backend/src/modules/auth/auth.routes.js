import { Router } from "express";
import { register, login, loginTwoFactor, googleLogin, forgotPassword, resetPassword, verifyEmail, resendVerification } from "./auth.controller.js";
import { redis } from "../../infra/redis.client.js";

const router = Router();

function makeRateLimiter({ key, max, windowSecs, message }) {
  return async (req, res, next) => {
    try {
      // req.ip is proxy-derived via trust proxy — reading the first
      // X-Forwarded-For entry directly would let clients forge their IP.
      const ip = req.ip || "unknown";
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
const googleRateLimit   = makeRateLimiter({ key: 'bb:rl:google',   max: 10, windowSecs: 900,  message: 'Too many Google login attempts. Try again in 15 minutes.' });

router.post("/register", registerRateLimit, register);
router.post("/login", loginRateLimit, login);
router.post("/login/2fa", loginRateLimit, loginTwoFactor);
router.post("/google", googleRateLimit, googleLogin);
router.post("/verify-email", makeRateLimiter({ key: 'bb:rl:verify', max: 10, windowSecs: 3600, message: 'Too many verification attempts. Try again later.' }), verifyEmail);
router.post("/resend-verification", makeRateLimiter({ key: 'bb:rl:resend', max: 5, windowSecs: 3600, message: 'Too many resend attempts. Try again in 1 hour.' }), resendVerification);
router.post("/forgot-password", makeRateLimiter({ key: 'bb:rl:forgot', max: 3, windowSecs: 3600, message: 'Too many reset attempts. Try again in 1 hour.' }), forgotPassword);
router.post("/reset-password", makeRateLimiter({ key: 'bb:rl:reset', max: 10, windowSecs: 3600, message: 'Too many reset attempts. Try again in 1 hour.' }), resetPassword);

export default router;
