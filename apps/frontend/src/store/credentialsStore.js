import { create } from "zustand";
import api from "../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Credentials Store — one shared list for every consumer.
//
// CredentialPicker, OAuthConnectButton and VaultManager all read from here, so
// creating/updating/deleting a credential anywhere is reflected everywhere with
// no page refresh. Any mutation should call ensureFresh()/refresh() or push the
// returned entity through the local upsert/remove helpers below.
// ─────────────────────────────────────────────────────────────────────────────

let inFlight = null;

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
}));

export default useCredentialsStore;
