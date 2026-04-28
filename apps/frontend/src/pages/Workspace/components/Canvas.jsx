import { Plus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, Trash2, Copy, LayoutDashboard, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useCallback, useRef, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Controls,
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
    <div className="flex items-start gap-4 select-none">
      {/* Manual build */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setTriggerPickerOpen(true)}
          className="group flex items-center justify-center w-28 h-28 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-zinc-500 hover:bg-zinc-800/40 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-7 h-7 text-zinc-600 group-hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
        </button>
        <span className="text-[12px] text-zinc-500 font-medium whitespace-nowrap">Add first step</span>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center gap-1 pt-8">
        <div className="w-px h-6 bg-zinc-800" />
        <span className="text-[10px] text-zinc-700 font-medium uppercase tracking-widest">or</span>
        <div className="w-px h-6 bg-zinc-800" />
      </div>

      {/* Build with AI */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setBrianOpen(true)}
          className="group flex items-center justify-center w-28 h-28 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-violet-500/60 hover:bg-violet-500/5 transition-all duration-200 cursor-pointer"
        >
          <Sparkles className="w-7 h-7 text-zinc-600 group-hover:text-violet-400 transition-colors" strokeWidth={1.5} />
        </button>
        <span className="text-[12px] text-zinc-500 font-medium whitespace-nowrap">Build with AI</span>
      </div>
    </div>
  );
}

const nodeTypes = { custom: CustomNode, placeholder: PlaceholderNode };
const edgeTypes = { configurable: ConfigurableEdge };

const EDGE_COLOR = "#3f3f46";
const defaultEdgeOptions = {
  type: "configurable",
  style: { strokeWidth: 5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 24,
    height: 24,
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
  const storeNodesLen = useWorkspaceStore((s) => s.nodes.length);
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const applyRemoteNodeMove = useWorkspaceStore((s) => s.applyRemoteNodeMove);
  const applyGraphSync      = useWorkspaceStore((s) => s.applyGraphSync);

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
  const selectedNodeIds = useWorkspaceStore((s) => s.selectedNodeIds);
  const onSelectionChange = useWorkspaceStore((s) => s.onSelectionChange);
  const deleteSelectedNodes = useWorkspaceStore((s) => s.deleteSelectedNodes);
  const duplicateSelectedNodes = useWorkspaceStore((s) => s.duplicateSelectedNodes);
  const alignSelectedNodes = useWorkspaceStore((s) => s.alignSelectedNodes);
  const autoLayout = useWorkspaceStore((s) => s.autoLayout);

  const isMultiSelected = selectedNodeIds.length > 1;

  const nodes = useMemo(() => {
    if (!isLoading && storeNodes.length === 0) return [PLACEHOLDER_NODE];
    return storeNodes;
  }, [storeNodes, isLoading]);

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
        data: { ...nodeData, config: {} },
      });
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
        onPaneClick={() => setSelectedNodeId(null)}
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
        panOnDrag
        selectionOnDrag={false}
        panOnScroll
        zoomOnPinch
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#52525b" />
        <Controls
          className="!bg-zinc-900/90 !backdrop-blur-sm !border-zinc-800/50 !rounded-xl !shadow-lg !shadow-black/20
            [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800/50 [&>button]:!text-zinc-500
            [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-200
            [&>button]:!rounded-lg [&>button]:!transition-all [&>button]:!duration-200"
        />
      </ReactFlow>

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
