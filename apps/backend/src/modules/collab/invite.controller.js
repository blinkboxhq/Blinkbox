import CollabInvite from "../../models/collabInvite.model.js";
import Automation from "../../models/automation.model.js";
import User from "../../models/user.model.js";
import { emitToUser } from "../../infra/socket.server.js";

// ── Send invite ───────────────────────────────────────────────────────────────
export async function sendInvite(req, res) {
  try {
    const { automationId, email, role = "editor" } = req.body;

    if (!automationId || !email) {
      return res.status(400).json({ message: "automationId and email are required." });
    }
    if (!["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "role must be editor or viewer." });
    }

    // Only the automation owner can invite
    const automation = await Automation.findOne({
      _id: automationId,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ message: "Automation not found." });

    // Find the invitee
    const invitee = await User.findOne({ email: email.toLowerCase().trim() }).select("_id name email avatar picture");
    if (!invitee) return res.status(404).json({ message: "No user with that email found." });

    if (String(invitee._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot invite yourself." });
    }

    // Don't re-invite if already a collaborator
    const alreadyCollab = automation.collaborators.some(c => c.userId === String(invitee._id));
    if (alreadyCollab) {
      return res.status(409).json({ message: "This user is already a collaborator." });
    }

    // Upsert: if a pending invite already exists, just update the role
    let invite = await CollabInvite.findOne({
      automationId,
      toUserId: String(invitee._id),
      status: "pending",
    });

    if (invite) {
      invite.role = role;
      await invite.save();
    } else {
      const sender = await User.findById(req.user.id).select("name avatar picture");
      invite = await CollabInvite.create({
        automationId,
        automationName: automation.name,
        fromUserId:    String(req.user.id),
        fromUserName:  sender?.name || "Someone",
        fromUserAvatar: sender?.avatar || sender?.picture || "",
        toUserId:  String(invitee._id),
        toEmail:   invitee.email,
        role,
      });
    }

    // Push real-time notification to the invitee
    emitToUser(String(invitee._id), "collab:invite", {
      invite: {
        _id:            invite._id,
        automationId:   String(automationId),
        automationName: automation.name,
        fromUserName:   invite.fromUserName,
        fromUserAvatar: invite.fromUserAvatar,
        role,
        createdAt:      invite.createdAt,
      },
    });

    res.json({ success: true, invite });
  } catch (err) {
    console.error("[invite] sendInvite:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

// ── List my pending invites (recipient view) ──────────────────────────────────
export async function listMyInvites(req, res) {
  try {
    const invites = await CollabInvite.find({
      toUserId: String(req.user.id),
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json({ invites });
  } catch (err) {
    console.error("[invite] listMyInvites:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

// ── List invites I sent for a specific automation (owner view) ────────────────
export async function listSentInvites(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.automationId,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ message: "Automation not found." });

    const invites = await CollabInvite.find({
      automationId: req.params.automationId,
      fromUserId: String(req.user.id),
    }).sort({ createdAt: -1 });

    res.json({ invites });
  } catch (err) {
    console.error("[invite] listSentInvites:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

// ── Accept invite ─────────────────────────────────────────────────────────────
export async function acceptInvite(req, res) {
  try {
    const invite = await CollabInvite.findOne({
      _id: req.params.id,
      toUserId: String(req.user.id),
      status: "pending",
    });
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    const me = await User.findById(req.user.id).select("name email avatar picture");

    // Add to automation collaborators (idempotent)
    const automation = await Automation.findById(invite.automationId);
    if (automation) {
      const already = automation.collaborators.some(c => c.userId === String(req.user.id));
      if (!already) {
        automation.collaborators.push({
          userId:  String(req.user.id),
          email:   me.email,
          name:    me.name,
          avatar:  me.avatar || "",
          picture: me.picture || "",
          role:    invite.role,
        });
        await automation.save();
      }
    }

    invite.status = "accepted";
    await invite.save();

    // Notify the sender that their invite was accepted
    emitToUser(invite.fromUserId, "collab:invite_accepted", {
      automationId:   String(invite.automationId),
      automationName: invite.automationName,
      byUserName:     me?.name || "Someone",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[invite] acceptInvite:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

// ── Reject invite ─────────────────────────────────────────────────────────────
export async function rejectInvite(req, res) {
  try {
    const invite = await CollabInvite.findOne({
      _id: req.params.id,
      toUserId: String(req.user.id),
      status: "pending",
    });
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    invite.status = "rejected";
    await invite.save();

    res.json({ success: true });
  } catch (err) {
    console.error("[invite] rejectInvite:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}

// ── Cancel (withdraw) an invite — sender only ─────────────────────────────────
export async function cancelInvite(req, res) {
  try {
    const invite = await CollabInvite.findOne({
      _id: req.params.id,
      fromUserId: String(req.user.id),
    });
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    await invite.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("[invite] cancelInvite:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
}
