import jwt from "jsonwebtoken";
import { JWT_SECRET, SELF_HOSTED } from "../../config/env.js";
import { redis } from "../../infra/redis.client.js";

// resetOwner.js stamps this key when it issues a new password. Any token minted
// before that moment is dead — otherwise recovering from a stolen password
// would leave the thief's existing session alive for the rest of its 24 hours.
async function tokenPredatesReset(decoded) {
  if (!SELF_HOSTED || !decoded.iat) return false;
  try {
    const epoch = await redis.get(`bb:token-epoch:${decoded.id}`);
    return !!epoch && decoded.iat * 1000 < Number(epoch);
  } catch {
    return false;
  }
}

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Access Denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Scoped tokens exist for one call only. A bootstrap login issues
    // scope="password_change", and it must not act as a general session — an
    // un-rotated installer password would otherwise unlock the whole API.
    if (decoded.scope) {
      return res.status(403).json({
        message: "This session must finish setting a password first.",
        mustChangePassword: true,
      });
    }

    if (await tokenPredatesReset(decoded)) {
      return res.status(401).json({ message: "Session ended. Sign in again." });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

// The single route a password_change-scoped token is allowed to reach.
export async function verifyPasswordChangeToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    if (decoded.scope && decoded.scope !== "password_change") {
      return res.status(403).json({ message: "Wrong token scope." });
    }
    if (await tokenPredatesReset(decoded)) {
      return res.status(401).json({ message: "Session ended. Sign in again." });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
