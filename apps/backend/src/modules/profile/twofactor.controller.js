import bcrypt from "bcrypt";
import QRCode from "qrcode";
import User from "../../models/user.model.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import { generateSecret, verifyToken, keyuri } from "../../utils/totp.js";

// Pending (not-yet-confirmed) secrets live only in memory between start/enable.
// Keyed by userId; cleared on enable, disable, or TTL expiry.
const pendingSecrets = new Map();
const PENDING_TTL = 10 * 60 * 1000;

function setPending(userId, secret) {
  pendingSecrets.set(String(userId), { secret, expires: Date.now() + PENDING_TTL });
}

function getPending(userId) {
  const entry = pendingSecrets.get(String(userId));
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    pendingSecrets.delete(String(userId));
    return null;
  }
  return entry.secret;
}

export async function startTwoFactor(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled." });
    }

    const secret = generateSecret();
    setPending(user._id, secret);

    const uri = keyuri(secret, user.email);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

    res.json({ qr, secret, uri });
  } catch (err) {
    console.error("[2fa] start error:", err.message);
    res.status(500).json({ message: "Failed to start two-factor setup." });
  }
}

export async function enableTwoFactor(req, res) {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled." });
    }

    const secret = getPending(user._id);
    if (!secret) {
      return res.status(400).json({ message: "Setup session expired. Please start again." });
    }

    if (!verifyToken(token, secret)) {
      return res.status(401).json({ message: "Invalid code. Check your authenticator app and try again." });
    }

    const enc = encrypt(secret);
    user.twoFactorSecret = { encryptedData: enc.encryptedData, iv: enc.iv, authTag: enc.authTag };
    user.twoFactorEnabled = true;
    await user.save();
    pendingSecrets.delete(String(user._id));

    res.json({ success: true, message: "Two-factor authentication enabled." });
  } catch (err) {
    console.error("[2fa] enable error:", err.message);
    res.status(500).json({ message: "Failed to enable two-factor authentication." });
  }
}

export async function disableTwoFactor(req, res) {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user.id).select("+twoFactorSecret +password");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is not enabled." });
    }

    // Verify ownership: local accounts confirm with password, all accounts can
    // alternatively confirm with a current authenticator code.
    let verified = false;
    if (password && user.password) {
      verified = await bcrypt.compare(password, user.password);
    }
    if (!verified && token && user.twoFactorSecret) {
      const secret = decrypt(
        user.twoFactorSecret.encryptedData,
        user.twoFactorSecret.iv,
        user.twoFactorSecret.authTag,
      );
      verified = verifyToken(token, secret);
    }

    if (!verified) {
      return res.status(401).json({ message: "Verification failed. Enter your password or a current code." });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ success: true, message: "Two-factor authentication disabled." });
  } catch (err) {
    console.error("[2fa] disable error:", err.message);
    res.status(500).json({ message: "Failed to disable two-factor authentication." });
  }
}
