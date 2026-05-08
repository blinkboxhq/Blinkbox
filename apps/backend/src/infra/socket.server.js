import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

let io = null;

// In-memory presence map: automationId → Map(userId → { userId, name, avatar, color, socketId })
const roomPresence = new Map();

const USER_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#0891b2", "#65a30d", "#ea580c",
];

function getColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getPresenceList(automationId) {
  const room = roomPresence.get(automationId);
  if (!room) return [];
  return Array.from(room.values());
}

export function initSocketServer(httpServer) {
  const ALLOWED_ORIGINS = (
    process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://localhost:5174,http://localhost:3001,https://blinkbox.net,https://www.blinkbox.net"
  )
    .split(",")
    .map((o) => o.trim().replace(/['"]/g, "").replace(/\/$/, ""));

  io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    // ── Execution subscriptions ───────────────────────────────────────────────
    socket.on("subscribe:execution", (executionId) => {
      socket.join(`execution:${executionId}`);
    });

    socket.on("unsubscribe:execution", (executionId) => {
      socket.leave(`execution:${executionId}`);
    });

    socket.on("subscribe:automation", (automationId) => {
      socket.join(`automation:${automationId}`);
    });

    socket.on("unsubscribe:automation", (automationId) => {
      socket.leave(`automation:${automationId}`);
    });

    // ── Collaboration: join canvas room ───────────────────────────────────────
    socket.on("collab:join", ({ automationId, name, avatar }) => {
      if (!automationId) return;
      socket.join(`collab:${automationId}`);
      socket._collabRoomId = automationId;

      if (!roomPresence.has(automationId)) roomPresence.set(automationId, new Map());
      const room = roomPresence.get(automationId);

      room.set(socket.userId, {
        userId: socket.userId,
        name: name || "Anonymous",
        avatar: avatar || "",
        color: getColor(socket.userId),
        socketId: socket.id,
      });

      // Send current presence snapshot to the newcomer
      socket.emit("collab:presence", getPresenceList(automationId));

      // Broadcast updated presence to everyone else in the room
      socket.to(`collab:${automationId}`).emit("collab:presence", getPresenceList(automationId));
    });

    // ── Collaboration: leave canvas room ─────────────────────────────────────
    socket.on("collab:leave", ({ automationId }) => {
      _removeFromPresence(socket, automationId);
    });

    // ── Collaboration: broadcast node move to peers ───────────────────────────
    // The emitting client should NOT re-apply its own move, so we broadcast
    // to everyone in the room EXCEPT the sender (socket.to(...)).
    socket.on("collab:node_move", ({ automationId, nodeId, position }) => {
      if (!automationId || !nodeId || !position) return;
      socket.to(`collab:${automationId}`).emit("collab:node_move", {
        nodeId,
        position,
        userId: socket.userId,
      });
    });

    // ── Instant graph broadcast (add/delete node, edge change) ───────────────
    // Client pushes its current nodes+edges; server relays to everyone else.
    // This is NOT a save — just live canvas sync between collaborators.
    socket.on("collab:graph_push", ({ automationId, nodes, edges }) => {
      if (!automationId) return;
      socket.to(`collab:${automationId}`).emit("collab:graph_sync", {
        automationId,
        nodes,
        edges,
        savedBy: socket.userId, // used by receiver to skip self-echo
      });
    });

    // ── Collaboration DM chat ────────────────────────────────────────────────
    socket.on("collab:dm_send", ({ toUserId, text, automationId }) => {
      if (!text?.trim() || !toUserId) return;

      const room = roomPresence.get(automationId);
      const sender = room?.get(socket.userId);

      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromUserId: socket.userId,
        fromName:   sender?.name   || "Unknown",
        fromAvatar: sender?.avatar || "",
        fromColor:  sender?.color  || "#7c3aed",
        toUserId,
        automationId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Deliver to recipient
      io.to(`user:${toUserId}`).emit("collab:dm", msg);
      // Echo back to sender so they see their own message
      socket.emit("collab:dm", { ...msg, isSelf: true });
    });

    // ── Cleanup on disconnect ─────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket._collabRoomId) {
        _removeFromPresence(socket, socket._collabRoomId);
      }
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

function _removeFromPresence(socket, automationId) {
  const room = roomPresence.get(automationId);
  if (!room) return;
  room.delete(socket.userId);
  if (room.size === 0) roomPresence.delete(automationId);
  // Broadcast updated presence list
  if (io) {
    io.to(`collab:${automationId}`).emit("collab:presence", getPresenceList(automationId));
  }
  socket.leave(`collab:${automationId}`);
}

export function getIO() {
  return io;
}

export function emitExecutionUpdate(executionId, data) {
  if (!io) return;
  io.to(`execution:${executionId}`).emit("execution:update", data);
}

export function emitNodeStatus(automationId, data) {
  if (!io) return;
  io.to(`automation:${automationId}`).emit("node:status", data);
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Broadcast to everyone in a collab room (used after saves to sync the graph)
export function emitToCollabRoom(automationId, event, data) {
  if (!io) return;
  io.to(`collab:${automationId}`).emit(event, data);
}
