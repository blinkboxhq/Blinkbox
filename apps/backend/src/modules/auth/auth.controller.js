import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../models/user.model.js";
import { redis } from "../../infra/redis.client.js";
import axios from "axios";
import { JWT_SECRET } from "../../config/env.js";
import { OAuth2Client } from "google-auth-library";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../../infra/email.service.js";

const RESET_TTL  = 60 * 15;      // 15 minutes
const VERIFY_TTL = 60 * 60 * 24; // 24 hours

const APP_URL = process.env.VITE_APP_URL || "https://blinkbox.net";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Google SSO ───────────────────────────────────────────────────────────────
export async function googleLogin(req, res) {
  try {
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

    if (!user) {
      user = await User.create({
        name: safeName,
        email,
        authProvider: "google",
        googleId,
        picture,
        role: "user",
        emailVerified: true, // Google validates the email
      });
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
    await sendVerificationEmail(user, verifyUrl);

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

    sendWelcomeEmail(user).catch(() => {});

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
  const { email } = req.body;
  if (!email || typeof email !== "string") return res.json({ success: true });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:reset:${token}`, String(user._id), "EX", RESET_TTL);

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

    sendPasswordChangedEmail(user).catch(() => {});

    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (err) {
    console.error("[Auth] resetPassword error:", err.message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(req, res) {
  try {
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

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

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
