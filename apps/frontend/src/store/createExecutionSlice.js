import api from "../lib/api";
import { toast } from "sonner";
import { getSocket } from "../lib/socket";

// ─────────────────────────────────────────────────────────────────────────────
// Execution Slice — owns all live telemetry, WebSocket streaming, and
// run/cancel/retry lifecycle.
//
// Two socket channels work in parallel:
//   1. execution:{executionId}  → coarse "execution:update" with full cursor array
//   2. automation:{automationId} → granular "node:status" per-node lifecycle events
//
// The granular channel drives real-time canvas animation (edge flow, node badges)
// while the coarse channel handles terminal state transitions and trace sidebar.
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL = ["executed", "failed", "cancelled", "partial"];

// Status mapping: Temporal → canvas display
const STATUS_MAP = {
  started: "running",
  completed: "completed",
  failed: "failed",
};

export const createExecutionSlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  isRunning: false,
  isExecutionLive: false,
  isTraceSidebarOpen: false,
  liveExecutionState: null,
  executionError: null,

  // Granular per-node status map — populated by node:status socket events.
  // Shape: { [nodeId]: "running" | "completed" | "failed" }
  nodeStatuses: {},

  // Last completed run's per-node output data — used by variable hover preview
  // Shape: { [nodeId]: unknown }
  lastRunOutputs: {},

  // Execution logs fetched after terminal state — used by debugger UI
  // Shape: ExecutionLog[] (node_step + execution_start + execution_end entries)
  executionLogs: [],

  // ── Derived helper: per-node status for O(1) lookups ───────────────────
  // Prefers the granular live map (instant), falls back to cursor array.
  getNodeStatus: (nodeId) => {
    const live = get().nodeStatuses[nodeId];
    if (live) return live;

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
    if (state._subscribedAutomationId) {
      socket.emit("unsubscribe:automation", state._subscribedAutomationId);
    }
    set({
      isExecutionLive: false,
      isTraceSidebarOpen: false,
      liveExecutionState: null,
      executionError: null,
      nodeStatuses: {},
      executionLogs: [],
      _subscribedAutomationId: null,
    });
  },

  closeTraceSidebar: () => set({ isTraceSidebarOpen: false }),

  // ── Watch Automation — called on Canvas mount for scheduled/webhook triggers ──
  // Subscribes to node:status events so any execution (manual or scheduled)
  // shows live animation without the user having to click Run.
  watchAutomation: (automationId) => {
    if (!automationId) return;
    const already = get()._subscribedAutomationId;
    if (already === automationId) return;

    // Unsubscribe previous if switching workflows
    if (already) {
      getSocket().emit("unsubscribe:automation", already);
    }

    _subscribeToNodeStatus(set, get, automationId, true);
  },

  unwatchAutomation: (automationId) => {
    if (!automationId) return;
    getSocket().emit("unsubscribe:automation", automationId);
    set({ _subscribedAutomationId: null, nodeStatuses: {}, isExecutionLive: false });
  },

  // ── Run Engine ────────────────────────────────────────────────────────────
  runEngine: async (automationId) => {
    const state = get();

    // Guard: don't double-run
    if (state.isRunning) {
      toast.info("Execution already in progress.");
      return;
    }

    // Guard: need a trigger node
    const triggerNode = state.nodes.find((n) => n.data.type === "trigger");
    if (!triggerNode) {
      toast.error("No trigger node found. Add a trigger to start.");
      return;
    }

    // Guard: need at least 2 nodes
    if (state.nodes.length < 2) {
      toast.error("Add at least one node after the trigger to run.");
      return;
    }

    set({
      isRunning: true,
      isExecutionLive: true,
      isTraceSidebarOpen: true,
      liveExecutionState: null,
      executionError: null,
      nodeStatuses: {},
    });

    try {
      // Parse test payload with helpful error
      let testPayload = {};
      try {
        const raw = triggerNode?.data?.config?.mockPayload;
        testPayload = raw ? JSON.parse(raw) : { _test: true, triggeredAt: new Date().toISOString() };
      } catch (parseErr) {
        throw new Error(
          `Invalid JSON in test payload: ${parseErr.message}. Fix the JSON in your trigger's "Test JSON Payload" field.`
        );
      }

      // Auto-save before running
      const saveEngine = get().saveEngine;
      if (saveEngine) {
        try { await saveEngine(automationId); } catch { /* don't block execution */ }
      }

      const response = await api.post(
        `/api/automation/${automationId}/execute`,
        testPayload,
        { headers: { "Idempotency-Key": `manual-test-${Date.now()}` } },
      );

      if (!response.data?.execution?._id) {
        throw new Error("Server returned invalid execution response.");
      }

      const executionId = response.data.execution._id;
      set({ liveExecutionState: response.data.execution });

      // Subscribe to both channels
      _subscribeToNodeStatus(set, get, automationId);
      _subscribeToExecution(set, get, executionId, automationId);
    } catch (error) {
      console.error("Execution failed:", error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";
      set({ isRunning: false, executionError: errorMsg });
      toast.error(`Execution failed: ${errorMsg}`);
    }
  },

  // ── Retry Failed Execution ────────────────────────────────────────────────
  retryExecution: async () => {
    const state = get();
    const executionId = state.liveExecutionState?._id;
    if (!executionId) {
      toast.error("No execution to retry.");
      return;
    }

    set({ isRunning: true, executionError: null, nodeStatuses: {} });

    try {
      const response = await api.post(`/api/execution/retry/${executionId}`);
      toast.success(response.data.message || "Retrying failed nodes...");

      const automationId = state._subscribedAutomationId;
      if (automationId) _subscribeToNodeStatus(set, get, automationId);
      _subscribeToExecution(set, get, executionId, automationId);
    } catch (error) {
      set({ isRunning: false });
      toast.error(error.response?.data?.message || "Retry failed.");
    }
  },

  // ── Cancel Running Execution ──────────────────────────────────────────────
  cancelExecution: async () => {
    const state = get();
    const executionId = state.liveExecutionState?._id;
    if (!executionId) return;

    try {
      await api.post(`/api/execution/cancel/${executionId}`);
      set({ isRunning: false });
      toast.info("Execution cancelled.");

      const res = await api.get(`/api/execution/${executionId}`);
      if (res.data.execution) {
        set({ liveExecutionState: res.data.execution });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel.");
    }
  },
});

// ── Granular node:status subscription (canvas animation) ────────────────────

function _subscribeToNodeStatus(set, get, automationId, passive = false) {
  const socket = getSocket();
  socket.emit("subscribe:automation", automationId);
  set({ _subscribedAutomationId: automationId });

  let idleTimer = null;

  const handler = (data) => {
    if (data.automationId !== automationId) return;

    const displayStatus = STATUS_MAP[data.status] || data.status;

    // For passive (scheduled/webhook) runs: auto-activate the live UI
    if (passive && !get().isExecutionLive) {
      set({ isExecutionLive: true, nodeStatuses: {}, lastRunOutputs: {} });
    }

    set((prev) => ({
      nodeStatuses: { ...prev.nodeStatuses, [data.nodeId]: displayStatus },
    }));

    // Auto-deactivate live UI after 4s of silence (execution ended)
    if (passive) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        set({ isExecutionLive: false });
        // Fetch the latest execution logs to populate output previews
        try {
          const state = get();
          const latestExec = state.liveExecutionState?._id;
          if (latestExec) {
            const res = await api.get(`/api/execution/${latestExec}/logs`);
            if (res.data?.logs) {
              const outputs = {};
              for (const log of res.data.logs) {
                if (log.type === "node_step" && log.nodeId && log.output !== undefined) {
                  outputs[log.nodeId] = log.output;
                }
              }
              set({ lastRunOutputs: outputs });
            }
          }
        } catch { /* non-critical */ }
      }, 4000);
    }
  };

  // Remove any stale listener before adding
  socket.off("node:status", handler);
  socket.on("node:status", handler);

  // Store handler ref for cleanup
  set({ _nodeStatusHandler: handler });
}

// ── Coarse execution:update subscription + fallback polling ─────────────────

function _subscribeToExecution(set, get, executionId, automationId) {
  const socket = getSocket();
  socket.emit("subscribe:execution", executionId);

  const handler = (data) => {
    if (data.executionId !== executionId) return;
    set({ liveExecutionState: data });

    if (TERMINAL.includes(data.status)) {
      set({ isRunning: false });
      socket.off("execution:update", handler);
      socket.emit("unsubscribe:execution", executionId);

      // Clean up node:status listener after a brief delay so final animations land
      setTimeout(() => {
        const nodeHandler = get()._nodeStatusHandler;
        if (nodeHandler) socket.off("node:status", nodeHandler);
        if (automationId) socket.emit("unsubscribe:automation", automationId);
      }, 2000);

      // Fetch execution logs for the debugger UI
      api.get(`/api/execution/${executionId}/logs`).then((res) => {
        if (res.data?.logs) {
          const logs = res.data.logs;
          set({ executionLogs: logs });

          // Build lastRunOutputs: { [nodeId]: outputData } from node_step entries
          const outputs = {};
          for (const log of logs) {
            if (log.type === "node_step" && log.nodeId && log.output !== undefined) {
              outputs[log.nodeId] = log.output;
            }
          }
          set({ lastRunOutputs: outputs });
        }
      }).catch(() => {});

      if (data.status === "executed") {
        toast.success("Execution completed successfully.");
      } else if (data.status === "failed") {
        const failedCursors = data.cursors?.filter((c) => c.status === "failed") || [];
        const firstError = failedCursors[0]?.errorMessage;
        toast.error(firstError ? `Failed: ${firstError.slice(0, 120)}` : "Execution failed. Check trace.");
      }
    }
  };
  socket.on("execution:update", handler);

  // Fallback poll
  const POLL_BASE = 2000;
  const POLL_CAP = 15000;
  const POLL_MAX = 15;
  let attempt = 0;

  const poll = async () => {
    if (!get().isRunning) return;
    try {
      const res = await api.get(`/api/execution/${executionId}`);
      const execution = res.data.execution;
      if (execution) {
        set({ liveExecutionState: execution });
        if (TERMINAL.includes(execution.status)) {
          set({ isRunning: false });
          socket.off("execution:update", handler);
          socket.emit("unsubscribe:execution", executionId);
          return;
        }
      }
    } catch { /* continue polling */ }
    if (++attempt >= POLL_MAX) {
      set({ isRunning: false });
      toast.error("Execution is taking too long. Check trace sidebar.");
      return;
    }
    setTimeout(poll, Math.min(POLL_BASE * Math.pow(1.5, attempt), POLL_CAP));
  };
  setTimeout(poll, POLL_BASE);
}
