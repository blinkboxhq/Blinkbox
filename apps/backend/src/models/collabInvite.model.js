import mongoose from "mongoose";

const CollabInviteSchema = new mongoose.Schema(
  {
    automationId:   { type: mongoose.Schema.Types.ObjectId, ref: "Automation", required: true, index: true },
    automationName: { type: String, default: "" },

    // Sender
    fromUserId:    { type: String, required: true },
    fromUserName:  { type: String, default: "" },
    fromUserAvatar:{ type: String, default: "" },

    // Recipient
    toUserId:  { type: String, required: true, index: true },
    toEmail:   { type: String, required: true },

    role:   { type: String, enum: ["editor", "viewer"], default: "editor" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
  },
  { timestamps: true },
);

// Prevent duplicate pending invites for the same automation+recipient
CollabInviteSchema.index({ automationId: 1, toUserId: 1, status: 1 });
// Support listSentInvites and cancelInvite queries
CollabInviteSchema.index({ fromUserId: 1, automationId: 1 });

export default mongoose.model("CollabInvite", CollabInviteSchema);
