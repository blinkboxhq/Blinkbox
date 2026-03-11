import api from "../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// UI Slice — owns sidebar selection, workflow metadata, and API persistence.
// Isolated so that opening/closing sidebars or saving never causes canvas
// re-renders.
// ─────────────────────────────────────────────────────────────────────────────

export const createUISlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  selectedNodeId: null,
  workflowName: "Loading...",
  isSaving: false,
  isLoading: true,

  // ── Actions ──────────────────────────────────────────────────────────────
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setWorkflowName: (name) => set({ workflowName: name }),

  // ── API: Load Workflow ───────────────────────────────────────────────────
  loadEngine: async (automationId) => {
    set({ isLoading: true });
    try {
      const response = await api.get("/api/automation");
      const workflow = response.data.automations.find(
        (a) => a._id === automationId,
      );
      if (!workflow) throw new Error("Workflow not found");

      const loadedNodes = workflow.nodes.map((n, index) => ({
        id: n.id,
        type: "custom",
        position: n.position || { x: 400 + index * 250, y: 350 },
        data: {
          label: n.description || n.type,
          backendType: n.type,
          type: n.type === "manual" || n.type === "webhook" || n.type === "cron_trigger"
            ? "trigger"
            : "action",
          config: n.config || {},
        },
      }));

      const loadedEdges = workflow.edges.map((e) => ({
        id: `edge-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        type: "configurable",
        data: { conditionPath: e.conditionPath || "" },
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      }));

      // Always guarantee at least one trigger
      if (loadedNodes.length === 0) {
        loadedNodes.push({
          id: "trigger-1",
          type: "custom",
          position: { x: 400, y: 350 },
          data: {
            label: "Manual Trigger",
            backendType: "manual",
            type: "trigger",
            config: {},
          },
        });
      }

      // Cross-slice write: update graph + UI in one atomic set
      set({
        nodes: loadedNodes,
        edges: loadedEdges,
        workflowName: workflow.name,
        isLoading: false,
      });
    } catch (error) {
      console.error("Load error:", error);
      set({ isLoading: false });
    }
  },

  // ── API: Save Workflow ───────────────────────────────────────────────────
  saveEngine: async (automationId) => {
    const state = get();
    set({ isSaving: true });
    try {
      const entryNode = state.nodes.find((n) => n.data.type === "trigger");
      if (!entryNode)
        throw new Error("A Trigger node is required to save the workflow.");

      const payload = {
        entryNodeId: entryNode.id,
        nodes: state.nodes.map((n) => ({
          id: n.id,
          type: n.data.backendType,
          config: n.data.config || {},
          description: n.data.label,
          position: n.position,
        })),
        edges: state.edges.map((e) => ({
          from: e.source,
          to: e.target,
          type: "onSuccess",
          conditionPath: e.data?.conditionPath || "",
        })),
      };

      await api.put(`/api/automation/${automationId}`, payload);
      alert("Workflow saved successfully.");
    } catch (error) {
      alert(
        "Save failed: " + (error.response?.data?.message || error.message),
      );
    } finally {
      set({ isSaving: false });
    }
  },
});
