import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useCallback, useRef, useMemo } from "react";
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

// ── Placeholder node rendered when canvas is empty ─────────────────────────
function PlaceholderNode() {
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <button
        onClick={() => setTriggerPickerOpen(true)}
        className="group flex items-center justify-center w-28 h-28 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-zinc-500 transition-all duration-200 hover:bg-zinc-800/40 cursor-pointer"
      >
        <Plus className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
      </button>
      <span className="text-sm text-zinc-500 font-medium">Add first step...</span>
    </div>
  );
}

const nodeTypes = { custom: CustomNode, placeholder: PlaceholderNode };
const edgeTypes = { configurable: ConfigurableEdge };

// ── Default edge options (solid, arrow, smoothstep) ─────────────────────────
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

// ── Placeholder node injected into ReactFlow when canvas is empty ────────
const PLACEHOLDER_NODE = {
  id: "__placeholder__",
  type: "placeholder",
  position: { x: 400, y: 300 },
  data: {},
  selectable: false,
  draggable: false,
};

// ── Canvas Component ────────────────────────────────────────────────────────

export default function Canvas() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const storeNodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const isValidConnection = useWorkspaceStore((s) => s.isValidConnection);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const isAddNodeOpen = useWorkspaceStore((s) => s.isAddNodeOpen);
  const setAddNodeOpen = useWorkspaceStore((s) => s.setAddNodeOpen);
  const storeNodesLen = useWorkspaceStore((s) => s.nodes.length);
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);

  // Show placeholder node on canvas when empty (stitched to canvas, not floating)
  const nodes = useMemo(() => {
    if (!isLoading && storeNodes.length === 0) return [PLACEHOLDER_NODE];
    return storeNodes;
  }, [storeNodes, isLoading]);

  // Derive edge statuses + arrow markers from their source node's live status.
  const liveEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceStatus = isExecutionLive ? nodeStatuses[edge.source] : null;

      // Arrow color matches edge status
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

      addNode({
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
        onNodesChange={(changes) => {
          const real = changes.filter((c) => c.id !== "__placeholder__");
          if (real.length) onNodesChange(real);
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(e, node) => { if (node.id !== "__placeholder__") setSelectedNodeId(node.id); }}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
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

      {/* ── Add node button — only shown when canvas has at least one node ── */}
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
