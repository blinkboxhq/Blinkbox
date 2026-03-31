import api from "../lib/api";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// UI Slice — owns sidebar selection, workflow metadata, and API persistence.
// Isolated so that opening/closing sidebars or saving never causes canvas
// re-renders.
// ─────────────────────────────────────────────────────────────────────────────

export const createUISlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  selectedNodeId: null,
  isRightSidebarOpen: false,
  isTriggerPickerOpen: false,
  workflowName: "Loading...",
  isSaving: false,
  isLoading: true,
  addNodeSource: null, // nodeId that triggered "Add Next Step" modal
  insertEdgeId: null, // edgeId when inserting node between two nodes

  // ── Actions ──────────────────────────────────────────────────────────────
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),
  setTriggerPickerOpen: (isOpen) => set({ isTriggerPickerOpen: isOpen }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setAddNodeSource: (nodeId) =>
    set({ addNodeSource: nodeId, insertEdgeId: null }),
  setInsertOnEdge: (edgeId) =>
    set({ insertEdgeId: edgeId, addNodeSource: "__edge__" }),
  clearAddNodeModal: () => set({ addNodeSource: null, insertEdgeId: null }),

  // ── API: Load Workflow ───────────────────────────────────────────────────
  loadEngine: async (automationId) => {
    set({ isLoading: true });
    try {
      const response = await api.get("/api/automation");
      const workflow = response.data.automations.find(
        (a) => a._id === automationId,
      );
      if (!workflow) throw new Error("Workflow not found");

      // Normalize legacy node types to current frontend names
      const LEGACY_TYPE_MAP = {
        advanced_scraper: "web_scraper",
        informer: "web_scraper",
        set_fields: "data_mapper",
        transform: "data_mapper",
        filter: "data_mapper",
        if_condition: "logic_router",
      };

      const loadedNodes = workflow.nodes.map((n, index) => {
        const resolvedType = LEGACY_TYPE_MAP[n.type] || n.type;
        return {
          id: n.id,
          type: "custom",
          position: n.position || { x: 400 + index * 250, y: 350 },
          data: {
            label: n.description || resolvedType,
            backendType: resolvedType,
            type:
              resolvedType === "manual" ||
              resolvedType === "webhook" ||
              resolvedType === "cron_trigger"
                ? "trigger"
                : "action",
            config: n.data || {},
          },
        };
      });

      const loadedEdges = workflow.edges.map((e) => ({
        id: e.id || `edge-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        type: "configurable",
        data: { conditionPath: e.conditionPath || "" },
        style: {},
      }));

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
        name: state.workflowName,
        trigger: entryNode.data.backendType,
        entryNodeId: entryNode.id,
        nodes: state.nodes.map((n) => ({
          id: n.id,
          type: n.data.backendType,
          data: n.data.config || {},
          description: n.data.label,
          position: n.position,
        })),
        edges: state.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null,
          type: "onSuccess",
          conditionPath: e.data?.conditionPath || "",
        })),
      };

      await api.put(`/api/automation/${automationId}`, payload);
      toast.success("Workflow saved");
    } catch (error) {
      toast.error(
        "Save failed: " + (error.response?.data?.message || error.message),
      );
    } finally {
      set({ isSaving: false });
    }
  },
});
