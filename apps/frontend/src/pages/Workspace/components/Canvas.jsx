import React, { useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useWorkspaceStore from "../../../store/workspaceStore";
import CustomNode from "./nodes/CustomNode";
import ConfigurableEdge from "./ConfigurableEdge";

const nodeTypes = { custom: CustomNode };
const edgeTypes = { configurable: ConfigurableEdge };

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
      className="flex-1 h-full w-full relative bg-zinc-950"
      ref={reactFlowWrapper}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(e, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "configurable" }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={[1, 2]}
        selectionOnDrag={false}
        panOnScroll
        zoomOnPinch
      >
        <Background variant="dots" gap={24} size={1.5} color="#27272a" />
        <Controls
          className="!bg-zinc-900 !border-zinc-800 !rounded-lg !shadow-none [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-200"
        />
      </ReactFlow>
    </div>
  );
}
