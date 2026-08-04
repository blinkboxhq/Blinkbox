import { io } from "socket.io-client";
import { API_BASE as API_URL } from "../config/selfHost";

let socket = null;

export function getSocket() {
  const token = localStorage.getItem("blinkbox_token");

  if (socket) {
    // If token changed (e.g. after login) update auth and reconnect
    if (socket.auth?.token !== token) {
      socket.auth = { token };
      socket.disconnect().connect();
    }
    return socket;
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
