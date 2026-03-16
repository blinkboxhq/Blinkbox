import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

let io = null;

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
    transports: ["websocket", "polling"],
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
    // Join user-specific room for targeted events
    socket.join(`user:${socket.userId}`);

    socket.on("subscribe:execution", (executionId) => {
      socket.join(`execution:${executionId}`);
    });

    socket.on("unsubscribe:execution", (executionId) => {
      socket.leave(`execution:${executionId}`);
    });

    socket.on("disconnect", () => {
      // Cleanup handled by socket.io automatically
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

export function getIO() {
  return io;
}

// Emit execution state updates to subscribers
export function emitExecutionUpdate(executionId, data) {
  if (!io) return;
  io.to(`execution:${executionId}`).emit("execution:update", data);
}

// Emit workspace-level events (e.g. admin stats push)
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
