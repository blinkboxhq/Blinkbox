import { Search, X, Plus, Zap } from "lucide-react"; // <-- Add Zap here
import React, { useCallback, useRef, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import CustomNode from "./nodes/CustomNode";
import ConfigurableEdge from "./ConfigurableEdge";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";

const nodeTypes = { custom: CustomNode };
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

// ── Add Node Modal ──────────────────────────────────────────────────────────
function AddNodeModal() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  const addNodeSource = useWorkspaceStore((s) => s.addNodeSource);
  const insertEdgeId = useWorkspaceStore((s) => s.insertEdgeId);
  const clearAddNodeModal = useWorkspaceStore((s) => s.clearAddNodeModal);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const edges = useWorkspaceStore((s) => s.edges);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const { getNode, fitView } = useReactFlow();

  const isOpen = !!addNodeSource;

  const entries = Object.entries(NodeRegistry).filter(([key, def]) => {
    if (def.category === "trigger") return false;
    if (search && !def.label.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory && def.category !== activeCategory) return false;
    return true;
  });

  // Group by category
  const grouped = CATEGORIES
    .filter((c) => c.id !== "trigger")
    .map((cat) => ({
      category: cat,
      nodes: entries.filter(([, def]) => def.category === cat.id),
    }))
    .filter((g) => g.nodes.length > 0);

  const handleSelect = useCallback((nodeKey) => {
    const nodeDef = NodeRegistry[nodeKey];
    const newId = `${nodeKey}-${crypto.randomUUID()}`;

    if (insertEdgeId) {
      // ── INSERT BETWEEN TWO NODES ────────────────────────────────────────
      const edge = edges.find((e) => e.id === insertEdgeId);
      if (!edge) { clearAddNodeModal(); return; }

      const sourceNode = getNode(edge.source);
      const targetNode = getNode(edge.target);
      if (!sourceNode || !targetNode) { clearAddNodeModal(); return; }

      // Position new node between source and target
      const newPos = {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      };

      // Add the new node
      addNode({
        id: newId,
        type: "custom",
        position: newPos,
        data: {
          backendType: nodeKey,
          label: nodeDef?.label || nodeKey,
          type: "action",
          config: {},
        },
      });

      // Remove original edge
      onEdgesChange([{ id: edge.id, type: "remove" }]);

      // Connect: source → new node → target
      setTimeout(() => {
        onConnect({
          source: edge.source,
          sourceHandle: edge.sourceHandle || "output",
          target: newId,
          targetHandle: "input",
        });
        setTimeout(() => {
          onConnect({
            source: newId,
            sourceHandle: "output",
            target: edge.target,
            targetHandle: edge.targetHandle || "input",
          });
          // Smooth fitView after insertion
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }, 30);
      }, 30);
    } else {
      // ── APPEND AFTER A NODE (deterministic spacing) ────────────────────
      const sourceNode = getNode(addNodeSource);
      const parentW = sourceNode?.measured?.width || 250;
      const gap = 100;
      const pos = sourceNode
        ? { x: sourceNode.position.x + parentW + gap, y: sourceNode.position.y }
        : { x: 500, y: 350 };

      addNode({
        id: newId,
        type: "custom",
        position: pos,
        data: {
          backendType: nodeKey,
          label: nodeDef?.label || nodeKey,
          type: "action",
          config: {},
        },
      });

      // Auto-connect
      setTimeout(() => {
        onConnect({
          source: addNodeSource,
          sourceHandle: "output",
          target: newId,
          targetHandle: "input",
        });
        // Smooth fitView to include the new node
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      }, 30);
    }

    clearAddNodeModal();
    setSearch("");
    setActiveCategory(null);
  }, [addNodeSource, insertEdgeId, edges, addNode, onConnect, onEdgesChange, getNode, clearAddNodeModal, fitView]);

  const handleClose = () => {
    clearAddNodeModal();
    setSearch("");
    setActiveCategory(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
              w-[520px] max-h-[480px] overflow-hidden
              bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/30 rounded-2xl
              shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    {insertEdgeId ? "Insert Step" : "Add Next Step"}
                  </h3>
                  <p className="text-[10px] text-zinc-500">Choose a node to add to your workflow</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-zinc-800/30">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-700/30 rounded-xl">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search nodes..."
                  className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-zinc-800/20 overflow-x-auto">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  !activeCategory
                    ? "bg-zinc-700/50 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                }`}
              >
                All
              </button>
              {CATEGORIES.filter((c) => c.id !== "trigger").map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                      activeCategory === cat.id
                        ? "bg-zinc-700/50 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                    }`}
                  >
                    <CatIcon className="w-3 h-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Node grid */}
            <div className="overflow-y-auto max-h-[280px] p-4">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-sm text-zinc-600">No nodes found</p>
                </div>
              ) : (
                grouped.map(({ category, nodes }) => (
                  <div key={category.id} className="mb-4 last:mb-0">
                    <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 px-1">
                      {category.label}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {nodes.map(([key, def]) => {
                        const Icon = def.icon;
                        const accent = def.accentColor || "161,161,170";
                        return (
                          <motion.button
                            key={key}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelect(key)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl
                              bg-zinc-800/30 border border-zinc-700/20
                              hover:bg-zinc-800/60 hover:border-zinc-600/30
                              transition-all duration-150 group/card"
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group-hover/card:scale-110"
                              style={{
                                backgroundColor: `rgba(${accent},0.1)`,
                                boxShadow: `0 0 0 rgba(${accent},0)`,
                              }}
                            >
                              {def.logoUrl ? (
                                <img src={def.logoUrl} alt={def.label} className="w-4 h-4 object-contain" loading="lazy" />
                              ) : (
                                <Icon className={`w-4 h-4 ${def.colorClass}`} strokeWidth={1.75} />
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium text-center leading-tight truncate w-full group-hover/card:text-zinc-200 transition-colors">
                              {def.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Empty Canvas State ───────────────────────────────────────────────────
function EmptyCanvasState() {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);

  // Only show if loading is done AND the canvas is completely empty
  if (isLoading || nodes.length > 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        <button
          onClick={() => setTriggerPickerOpen(true)}
          className="group flex items-center justify-center w-28 h-28 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-zinc-500 transition-all duration-200 hover:bg-zinc-800/40"
        >
          <Plus className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
        </button>
        <span className="text-sm text-zinc-500 font-medium">Add first step...</span>
      </div>
    </div>
  );
}
// ── Canvas Component ────────────────────────────────────────────────────────

export default function Canvas() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const isValidConnection = useWorkspaceStore((s) => s.isValidConnection);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);

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
      className="flex-1 h-full w-full relative bg-[#0d0d0f]"
      ref={reactFlowWrapper}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={liveEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(e, node) => setSelectedNodeId(node.id)}
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

      {/* Add Node Modal overlay */}
      <EmptyCanvasState /> {/* <-- Use the new component here */}
      <AddNodeModal />
    </div>
  );
}
