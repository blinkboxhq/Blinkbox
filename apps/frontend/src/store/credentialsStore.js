import { create } from "zustand";
import api from "../lib/api";
import { getSocket } from "../lib/socket";

// ─────────────────────────────────────────────────────────────────────────────
// Credentials Store — one shared list for every consumer.
//
// CredentialPicker, OAuthConnectButton and VaultManager all read from here, so
// creating/updating/deleting a credential anywhere is reflected everywhere with
// no page refresh. It also subscribes to the server's `credential:*` socket
// events and to window focus, so changes made in another tab, on another device,
// or by a collaborator show up live too.
// ─────────────────────────────────────────────────────────────────────────────

let inFlight = null;
let liveWired = false;

const useCredentialsStore = create((set, get) => ({
  credentials: [],
  isLoading: false,
  loadedOnce: false,

  refresh: async () => {
    if (inFlight) return inFlight;
    set({ isLoading: true });
    inFlight = api
      .get("/api/credentials")
      .then((res) => {
        set({ credentials: res.data.credentials || [], isLoading: false, loadedOnce: true });
      })
      .catch(() => {
        set({ isLoading: false, loadedOnce: true });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },

  // Fetch once on first mount; later mounts reuse the cached list.
  ensureFresh: () => {
    get().wireLive();
    if (get().loadedOnce || inFlight) return;
    get().refresh();
  },

  upsert: (cred) =>
    set((s) => {
      if (!cred?._id) return s;
      const exists = s.credentials.some((c) => c._id === cred._id);
      return {
        credentials: exists
          ? s.credentials.map((c) => (c._id === cred._id ? cred : c))
          : [cred, ...s.credentials],
      };
    }),

  remove: (id) => set((s) => ({ credentials: s.credentials.filter((c) => c._id !== id) })),

  // Keep the shared list live across tabs, devices and collaborators. Wired once.
  wireLive: () => {
    if (liveWired) return;
    liveWired = true;
    try {
      const socket = getSocket();
      socket.on("credential:created", ({ credential }) => get().upsert(credential));
      socket.on("credential:updated", ({ credential }) => get().upsert(credential));
      socket.on("credential:deleted", ({ id }) => get().remove(id));
    } catch { /* socket unavailable */ }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        if (get().loadedOnce) get().refresh();
      });
    }
  },
}));

export default useCredentialsStore;
