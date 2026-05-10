import { Plus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, Trash2, Copy, LayoutDashboard, Sparkles, Zap, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useCallback, useRef, useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NodeContextMenu from "./NodeContextMenu";
import { playNodeLand, playDelete } from "../../../lib/sounds";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useWorkspaceStore from "../../../store/workspaceStore";
import CustomNode from "./nodes/CustomNode";
import ConfigurableEdge from "./ConfigurableEdge";
import { getSocket } from "../../../lib/socket";

function PlaceholderNode() {
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setBrianOpen = useWorkspaceStore((s) => s.setBrianOpen);

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTriggerPickerOpen(true)}
          className="group relative flex flex-col items-center justify-center w-[108px] h-[108px] rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900/60 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-6 h-6 text-zinc-700 group-hover:text-zinc-300 transition-colors duration-200 mb-1.5" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-zinc-700 group-hover:text-zinc-400 transition-colors tracking-wide">Manual</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-5 bg-zinc-800" />
          <span className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest">or</span>
          <div className="w-px h-5 bg-zinc-800" />
        </div>

        <button
          onClick={() => setBrianOpen(true)}
          className="group relative flex flex-col items-center justify-center w-[108px] h-[108px] rounded-2xl border border-dashed border-zinc-800 hover:border-violet-500/40 bg-zinc-950 hover:bg-violet-950/20 transition-all duration-200 cursor-pointer"
        >
          <Sparkles className="w-6 h-6 text-zinc-700 group-hover:text-violet-400 transition-colors duration-200 mb-1.5" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-zinc-700 group-hover:text-violet-400 transition-colors tracking-wide">Use Brian</span>
        </button>
      </div>
      <p className="text-[11px] text-zinc-700 font-medium tracking-wide">Start by adding a trigger</p>
    </div>
  );
}

const nodeTypes = { custom: CustomNode, placeholder: PlaceholderNode };
const edgeTypes = { configurable: ConfigurableEdge };

const EDGE_COLOR = "#3f3f46";
const defaultEdgeOptions = {
  type: "configurable",
  style: { strokeWidth: 2.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 3,
    height: 3,
    color: EDGE_COLOR,
  },
};

const PLACEHOLDER_NODE = {
  id: "__placeholder__",
  type: "placeholder",
  position: { x: -160, y: -80 },
  data: {},
  selectable: false,
  draggable: false,
  style: { width: 320, height: 160 },
};

// Debounce helper — fires fn at most once every `wait` ms
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export default function Canvas() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { id: automationId } = useParams();

  const storeNodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const isValidConnection = useWorkspaceStore((s) => s.isValidConnection);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const isAddNodeOpen = useWorkspaceStore((s) => s.isAddNodeOpen);
  const setAddNodeOpen = useWorkspaceStore((s) => s.setAddNodeOpen);
  const isTriggerPickerOpen = useWorkspaceStore((s) => s.isTriggerPickerOpen);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const storeNodesLen    = useWorkspaceStore((s) => s.nodes.length);
  const nodeStatuses     = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive  = useWorkspaceStore((s) => s.isExecutionLive);
  const isRunning        = useWorkspaceStore((s) => s.isRunning);
  const runEngine        = useWorkspaceStore((s) => s.runEngine);
  const executionError   = useWorkspaceStore((s) => s.executionError);
  const openTraceSidebar = useWorkspaceStore((s) => s.openTraceSidebar);
  const applyRemoteNodeMove = useWorkspaceStore((s) => s.applyRemoteNodeMove);
  const applyGraphSync      = useWorkspaceStore((s) => s.applyGraphSync);
  const watchAutomation     = useWorkspaceStore((s) => s.watchAutomation);
  const unwatchAutomation   = useWorkspaceStore((s) => s.unwatchAutomation);
  const suggestionNode      = useWorkspaceStore((s) => s.suggestionNode);
  const clearSuggestionNode = useWorkspaceStore((s) => s.clearSuggestionNode);

  // Auto-subscribe to live node:status events for scheduled/webhook-triggered runs
  useEffect(() => {
    if (!automationId) return;
    watchAutomation(automationId);
    return () => unwatchAutomation(automationId);
  }, [automationId, watchAutomation, unwatchAutomation]);

  // Undo/redo
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);

  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Debounced socket emitter for collaborative node moves
  const emitNodeMoveRef = useRef(
    debounce((nodeId, position, aId) => {
      if (!aId) return;
      getSocket().emit("collab:node_move", { automationId: aId, nodeId, position });
    }, 40),
  );

  // Listen for peer node moves
  useEffect(() => {
    if (!automationId) return;
    const socket = getSocket();
    const onMove = ({ nodeId, position }) => applyRemoteNodeMove(nodeId, position);
    socket.on("collab:node_move", onMove);
    return () => socket.off("collab:node_move", onMove);
  }, [automationId, applyRemoteNodeMove]);

  // Listen for full graph sync (after any collaborator saves — adds/deletes/edges)
  useEffect(() => {
    if (!automationId) return;
    const socket = getSocket();
    const myId = (() => { try { return JSON.parse(localStorage.getItem("blinkbox_user") || "{}").id || ""; } catch { return ""; } })();

    const onSync = ({ nodes: inNodes, edges: inEdges, savedBy }) => {
      // Don't apply our own save broadcast back to ourselves
      if (String(savedBy) === String(myId)) return;
      // Convert backend node format → ReactFlow format (same mapping as loadEngine)
      const rfNodes = inNodes.map((n) => {
        const isTrigger = n.type?.endsWith("_trigger") || n.type === "manual" || n.type === "webhook";
        return {
          id: n.id,
          type: "custom",
          position: n.position || { x: 0, y: 0 },
          data: {
            label: n.description || n.type,
            backendType: n.type,
            type: isTrigger ? "trigger" : "action",
            config: n.data || {},
          },
        };
      });
      const rfEdges = inEdges.map((e) => ({
        id: e.id || `edge-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        type: "configurable",
        data: { conditionPath: e.conditionPath || "" },
        style: {},
      }));
      applyGraphSync(rfNodes, rfEdges);
    };

    socket.on("collab:graph_sync", onSync);
    return () => socket.off("collab:graph_sync", onSync);
  }, [automationId, applyGraphSync]);

  // Emit the current graph to collab room (debounced to avoid flooding)
  const emitGraphRef = useRef(
    debounce((aId) => {
      if (!aId) return;
      const { nodes: n, edges: e } = useWorkspaceStore.getState();
      getSocket().emit("collab:graph_push", { automationId: aId, nodes: n, edges: e });
    }, 80),
  );

  // Wrap onNodesChange to emit position deltas to collaborators
  const handleNodesChange = useCallback((changes) => {
    const real = changes.filter((c) => c.id !== "__placeholder__");
    if (!real.length) return;
    onNodesChange(real);
    for (const c of real) {
      if (c.type === "position" && c.position) {
        emitNodeMoveRef.current(c.id, c.position, automationId);
      }
      // Immediately broadcast structure changes (removes = delete)
      if (c.type === "remove") emitGraphRef.current(automationId);
    }
  }, [onNodesChange, automationId]);

  // Intercept addNode to broadcast immediately
  const addNode = useWorkspaceStore((s) => s.addNode);
  const addNodeAndBroadcast = useCallback((node) => {
    addNode(node);
    // Small delay so the store update lands first
    setTimeout(() => emitGraphRef.current(automationId), 20);
  }, [addNode, automationId]);

  // Multi-select
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, nodeId, nodeLabel }

  // Track run result for floating button feedback
  const [lastRunResult, setLastRunResult] = useState(null); // null | "success" | "error"
  const [runDurationMs, setRunDurationMs] = useState(null);
  const runStartRef = useRef(null);
  useEffect(() => {
    if (isRunning) {
      runStartRef.current = Date.now();
      setLastRunResult(null);
    } else if (runStartRef.current) {
      const dur = Date.now() - runStartRef.current;
      setRunDurationMs(dur);
      const statuses = Object.values(nodeStatuses);
      setLastRunResult(statuses.includes("failed") || executionError ? "error" : "success");
      runStartRef.current = null;
    }
  }, [isRunning, nodeStatuses, executionError]);

  const selectedNodeIds = useWorkspaceStore((s) => s.selectedNodeIds);
  const onSelectionChange = useWorkspaceStore((s) => s.onSelectionChange);
  const deleteSelectedNodes = useWorkspaceStore((s) => s.deleteSelectedNodes);
  const duplicateSelectedNodes = useWorkspaceStore((s) => s.duplicateSelectedNodes);
  const alignSelectedNodes = useWorkspaceStore((s) => s.alignSelectedNodes);
  const autoLayout = useWorkspaceStore((s) => s.autoLayout);

  const isMultiSelected = selectedNodeIds.length > 1;

  const nodes = useMemo(() => {
    const base = (!isLoading && storeNodes.length === 0) ? [PLACEHOLDER_NODE] : storeNodes;
    if (suggestionNode) return [...base, suggestionNode];
    return base;
  }, [storeNodes, isLoading, suggestionNode]);

  const liveEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceStatus = isExecutionLive ? nodeStatuses[edge.source] : null;

      const arrowColor = sourceStatus === "running"
        ? "#3b82f6"
        : sourceStatus === "completed"
        ? "#10b981"
        : sourceStatus === "failed"
        ? "#ef4444"
        : EDGE_COLOR;

      return {
        ...edge,
        data: { ...edge.data, ...(sourceStatus ? { status: sourceStatus } : {}) },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 24,
          height: 24,
          color: arrowColor,
        },
      };
    });
  }, [edges, nodeStatuses, isExecutionLive]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeDataString = event.dataTransfer.getData("application/json");
      if (!nodeDataString) return;

      const nodeData = JSON.parse(nodeDataString);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeAndBroadcast({
        id: `${nodeData.backendType}-${crypto.randomUUID()}`,
        type: "custom",
        position,
        data: { ...nodeData, config: nodeData.config || {} },
      });
      playNodeLand();
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div
      className="flex-1 h-full min-w-0 relative bg-[#0d0d0f]"
      ref={reactFlowWrapper}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={liveEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(e, node) => { if (node.id !== "__placeholder__") setSelectedNodeId(node.id); }}
        onNodeContextMenu={(e, node) => {
          if (node.id === "__placeholder__") return;
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, nodeLabel: node.data?.config?.selectedAction || node.data?.label || node.id });
        }}
        onPaneClick={() => { setSelectedNodeId(null); setCtxMenu(null); clearSuggestionNode(); }}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
        onInit={() => {
          const isEmpty = useWorkspaceStore.getState().nodes.length === 0;
          fitView({ padding: 0.5, minZoom: isEmpty ? 1 : 0.5, maxZoom: isEmpty ? 1 : 2, duration: 0 });
        }}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        snapToGrid
        snapGrid={[20, 20]}
        panOnDrag={false}
        selectionOnDrag
        selectionMode="partial"
        panOnScroll
        zoomOnPinch
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls
          className="!bg-zinc-900/90 !backdrop-blur-sm !border-zinc-800/50 !rounded-xl !shadow-lg !shadow-black/20
            [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800/50 [&>button]:!text-zinc-500
            [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-200
            [&>button]:!rounded-lg [&>button]:!transition-all [&>button]:!duration-200"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.type === "trigger") return "rgba(139,92,246,0.6)";
            return "rgba(82,82,91,0.5)";
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: "#0a0a0b",
            border: "1px solid #27272a",
            borderRadius: 8,
          }}
          className="!bg-[#0d0d0f] !border-zinc-800 !rounded-xl"
        />
      </ReactFlow>

      {/* ── Node right-click context menu ── */}
      {ctxMenu && (
        <NodeContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          nodeId={ctxMenu.nodeId}
          nodeLabel={ctxMenu.nodeLabel}
          onClose={() => setCtxMenu(null)}
          onConfigure={() => {
            setSelectedNodeId(ctxMenu.nodeId);
            setCtxMenu(null);
          }}
          onDuplicate={() => {
            useWorkspaceStore.getState().duplicateNode(ctxMenu.nodeId);
            setCtxMenu(null);
          }}
          onDelete={() => {
            useWorkspaceStore.getState().deleteNode(ctxMenu.nodeId);
            setCtxMenu(null);
          }}
          onTest={() => {
            setSelectedNodeId(ctxMenu.nodeId);
            setCtxMenu(null);
          }}
          onAddNote={() => {
            const node = storeNodes.find(n => n.id === ctxMenu.nodeId);
            if (!node) return;
            useWorkspaceStore.getState().addNode({
              id: `note-${crypto.randomUUID()}`,
              type: "custom",
              position: { x: node.position.x + 160, y: node.position.y - 60 },
              data: { backendType: "sticky_note", label: "Note", type: "note", config: { text: "" } },
            });
            setCtxMenu(null);
          }}
        />
      )}

      {/* ── Multi-select floating toolbar ── */}
      <AnimatePresence>
        {isMultiSelected && (
          <motion.div
            key="multiselect-toolbar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/60 shadow-xl shadow-black/40"
          >
            <span className="text-[10px] font-semibold text-zinc-500 px-1.5">
              {selectedNodeIds.length} selected
            </span>
            <div className="w-px h-4 bg-zinc-700/60 mx-0.5" />
            <ToolbarBtn
              icon={AlignHorizontalJustifyStart}
              label="Align top"
              onClick={() => alignSelectedNodes("horizontal")}
            />
            <ToolbarBtn
              icon={AlignVerticalJustifyStart}
              label="Align left"
              onClick={() => alignSelectedNodes("vertical")}
            />
            <div className="w-px h-4 bg-zinc-700/60 mx-0.5" />
            <ToolbarBtn
              icon={Copy}
              label="Duplicate"
              onClick={duplicateSelectedNodes}
            />
            <ToolbarBtn
              icon={Trash2}
              label="Delete"
              onClick={deleteSelectedNodes}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Auto-layout button ── */}
      <AnimatePresence>
        {storeNodesLen > 1 && !isMultiSelected && (
          <motion.button
            key="auto-layout-btn"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            onClick={autoLayout}
            title="Auto-layout (L)"
            className="absolute bottom-6 right-20 z-20 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-zinc-600 shadow-black/40"
          >
            <LayoutDashboard className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Add trigger button ── */}
      <AnimatePresence>
        {storeNodesLen > 0 && (
          <motion.button
            key="add-trigger-btn"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            onClick={() => setTriggerPickerOpen(!isTriggerPickerOpen)}
            title="Add a trigger"
            className={`absolute bottom-6 right-[104px] z-20 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200
              ${isTriggerPickerOpen
                ? "bg-zinc-100 text-zinc-900 shadow-zinc-900/50"
                : "bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-600 shadow-black/40"
              }`}
          >
            <Zap className="w-4 h-4" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Add node button ── */}
      <AnimatePresence>
        {storeNodesLen > 0 && (
          <motion.button
            key="add-node-btn"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            onClick={() => setAddNodeOpen(!isAddNodeOpen)}
            title="Add a node"
            className={`absolute bottom-6 right-6 z-20 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200
              ${isAddNodeOpen
                ? "bg-zinc-100 text-zinc-900 shadow-zinc-900/50"
                : "bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-600 shadow-black/40"
              }`}
          >
            <Plus
              className={`w-5 h-5 transition-transform duration-200 ${isAddNodeOpen ? "rotate-45" : ""}`}
              strokeWidth={2}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Floating Run button — bottom-left ── */}
      <AnimatePresence>
        {storeNodesLen > 0 && (
          <motion.div
            key="run-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-6 left-6 z-20 flex items-center gap-2"
          >
            <button
              onClick={() => { runEngine(automationId); setLastRunResult(null); }}
              disabled={isRunning || storeNodesLen === 0}
              title="Run workflow (⌘↵)"
              className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold shadow-lg shadow-black/40 transition-all duration-200 disabled:cursor-not-allowed
                ${isRunning
                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400 cursor-not-allowed'
                  : 'bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-400 active:scale-[0.97]'}`}
            >
              {isRunning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
                : <><Play className="w-3.5 h-3.5" /> Run</>
              }
            </button>

            {/* Last-run status pill */}
            <AnimatePresence>
              {!isRunning && lastRunResult && (
                <motion.button
                  key={lastRunResult}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => openTraceSidebar?.()}
                  title="View last run trace"
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold border shadow-lg shadow-black/40 transition-colors
                    ${lastRunResult === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'}`}
                >
                  {lastRunResult === 'success'
                    ? <><CheckCircle2 className="w-3.5 h-3.5" />{runDurationMs ? `${(runDurationMs / 1000).toFixed(1)}s` : 'Done'}</>
                    : <><XCircle className="w-3.5 h-3.5" />Failed</>
                  }
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cmd+K hint ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/70 border border-zinc-800/60 backdrop-blur-sm">
          <kbd className="text-[10px] text-zinc-600 font-mono">⌘K</kbd>
          <span className="text-[10px] text-zinc-700">Quick add node</span>
        </div>
      </div>

    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
