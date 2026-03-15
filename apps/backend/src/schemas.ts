import { z } from "zod";

// ── Node Types ──────────────────────────────────────────────────────────────────

export const NODE_TYPES = [
  // Triggers
  "manual",
  "webhook",
  "cron_trigger",
  // Core
  "http_request",
  "advanced_scraper",
  "ai_agent",
  "data_mapper",
  "logic_router",
  // Supporting
  "code",
  "delay",
  "loop",
  "merge",
  "respond_webhook",
  // Backward-compat aliases (map to new implementations at runtime)
  "informer",
  "set_fields",
  "transform",
  "filter",
  "if_condition",
] as const;

export const NodeTypeSchema = z.enum(NODE_TYPES);

// ── Edge Types ──────────────────────────────────────────────────────────────────

export const EDGE_TYPES = ["onSuccess", "onFailure"] as const;
export const EdgeTypeSchema = z.enum(EDGE_TYPES);

// ── Trigger Types ───────────────────────────────────────────────────────────────

export const TRIGGER_TYPES = ["manual", "webhook", "cron_trigger"] as const;
export const TriggerTypeSchema = z.enum(TRIGGER_TYPES);

// ── Shared Primitives ───────────────────────────────────────────────────────────

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const EdgeConditionSchema = z.union([
  z.literal("always"),
  z.record(z.string(), z.unknown()),
]);

// ── NodeConfig ──────────────────────────────────────────────────────────────────

export const NodeConfigSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  type: NodeTypeSchema,
  data: z.record(z.string(), z.unknown()).default({}),
  position: PositionSchema.default({ x: 0, y: 0 }),
  description: z.string().default(""),
});

// ── EdgeConfig ──────────────────────────────────────────────────────────────────

export const EdgeConfigSchema = z.object({
  id: z.string().min(1, "Edge id is required"),
  source: z.string().min(1, "Edge source is required"),
  target: z.string().min(1, "Edge target is required"),
  sourceHandle: z.string().nullable().default(null),
  targetHandle: z.string().nullable().default(null),
  condition: EdgeConditionSchema.default("always"),
  type: EdgeTypeSchema.default("onSuccess"),
  description: z.string().default(""),
});

// ── Automation Settings ─────────────────────────────────────────────────────────

export const AutomationSettingsSchema = z.object({
  maxParallel: z.number().int().min(1).max(100).default(10),
});

// ── WorkflowDefinition ──────────────────────────────────────────────────────────

export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1, "Automation name is required").max(200),
  trigger: TriggerTypeSchema,
  active: z.boolean().default(true),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  nodes: z.array(NodeConfigSchema).min(1, "At least one node is required"),
  edges: z.array(EdgeConfigSchema).default([]),
  entryNodeId: z.string().min(1, "Entry node ID is required"),
  settings: AutomationSettingsSchema.default({ maxParallel: 10 }),
  description: z.string().default(""),
});

// ── Inferred TypeScript Types ───────────────────────────────────────────────────

export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type EdgeCondition = z.infer<typeof EdgeConditionSchema>;
export type NodeConfig = z.infer<typeof NodeConfigSchema>;
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
export type AutomationSettings = z.infer<typeof AutomationSettingsSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
