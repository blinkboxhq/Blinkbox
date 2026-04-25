import Automation from "../../models/automation.model.js";
import User from "../../models/user.model.js";

export async function listCollaborators(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    }).select("collaborators");

    if (!automation) return res.status(404).json({ message: "Automation not found." });

    res.json({ collaborators: automation.collaborators });
  } catch (err) {
    console.error("[collab] listCollaborators:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function addCollaborator(req, res) {
  try {
    const { email, role = "editor" } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Role must be editor or viewer." });
    }

    // Must own the automation to invite
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ message: "Automation not found." });

    // Find the user to invite
    const invitee = await User.findOne({ email: email.toLowerCase().trim() }).select("_id name email avatar picture");
    if (!invitee) return res.status(404).json({ message: "No user with that email found." });

    // Can't add yourself
    if (String(invitee._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You already own this automation." });
    }

    // Idempotent: update role if already present
    const existing = automation.collaborators.find((c) => c.userId === String(invitee._id));
    if (existing) {
      existing.role = role;
    } else {
      automation.collaborators.push({
        userId: String(invitee._id),
        email: invitee.email,
        name: invitee.name,
        avatar: invitee.avatar || "",
        picture: invitee.picture || "",
        role,
      });
    }

    await automation.save();
    res.json({ collaborators: automation.collaborators });
  } catch (err) {
    console.error("[collab] addCollaborator:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function removeCollaborator(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ message: "Automation not found." });

    automation.collaborators = automation.collaborators.filter(
      (c) => c.userId !== req.params.userId,
    );
    await automation.save();

    res.json({ collaborators: automation.collaborators });
  } catch (err) {
    console.error("[collab] removeCollaborator:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}
