import api from "../lib/api";
import { toast } from "sonner";
import { playBottomPanel, playConnect } from "../lib/sounds";
import { TRIGGER_VARIANTS } from "../pages/Workspace/triggerVariants";

// Build a reverse map: backendType → first matching variantId
// (used to restore triggerVariant on load when it wasn't saved to backend)
const BACKEND_TYPE_TO_VARIANT = {};
for (const [id, v] of Object.entries(TRIGGER_VARIANTS)) {
  if (!BACKEND_TYPE_TO_VARIANT[v.backendType]) {
    BACKEND_TYPE_TO_VARIANT[v.backendType] = id;
  }
}

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
  isAddNodeOpen: false,
  isBrianOpen: false,
  panels: { leftSidebar: true, bottomChat: false },
  workflowName: "Loading...",
  isActive: false,
  isSaving: false,
  isActivating: false,
  isLoading: true,
  addNodeSource: null,
  insertEdgeId: null,
  isAgentPickerOpen: false,
  agentPickerParentId: null,
  suggestionNode: null,

  // ── Actions ──────────────────────────────────────────────────────────────
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),
  setTriggerPickerOpen: (isOpen) => set({ isTriggerPickerOpen: isOpen, ...(isOpen ? { isAddNodeOpen: false } : {}) }),
  setAddNodeOpen: (isOpen) => set({ isAddNodeOpen: isOpen, ...(isOpen ? { isTriggerPickerOpen: false } : {}) }),
  setBrianOpen: (isOpen) => { if (isOpen) playBottomPanel(); set({ isBrianOpen: isOpen }); },
  togglePanel: (key) => set(s => {
    const opening = !s.panels[key];
    if (opening) playBottomPanel();
    return { panels: { ...s.panels, [key]: opening } };
  }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setAddNodeSource: (nodeId) =>
    set({ addNodeSource: nodeId, insertEdgeId: null, isAddNodeOpen: true, isTriggerPickerOpen: false, selectedNodeId: null }),
  setInsertOnEdge: (edgeId) =>
    set({ insertEdgeId: edgeId, addNodeSource: "__edge__", isAddNodeOpen: true, isTriggerPickerOpen: false, selectedNodeId: null }),
  clearAddNodeModal: () => set({ addNodeSource: null, insertEdgeId: null, isAddNodeOpen: false }),
  openAgentPicker: (parentId) => set({ isAgentPickerOpen: true, agentPickerParentId: parentId, isAddNodeOpen: false, isTriggerPickerOpen: false }),
  closeAgentPicker: () => set({ isAgentPickerOpen: false, agentPickerParentId: null }),
  setSuggestionNode: (node) => set({ suggestionNode: node }),
  clearSuggestionNode: () => set({ suggestionNode: null }),
  acceptSuggestion: (sourceNodeId, suggData) => {
    const { nodes } = get();
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) { set({ suggestionNode: null }); return; }
    const newId = `${suggData.backendType}-${crypto.randomUUID()}`;
    const position = suggData.suggestionPosition || { x: sourceNode.position.x, y: sourceNode.position.y + 220 };
    set(state => ({
      nodes: [...state.nodes, {
        id: newId, type: 'custom', position,
        data: { label: suggData.label, backendType: suggData.backendType, type: 'action', config: {} },
      }],
      edges: [...state.edges, {
        id: `e-${sourceNodeId}-${newId}`,
        source: sourceNodeId, target: newId,
        type: 'configurable', data: { conditionPath: '' }, style: {},
      }],
      suggestionNode: null,
    }));
    playConnect();
  },

  // ── API: Load Workflow ───────────────────────────────────────────────────
  loadEngine: async (automationId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/automation/${automationId}`);
      const workflow = response.data.automation;
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
        const isTriggerNode = resolvedType.endsWith("_trigger") ||
          resolvedType === "manual" ||
          resolvedType === "webhook";

        // Restore triggerVariant if the backend didn't store it.
        // The variant is in config when saving (TriggerPicker sets it) but for
        // automations created before this fix, or on first load, we derive it
        // from backendType. The !config.triggerVariant guard preserves
        // ambiguous variants like "chat" / "email" (both backendType "webhook")
        // which do have triggerVariant saved in their config.
        const config = { ...(n.data || {}) };
        if (isTriggerNode && !config.triggerVariant) {
          const variantId = BACKEND_TYPE_TO_VARIANT[resolvedType];
          if (variantId) config.triggerVariant = variantId;
        }

        return {
          id: n.id,
          type: "custom",
          position: n.position || { x: 400 + index * 250, y: 350 },
          data: {
            label: n.description || resolvedType,
            backendType: resolvedType,
            type: isTriggerNode ? "trigger" : "action",
            config,
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
        isActive: workflow.active === true || workflow.status === "active",
        isLoading: false,
      });
    } catch (error) {
      console.error("Load error:", error);
      const status = error.response?.status;
      if (status === 404) {
        toast.error("Workflow not found — it may have been deleted.");
      } else if (status === 403) {
        toast.error("Access denied — you don't have permission to view this workflow.");
      } else {
        toast.error("Failed to load workflow. Check your connection and try again.");
      }
      set({ isLoading: false });
    }
  },

  // ── API: Activate / Deactivate Workflow ─────────────────────────────────
  activateEngine: async (automationId) => {
    const { isActive } = get();
    set({ isActivating: true });
    try {
      if (isActive) {
        await api.post(`/api/automation/${automationId}/deactivate`);
        set({ isActive: false });
        toast.success("Workflow deactivated");
      } else {
        await api.post(`/api/automation/${automationId}/activate`);
        set({ isActive: true });
        toast.success("Workflow activated — trigger is now live");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update workflow status");
    } finally {
      set({ isActivating: false });
    }
  },

  // ── Thumbnail generation ─────────────────────────────────────────────────
  generateThumbnail: (nodes, edges) => {
    if (!nodes?.length) return '';
    const W = 345, H = 215, PAD = 24, SIZE = 28;
    const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#22c55e','#06b6d4','#ec4899','#f97316','#a855f7','#14b8a6'];
    const typeColor = t => { let h = 0; for (const c of (t||'')) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return COLORS[h % COLORS.length]; };
    const xs = nodes.map(n => n.position?.x ?? 0);
    const ys = nodes.map(n => n.position?.y ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const scale = Math.min((W - PAD * 2 - SIZE) / rangeX, (H - PAD * 2 - SIZE) / rangeY, 1.6);
    const scaledW = rangeX * scale + SIZE, scaledH = rangeY * scale + SIZE;
    const ox = (W - scaledW) / 2, oy = (H - scaledH) / 2;
    const mapped = nodes.map(n => ({ ...n, px: ox + ((n.position?.x??0) - minX) * scale, py: oy + ((n.position?.y??0) - minY) * scale }));
    const byId = Object.fromEntries(mapped.map(n => [n.id, n]));
    const edgePaths = (edges||[]).map(e => {
      const s = byId[e.source], t = byId[e.target];
      if (!s || !t) return '';
      const x1 = s.px + SIZE, y1 = s.py + SIZE / 2, x2 = t.px, y2 = t.py + SIZE / 2, cx = (x1 + x2) / 2;
      return `<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-linecap="round"/>`;
    }).join('');
    const nodeShapes = mapped.map(n => {
      const c = typeColor(n.data?.backendType || n.type || '');
      return `<rect x="${n.px}" y="${n.py}" width="${SIZE}" height="${SIZE}" rx="6" fill="url(#ng)" stroke="rgba(255,255,255,0.07)" stroke-width="0.5"/><rect x="${n.px}" y="${n.py}" width="${SIZE}" height="4" rx="2" fill="${c}" opacity="0.55"/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="dp" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#1d1d1d"/></pattern><linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#232328"/><stop offset="100%" stop-color="#19191d"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#0d0d0f"/><rect width="${W}" height="${H}" fill="url(#dp)"/>${edgePaths}${nodeShapes}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  },

  // ── API: Save Workflow ───────────────────────────────────────────────────
  saveEngine: async (automationId, silent = false) => {
    const state = get();
    set({ isSaving: true });
    try {
      const entryNode = state.nodes.find((n) => n.data.type === "trigger");
      if (!entryNode)
        throw new Error("A Trigger node is required to save the workflow.");

      const trigConf = entryNode.data.config || {};
      const bt = entryNode.data.backendType;

      // Soft warnings for obviously incomplete trigger configs
      if (bt === "cron_trigger" && !trigConf.schedule && !trigConf.customCron) {
        toast.warning("Cron trigger has no schedule — defaulting to 9am daily. Open the trigger node to configure.");
      }
      if (bt === "rss_trigger" && !trigConf.feedUrl) {
        toast.warning("RSS trigger has no feed URL. Open the trigger node to add one.");
      }
      if (bt === "imap_trigger" && !trigConf.credentialId) {
        toast.warning("IMAP trigger has no email credential. Open the trigger node to configure.");
      }

      const isCron = bt === 'cron_trigger';
      const cronExpression = isCron
        ? (trigConf.schedule || trigConf.customCron || '0 9 * * *')
        : undefined;

      const payload = {
        name: state.workflowName,
        trigger: entryNode.data.backendType,
        entryNodeId: entryNode.id,
        settings: {
          maxParallel: 10,
          ...(cronExpression ? { cronExpression } : {}),
        },
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
      if (!silent) toast.success("Workflow saved");
      const thumbnail = get().generateThumbnail(state.nodes, state.edges);
      if (thumbnail) api.patch(`/api/automation/${automationId}/thumbnail`, { thumbnail }).catch(() => {});
    } catch (error) {
      // Suppress access-denied errors on silent auto-saves (viewer collaborators, etc.)
      if (silent && (error.response?.status === 403 || error.response?.status === 401)) return;
      toast.error(
        "Save failed: " + (error.response?.data?.message || error.message),
      );
    } finally {
      set({ isSaving: false });
    }
  },
});
