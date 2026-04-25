import User from "../../models/user.model.js";

const AVATAR_MAX_BYTES = 200_000; // 200 KB limit for base64 avatar

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "",
      picture: user.picture || "",
      authProvider: user.authProvider,
    });
  } catch (err) {
    console.error("[profile] getProfile error:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, avatar } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
        return res.status(400).json({ message: "Name must be 1–100 characters." });
      }
      updates.name = name.trim();
    }

    if (avatar !== undefined) {
      if (avatar !== "" && typeof avatar === "string") {
        if (!avatar.startsWith("data:image/")) {
          return res.status(400).json({ message: "Avatar must be a data URL." });
        }
        const byteLen = Buffer.byteLength(avatar, "utf8");
        if (byteLen > AVATAR_MAX_BYTES) {
          return res.status(400).json({ message: "Avatar is too large (max 200 KB)." });
        }
      }
      updates.avatar = avatar;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update." });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "",
      picture: user.picture || "",
    });
  } catch (err) {
    console.error("[profile] updateProfile error:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}
