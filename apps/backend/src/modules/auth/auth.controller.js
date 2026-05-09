import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../../models/user.model.js";
import { redis } from "../../infra/redis.client.js";
import axios from "axios";
import { JWT_SECRET, BACKEND_URL } from "../../config/env.js";
import { OAuth2Client } from "google-auth-library";

const RESET_TTL = 60 * 15; // 15 minutes

function makeMailer() {
  const from = process.env.ALERT_EMAIL_FROM;
  const pass = process.env.ALERT_EMAIL_PASS;
  if (!from || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user: from, pass } });
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================
// 3. SECURE GOOGLE SSO (supports both flows)
// ==========================================
export async function googleLogin(req, res) {
  try {
    const { credential, access_token } = req.body;

    if (!credential && !access_token) {
      return res.status(400).json({ message: "Google credential missing." });
    }

    let googleId, email, name, given_name, picture;

    if (credential) {
      // Flow 1: GoogleLogin component sends a JWT credential (ID token)
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
      // Flow 2: Legacy popup flow with access_token
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
      // New user — create with Google provider
      user = await User.create({
        name: safeName,
        email,
        authProvider: "google",
        googleId,
        picture,
        role: "user",
      });
    } else if (!user.googleId) {
      // Existing account without Google linked — block the override
      // User must log in with password first, then link Google in settings
      return res.status(403).json({
        message:
          "An account with this email already exists. " +
          "Please log in with your password and link Google in account settings.",
      });
    } else if (user.googleId !== googleId) {
      // Google ID mismatch — someone else's Google account
      return res.status(403).json({
        message: "Google account mismatch. Access denied.",
      });
    }

    // Keep profile picture up to date on each login
    if (picture && user.picture !== picture) {
      user.picture = picture;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Google Authentication successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error.response?.data || error.message);
    res.status(401).json({ message: "Failed to verify Google identity." });
  }
}

// ==========================================
// 1. SECURE REGISTRATION
// ==========================================
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Input validation
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
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      role: "user",
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      message: "Workspace initialized successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error during registration." });
  }
}

// ==========================================
// FORGOT PASSWORD — sends reset link
// ==========================================
export async function forgotPassword(req, res) {
  // Always return 200 to prevent email enumeration
  const { email } = req.body;
  if (!email || typeof email !== "string") return res.json({ success: true });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) return res.json({ success: true }); // Google-only or not found

    const token = crypto.randomBytes(32).toString("hex");
    await redis.set(`bb:reset:${token}`, String(user._id), "EX", RESET_TTL);

    const mailer = makeMailer();
    if (mailer) {
      const resetUrl = `${process.env.VITE_APP_URL || "https://blinkbox.net"}/reset-password?token=${token}`;
      await mailer.sendMail({
        from: `"BlinkBox" <${process.env.ALERT_EMAIL_FROM}>`,
        to: user.email,
        subject: "Reset your BlinkBox password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;padding:32px 24px;background:#0a0a0b;color:#e4e4e7;border-radius:12px">
            <h2 style="color:#fff;margin:0 0 16px">Reset your password</h2>
            <p style="color:#a1a1aa;margin:0 0 24px;line-height:1.6">Click the button below to set a new password. This link expires in 15 minutes.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
            <p style="color:#52525b;margin:24px 0 0;font-size:12px">If you didn't request this, ignore this email — your password hasn't changed.</p>
          </div>
        `,
      }).catch(err => console.error("[Auth] Reset email failed:", err.message));
    }
  } catch (err) {
    console.error("[Auth] forgotPassword error:", err.message);
  }

  res.json({ success: true });
}

// ==========================================
// RESET PASSWORD — validates token, sets new password
// ==========================================
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

    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (err) {
    console.error("[Auth] resetPassword error:", err.message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
}

// ==========================================
// 2. SECURE LOGIN & BOT PROTECTION
// ==========================================
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
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    // Google-only accounts have no password — direct them to Google SSO
    if (!user.password) {
      return res.status(403).json({
        message: "This account uses Google sign-in. Please log in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await redis.set(lockoutKey, "locked", "EX", 15);

      return res.status(401).json({
        message: "Invalid email or password.",
        lockoutTimer: 15,
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Authentication successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal server error during login." });
  }
}
