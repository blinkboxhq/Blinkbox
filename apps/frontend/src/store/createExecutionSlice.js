import api from "../lib/api";
import { toast } from "sonner";
import { getSocket } from "../lib/socket";

// ─────────────────────────────────────────────────────────────────────────────
// Execution Slice — owns all live telemetry, WebSocket streaming, and
// run/cancel lifecycle.  Canvas never re-renders from execution state changes
// because this slice is subscribed separately via selectors.
// ─────────────────────────────────────────────────────────────────────────────

export const createExecutionSlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  isRunning: false,
  isExecutionLive: false,
  isTraceSidebarOpen: false,
  liveExecutionState: null,

  // ── Derived helper: per-node status map for O(1) lookups ─────────────────
  getNodeStatus: (nodeId) => {
    const state = get().liveExecutionState;
    if (!state?.cursors) return null;
    const cursor = state.cursors.find((c) => c.nodeId === nodeId);
    return cursor?.status || null;
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  closeLiveExecution: () => {
    const socket = getSocket();
    const state = get();
    if (state.liveExecutionState?._id) {
      socket.emit("unsubscribe:execution", state.liveExecutionState._id);
    }
    set({ isExecutionLive: false, isTraceSidebarOpen: false, liveExecutionState: null });
  },

  closeTraceSidebar: () => set({ isTraceSidebarOpen: false }),

  runEngine: async (automationId) => {
    set({ isRunning: true, isExecutionLive: true, isTraceSidebarOpen: true, liveExecutionState: null });

    try {
      const state = get();
      const entryNode = state.nodes.find((n) => n.data.type === "trigger");

      let testPayload = {};
      try {
        const raw = entryNode?.data?.config?.mockPayload;
        testPayload = raw ? JSON.parse(raw) : { status: "empty_test" };
      } catch {
        throw new Error("Invalid JSON in test payload.");
      }

      const response = await api.post(
        `/api/automation/${automationId}/execute`,
        testPayload,
        { headers: { "Idempotency-Key": `manual-test-${Date.now()}` } },
      );

      const executionId = response.data.execution._id;
      const socket = getSocket();
      socket.emit("subscribe:execution", executionId);

      const handler = (data) => {
        if (data.executionId !== executionId) return;
        set({ liveExecutionState: data });

        if (["executed", "failed", "cancelled", "partial"].includes(data.status)) {
          set({ isRunning: false });
          socket.off("execution:update", handler);
          socket.emit("unsubscribe:execution", executionId);
        }
      };
      socket.on("execution:update", handler);

      // Fallback poll if WebSocket is slow or Socket.io is blocked
      setTimeout(async () => {
        const current = get();
        if (!current.isRunning) return;
        try {
          const res = await api.get(`/api/execution/${executionId}`);
          const execution = res.data.execution;
          set({ liveExecutionState: execution });
          if (["executed", "failed", "cancelled", "partial"].includes(execution?.status)) {
            set({ isRunning: false });
            socket.off("execution:update", handler);
          }
        } catch {
          /* WebSocket will handle it */
        }
      }, 3000);
    } catch (error) {
      console.error("Execution failed:", error);
      set({ isRunning: false, isExecutionLive: false });
      toast.error(
        "Execution failed: " +
          (error.response?.data?.message || error.message),
      );
    }
  },
});
