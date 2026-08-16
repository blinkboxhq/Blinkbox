import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../models/user.model.js";
import { redis } from "../../infra/redis.client.js";
import axios from "axios";
import { JWT_SECRET, SELF_HOSTED } from "../../config/env.js";
import { OAuth2Client } from "google-auth-library";
import { decrypt } from "../../utils/crypto.js";
import { verifyToken as verifyTotp } from "../../utils/totp.js";
import {
  sendRegistrationEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendLoginAlertEmail,
} from "../../infra/email.service.js";

const RESET_TTL  = 60 * 15;      // 15 minutes
const VERIFY_TTL = 60 * 60 * 24; // 24 hours
const TWO_FA_TTL = 60 * 5;       // 5 minutes to complete the 2FA step

const APP_URL = process.env.VITE_APP_URL || "https://blinkbox.net";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Self-hosted owner sign-in ────────────────────────────────────────────────

// A self-hosted instance has exactly one account, so the login form asks for a
// password and nothing else. That removes the email field as an oracle — the
// page reveals neither who the owner is nor whether a guessed address exists.

// Compared against on every failed attempt so that a wrong password costs the
// same wall-clock time whether or not an owner row exists. Without it, response
// latency alone tells an attacker whether the instance has been claimed.
const DUMMY_HASH = bcrypt.hashSync("blinkbox-timing-equalizer", 12);

const OWNER_LOCK_THRESHOLD = 5;
const OWNER_LOCK_STEPS = [15, 60, 300, 900, 3600];
const OWNER_FAIL_TTL = 900;

// req.ip honours `trust proxy` and resolves to the peer Caddy actually saw.
// Reading X-Forwarded-For directly would key the lockout on a value the caller
// controls, letting an attacker shed a lockout by forging a fresh prefix.
function trustedClientIp(req) {
  return req.ip || "unknown";
}

async function ownerLogin(req, res) {
  const { password } = req.body || {};
  const ip = trustedClientIp(req);
  const lockKey = `auth:lockout:owner:${ip}`;
  const failKey = `auth:fails:owner:${ip}`;

  const locked = await redis.get(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    return res.status(429).json({
      message: `Too many attempts. Try again in ${ttl} seconds.`,
      lockoutTimer: ttl,
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "Password is required." });
  }

  const owner = await User.findOne({ isOwner: true });
  const isMatch = await bcrypt.compare(password, owner?.password || DUMMY_HASH);

  if (!owner || !isMatch) {
    const fails = await redis.incr(failKey);
    if (fails === 1) await redis.expire(failKey, OWNER_FAIL_TTL);
    if (fails >= OWNER_LOCK_THRESHOLD) {
      const step = Math.min(fails - OWNER_LOCK_THRESHOLD, OWNER_LOCK_STEPS.length - 1);
      const secs = OWNER_LOCK_STEPS[step];
      await redis.set(lockKey, "1", "EX", secs);
      return res.status(429).json({
        message: `Too many attempts. Try again in ${secs} seconds.`,
        lockoutTimer: secs,
      });
    }
    return res.status(401).json({ message: "Incorrect password." });
  }

  // A printed-once bootstrap password sits in terminal scrollback forever. It
  // stops being accepted after its window so a stale transcript is not a
  // standing key to the instance.
  if (owner.mustChangePassword && owner.bootstrapExpiresAt && owner.bootstrapExpiresAt < new Date()) {
    return res.status(403).json({
      message: "This setup password has expired. On the server run:  cd /opt/blinkbox && docker compose exec backend node src/modules/selfhost/resetOwner.js",
    });
  }

  await redis.del(failKey);

  if (owner.twoFactorEnabled) {
    const challenge = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:2fa:${challenge}`, String(owner._id), "EX", TWO_FA_TTL);
    return res.json({
      twoFactorRequired: true,
      twoFactorToken: challenge,
      message: "Enter the code from your authenticator app.",
    });
  }

  // While the bootstrap password is still in force the session is scoped to the
  // change-password call alone, so an unrotated credential cannot be used to
  // drive the rest of the API.
  if (owner.mustChangePassword) {
    const scoped = jwt.sign(
      { id: owner._id, role: owner.role, scope: "password_change" },
      JWT_SECRET,
      { expiresIn: "15m" },
    );
    return res.json({
      mustChangePassword: true,
      token: scoped,
      message: "Choose a password of your own to finish setup.",
    });
  }

  const token = jwt.sign({ id: owner._id, role: owner.role }, JWT_SECRET, { expiresIn: "24h" });
  return res.json({
    message: "Authentication successful.",
    token,
    user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
  });
}

// Completes setup: swaps the installer-issued password for one the owner picks.
// Reachable with a password_change-scoped token, which is all a bootstrap login
// hands out.
export async function changeOwnerPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Current and new password are both required." });
    }
    if (newPassword.length < 12) {
      return res.status(400).json({ message: "Password must be at least 12 characters." });
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: "Password must mix upper case, lower case and digits." });
    }

    const owner = await User.findById(req.user.id);
    if (!owner) return res.status(404).json({ message: "Account not found." });
    if (SELF_HOSTED && !owner.isOwner) {
      return res.status(403).json({ message: "Not permitted." });
    }

    const isMatch = await bcrypt.compare(currentPassword, owner.password || DUMMY_HASH);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });

    if (await bcrypt.compare(newPassword, owner.password || DUMMY_HASH)) {
      return res.status(400).json({ message: "Choose a password you have not used here before." });
    }

    owner.password = await bcrypt.hash(newPassword, 12);
    owner.mustChangePassword = false;
    owner.bootstrapExpiresAt = null;
    await owner.save();

    const token = jwt.sign({ id: owner._id, role: owner.role }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({
      message: "Password updated.",
      token,
      user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
    });
  } catch (error) {
    console.error("Owner password change error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// ── Google SSO ───────────────────────────────────────────────────────────────
export async function googleLogin(req, res) {
  try {
    if (SELF_HOSTED) {
      return res.status(403).json({ message: "Google sign-in is not available on this instance." });
    }

    const { credential, access_token } = req.body;

    if (!credential && !access_token) {
      return res.status(400).json({ message: "Google credential missing." });
    }

    let googleId, email, name, given_name, picture;

    if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      given_name = payload.given_name;
      picture = payload.picture || "";
    } else {
      const googleResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } },
      );
      ({ sub: googleId, email, name, given_name, picture } = googleResponse.data);
      picture = picture || "";
    }
    const safeName = name || given_name || email.split("@")[0];

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name: safeName,
        email,
        authProvider: "google",
        googleId,
        picture,
        role: "user",
        emailVerified: true,
      });
      isNewUser = true;
    } else if (!user.googleId) {
      return res.status(403).json({
        message:
          "An account with this email already exists. " +
          "Please log in with your password and link Google in account settings.",
      });
    } else if (user.googleId !== googleId) {
      return res.status(403).json({ message: "Google account mismatch. Access denied." });
    }

    if (picture && user.picture !== picture) {
      user.picture = picture;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    if (isNewUser) {
      sendWelcomeEmail(user).catch(err => console.error("[Auth] Google welcome email failed:", err.message));
    } else {
      const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
      sendLoginAlertEmail(user, { ip, userAgent: req.headers["user-agent"] })
        .catch(err => console.error("[Auth] Google login alert email failed:", err.message));
    }

    res.json({
      message: "Google Authentication successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, picture: user.picture },
    });
  } catch (error) {
    console.error("Google auth error:", error.response?.data || error.message);
    res.status(401).json({ message: "Failed to verify Google identity." });
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
export async function register(req, res) {
  try {
    // The owner is seeded by the installer and is the only account a
    // self-hosted instance ever has. Leaving sign-up reachable would let anyone
    // who finds the hostname provision themselves a foothold on it.
    if (SELF_HOSTED) {
      return res.status(403).json({ message: "Sign-up is disabled on this instance." });
    }

    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
      return res.status(400).json({ message: "Name is required (1-100 characters)." });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      role: "user",
      emailVerified: false,
    });

    // Generate and store verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:verify:${verifyToken}`, String(user._id), "EX", VERIFY_TTL);

    const verifyUrl = `${APP_URL}/verify-email?token=${verifyToken}`;
    await sendRegistrationEmail(user, verifyUrl);

    res.status(201).json({
      needsVerification: true,
      email: user.email,
      message: "Account created. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({ message: "Internal server error during registration." });
  }
}

// ── Verify Email ─────────────────────────────────────────────────────────────
export async function verifyEmail(req, res) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const key = `bb:verify:${token}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(400).json({ message: "This verification link has expired or already been used." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "Account not found." });

    user.emailVerified = true;
    await user.save();
    await redis.del(key);

    sendWelcomeEmail(user).catch(err => console.error("[Auth] welcome email failed:", err.message));

    const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      success: true,
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, picture: user.picture || "" },
    });
  } catch (err) {
    console.error("[Auth] verifyEmail error:", err.message);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
}

// ── Resend Verification ───────────────────────────────────────────────────────
export async function resendVerification(req, res) {
  // Always return 200 to prevent email enumeration
  const { email } = req.body;
  if (!email || typeof email !== "string") return res.json({ success: true });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.emailVerified) return res.json({ success: true });

    // Rate limit: 1 resend per minute per user
    const rlKey = `bb:verify:rl:${user._id}`;
    const recentlySent = await redis.get(rlKey);
    if (recentlySent) return res.json({ success: true });
    await redis.set(rlKey, "1", "EX", 60);

    const verifyToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:verify:${verifyToken}`, String(user._id), "EX", VERIFY_TTL);

    const verifyUrl = `${APP_URL}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(user, verifyUrl);
  } catch (err) {
    console.error("[Auth] resendVerification error:", err.message);
  }

  res.json({ success: true });
}

// ── Forgot Password ───────────────────────────────────────────────────────────
export async function forgotPassword(req, res) {
  // No SMTP is configured on a self-hosted box, so a reset mail would never
  // arrive. Recovery is gated on shell access to the host instead.
  if (SELF_HOSTED) {
    return res.status(403).json({
      message: "Recover a self-hosted instance from the server:  docker compose exec backend node src/modules/selfhost/resetOwner.js",
    });
  }

  // Always return success — never reveal whether an email exists
  const { email } = req.body;
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.json({ success: true });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Google-only account — no password to reset, send a helpful nudge
    if (user && !user.password) {
      await sendPasswordResetEmail(
        user,
        `${APP_URL}/login`,
        { googleOnly: true },
      ).catch(() => {});
      return res.json({ success: true });
    }

    if (!user) return res.json({ success: true });

    // Invalidate any existing reset token for this user before issuing a new one
    const userTokenKey = `bb:reset:uid:${user._id}`;
    const oldToken = await redis.get(userTokenKey);
    if (oldToken) await redis.del(`bb:reset:${oldToken}`);

    const token = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:reset:${token}`,           String(user._id), "EX", RESET_TTL);
    await redis.set(`bb:reset:uid:${user._id}`,    token,            "EX", RESET_TTL);

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user, resetUrl);
  } catch (err) {
    console.error("[Auth] forgotPassword error:", err.message);
  }

  res.json({ success: true });
}

// ── Reset Password ────────────────────────────────────────────────────────────
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Token and password (min 8 chars) are required." });
    }

    const key = `bb:reset:${token}`;
    const userId = await redis.get(key);
    if (!userId) return res.status(400).json({ message: "This reset link has expired or already been used." });

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "Account not found." });

    user.password = await bcrypt.hash(password, 12);
    await user.save();
    await redis.del(key);
    await redis.del(`bb:reset:uid:${userId}`);

    sendPasswordChangedEmail(user).catch(err => console.error("[Auth] password-changed email failed:", err.message));

    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (err) {
    console.error("[Auth] resetPassword error:", err.message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(req, res) {
  try {
    if (SELF_HOSTED) return await ownerLogin(req, res);

    const { email, password } = req.body;

    const lockoutKey = `auth:lockout:${email}`;
    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      return res.status(429).json({
        message: `Security lockout active. Please wait ${ttl} seconds before trying again.`,
        lockoutTimer: ttl,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.password) {
      return res.status(403).json({
        message: "This account uses Google sign-in. Please log in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await redis.set(lockoutKey, "locked", "EX", 15);
      return res.status(401).json({ message: "Invalid email or password.", lockoutTimer: 15 });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        needsVerification: true,
        email: user.email,
        message: "Please verify your email before signing in.",
      });
    }

    if (user.twoFactorEnabled) {
      const challenge = crypto.randomBytes(32).toString("hex");
      await redis.set(`bb:2fa:${challenge}`, String(user._id), "EX", TWO_FA_TTL);
      return res.json({
        twoFactorRequired: true,
        twoFactorToken: challenge,
        message: "Enter the code from your authenticator app.",
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    sendLoginAlertEmail(user, { ip, userAgent: req.headers["user-agent"] }).catch(err => console.error("[Auth] login alert email failed:", err.message));

    res.json({
      message: "Authentication successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal server error during login." });
  }
}

export async function loginTwoFactor(req, res) {
  try {
    const { twoFactorToken, code } = req.body;
    if (!twoFactorToken || !code) {
      return res.status(400).json({ message: "Verification code is required." });
    }

    const key = `bb:2fa:${twoFactorToken}`;
    const userId = await redis.get(key);
    if (!userId) {
      return res.status(401).json({ message: "This sign-in session expired. Please log in again." });
    }

    const user = await User.findById(userId).select("+twoFactorSecret");
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(401).json({ message: "Two-factor verification unavailable for this account." });
    }

    const secret = decrypt(
      user.twoFactorSecret.encryptedData,
      user.twoFactorSecret.iv,
      user.twoFactorSecret.authTag,
    );
    if (!verifyTotp(code, secret)) {
      return res.status(401).json({ message: "Invalid code. Please try again." });
    }

    await redis.del(key);

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    sendLoginAlertEmail(user, { ip, userAgent: req.headers["user-agent"] }).catch(err => console.error("[Auth] login alert email failed:", err.message));

    res.json({
      message: "Authentication successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login 2FA Error:", error.message);
    res.status(500).json({ message: "Internal server error during verification." });
  }
}
