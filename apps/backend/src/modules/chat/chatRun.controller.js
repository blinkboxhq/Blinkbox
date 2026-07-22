import "../../config/env.js";
import Automation from "../../models/automation.model.js";
import { nodeRegistry } from "../../nodes/index.js";
import { resolveConfig } from "../automation/engine/expression.parser.js";
import toolRegistry from "../../nodes/agentTools.registry.js";
import { toPlatformTool } from "../../nodes/integrationManifest.js";
import { emitNodeStatus } from "../../infra/socket.server.js";

const MAX_STEPS = 30;
const STEP_TIMEOUT_MS = 90_000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Node timed out")), ms)),
  ]);
}

function toItems(raw) {
  if (Array.isArray(raw)) return raw.map(r => (r && r.json !== undefined ? r : { json: r }));
  if (raw && raw.json !== undefined) return [raw];
  return [{ json: raw ?? {} }];
}

function extractText(output) {
  if (!output) return null;
  const j = output.json ?? output;
  return j?.text ?? j?.result ?? j?.message ?? j?.reply ?? j?.response ?? j?.content ?? j?.answer ?? j?.output ?? null;
}

export async function chatRun(req, res) {
  try {
    const { automationId } = req.params;
    const { message = "", attachments = [], sessionId } = req.body;
    const workspaceId = req.user.id;

    const automation = await Automation.findOne({ _id: automationId, workspaceId });
    if (!automation) return res.status(404).json({ error: "Automation not found" });

    const { nodes, edges, entryNodeId } = automation;
    if (!nodes?.length) return res.status(400).json({ error: "Workflow has no nodes. Save it first." });

    // Find entry: prefer saved entryNodeId, fall back to first trigger node
    const entryId = entryNodeId || nodes.find(n =>
      n.type?.endsWith("_trigger") || n.data?.type === "trigger"
    )?.id;
    if (!entryId) return res.status(400).json({ error: "No trigger node found. Add a Chat Trigger to your workflow." });

    // context[nodeId] = [{ json: ... }]
    const context = {};

    // Seed the trigger node output with the incoming chat message
    const triggerNode = nodes.find(n => n.id === entryId);
    const triggerPayload = [{ json: { message, attachments, sessionId, triggeredAt: new Date().toISOString(), triggerType: "chat" } }];
    context[entryId] = triggerPayload;
    const triggerSlug = (triggerNode?.data?.config?.customLabel || triggerNode?.data?.label || triggerNode?.type || "chat_trigger")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (triggerSlug) context[triggerSlug] = triggerPayload;

    // BFS walk: run each node once, follow edges
    const queue = [entryId];
    const visited = new Set();
    let lastOutput = null;

    for (let step = 0; step < MAX_STEPS && queue.length; step++) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const handler = nodeRegistry[node.type];

      // Emit started for every node (including trigger)
      emitNodeStatus(automationId, { automationId, nodeId, status: "started" });

      if (handler && node.id !== entryId) {
        // Build input from parent nodes
        const incoming = edges.filter(e => e.target === nodeId && (!e.targetHandle || e.targetHandle === "input"));
        let inputItems = [];
        for (const edge of incoming) {
          const src = context[edge.source];
          if (Array.isArray(src)) inputItems.push(...src);
        }
        if (!inputItems.length) inputItems = [{ json: {} }];

        // Handle-deps for ai_agent
        let handleDeps = null;
        if (node.type === "ai_agent") {
          handleDeps = {};
          for (const edge of edges.filter(e => e.target === nodeId)) {
            const handle = edge.targetHandle;
            if (!handle || handle === "input") continue;
            const srcData = context[edge.source];
            const firstJson = Array.isArray(srcData) ? srcData[0]?.json : null;
            if (handle === "memory") {
              handleDeps._memory = firstJson;
            } else if (handle === "tools") {
              if (!handleDeps._tools) handleDeps._tools = [];
              const srcNode = nodes.find(n => n.id === edge.source);
              if (srcNode) {
                const toolType = srcNode.type;
                if (toolType === "agent_tool" && srcNode.data?.toolId) {
                  const savedData = srcNode.data || {};
                  const resolved = toolRegistry.resolve(savedData.toolId, { workspaceId });
                  if (resolved) {
                    const credId = savedData.credentialId;
                    handleDeps._tools.push({
                      name: savedData.toolName
                        ? savedData.toolName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "")
                        : resolved.name,
                      description: savedData.toolDesc || resolved.description,
                      parameters: resolved.parameters,
                      execute: (args) => resolved.execute(credId ? { credentialId: credId, ...args } : args),
                    });
                  }
                } else {
                  const toolHandler = nodeRegistry[toolType];
                  if (toolHandler?.toolDefinition) {
                    const toolDef = { ...toolHandler.toolDefinition };
                    const savedConfig = srcNode.data || {};
                    toolDef.execute = async (agentArgs) => toolHandler.run({ ...savedConfig, ...agentArgs }, agentArgs, { workspaceId });
                    handleDeps._tools.push(toolDef);
                  } else if (firstJson) {
                    handleDeps._tools.push(firstJson);
                  }
                }
              }
            } else if (handle === "chat_model" || handle === "llm") {
              const srcNode = nodes.find(n => n.id === edge.source);
              handleDeps._chatModel = srcNode ? { ...(srcNode.data || {}), backendType: srcNode.type } : firstJson;
            } else if (handle === "integration") {
              const srcNode = nodes.find(n => n.id === edge.source);
              const pt = toPlatformTool(srcNode);
              if (pt) {
                if (!handleDeps._platformTools) handleDeps._platformTools = [];
                handleDeps._platformTools.push(pt);
              }
            }
          }
        }

        let nodeOutput = [{ json: {} }];
        for (let i = 0; i < inputItems.length; i++) {
          const item = inputItems[i];
          let resolvedConfig;
          try {
            resolvedConfig = resolveConfig(node.data, item.json, context, i);
          } catch {
            resolvedConfig = node.data || {};
          }
          if (handleDeps) Object.assign(resolvedConfig, handleDeps);

          // For AI agent nodes: if no prompt configured, fall back to the chat message
          if (node.type === "ai_agent" && !resolvedConfig.prompt) {
            const triggerJson = context[entryId]?.[0]?.json;
            resolvedConfig.prompt = item.json?.message || triggerJson?.message || "";
          }

          try {
            const raw = await withTimeout(
              handler.run(resolvedConfig, item.json, { workspaceId, toolRegistry, triggerOutput: context[entryId]?.[0]?.json }),
              STEP_TIMEOUT_MS,
            );
            nodeOutput = toItems(raw);
            emitNodeStatus(automationId, { automationId, nodeId, status: "completed" });
          } catch (nodeErr) {
            emitNodeStatus(automationId, { automationId, nodeId, status: "failed" });
            throw nodeErr;
          }
        }

        context[nodeId] = nodeOutput;
        // Also index by slug so {{chat_trigger.output}} style refs resolve
        const slug = (node.data?.config?.customLabel || node.data?.label || node.type || "node")
          .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        if (slug && slug !== nodeId) context[slug] = nodeOutput;
        lastOutput = nodeOutput[0];
      } else if (node.id === entryId) {
        emitNodeStatus(automationId, { automationId, nodeId, status: "completed" });
      }

      // Queue successors (follow normal data edges)
      const successors = edges
        .filter(e => e.source === nodeId && (!e.sourceHandle || e.sourceHandle === "output" || e.sourceHandle === "true" || e.sourceHandle === "success"))
        .map(e => e.target)
        .filter(id => !visited.has(id));
      queue.push(...successors);
    }

    // Extract the reply text from the last node's output
    const replyText = extractText(lastOutput) || JSON.stringify(lastOutput?.json ?? lastOutput ?? {});

    return res.json({ reply: replyText, output: lastOutput?.json ?? lastOutput });
  } catch (err) {
    console.error("[ChatRun]", err.message);
    return res.status(500).json({ error: err.message || "Workflow execution failed" });
  }
}
