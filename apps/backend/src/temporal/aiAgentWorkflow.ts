/**
 * AI Agent Child Workflow — Deterministic ReAct loop decomposed into
 * micro-activities for Temporal thread safety.
 *
 * ARCHITECTURE:
 *   The parent workflow (executeAutomationWorkflow) dispatches aiAgent nodes
 *   here via executeChild(). Each ReAct iteration is split into discrete
 *   Temporal activities so the worker thread yields during long LLM/API waits:
 *
 *   1. aiAgentThinkActivity  — Send messages to LLM, get response (tool call or final answer)
 *   2. aiAgentActActivity    — Execute a single tool call (30s timeout per tool)
 *   3. aiAgentSummarizeActivity — Compress scratchpad when token count exceeds threshold
 *
 *   All three are stateless: the workflow holds the conversation state (messages,
 *   intermediateSteps) and passes it in/out of each activity. This is safe because
 *   Temporal replays the workflow deterministically on failure — the activities
 *   themselves are idempotent (LLM calls are treated as non-deterministic side effects
 *   that Temporal records in event history).
 *
 * DETERMINISM RULES:
 *   - No Date.now(), Math.random(), or direct I/O in this file
 *   - All side effects go through proxyActivities
 *   - Conversation state is pure data manipulated deterministically
 *
 * TOKEN MANAGEMENT:
 *   When the messages array exceeds SUMMARIZE_TOKEN_THRESHOLD (~80k tokens),
 *   the workflow invokes aiAgentSummarizeActivity to compress the scratchpad.
 *   This prevents context window overflow on long-running agent tasks that
 *   accumulate large HTML/JSON tool outputs.
 */

import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.js";

// ── Activity Proxies ────────────────────────────────────────────────────────────

// LLM calls: generous timeout (models can take 60-120s for complex reasoning)
const llm = proxyActivities<
  Pick<typeof activities, "aiAgentThinkActivity" | "aiAgentSummarizeActivity">
>({
  startToCloseTimeout: "120s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "30s",
  },
});

// Tool execution: shorter timeout, separate retry policy
const toolActs = proxyActivities<
  Pick<typeof activities, "aiAgentActActivity">
>({
  startToCloseTimeout: "60s",
  retry: {
    maximumAttempts: 2,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "15s",
  },
});

// ── Constants ───────────────────────────────────────────────────────────────────

const MAX_ITERATIONS_CEILING = 15;

// ~80k tokens estimated at ~4 chars/token = 320k chars.
// We use character count as a proxy since we can't import tiktoken in a workflow.
const SUMMARIZE_CHAR_THRESHOLD = 320_000;

// ── Types ───────────────────────────────────────────────────────────────────────

export interface AiAgentWorkflowInput {
  nodeConfig: Record<string, unknown>;
  inputData: Record<string, unknown>;
  workspaceId: string;
  parentWorkflowId: string;
  nodeId: string;
}

interface IntermediateStep {
  iteration: number;
  thought: string | null;
  action: string;
  actionInput: unknown;
  observation?: unknown;
}

// ── Workflow Entry Point ────────────────────────────────────────────────────────

export async function executeAiAgentWorkflow(
  input: AiAgentWorkflowInput,
): Promise<Record<string, unknown>> {
  const { nodeConfig, inputData, workspaceId } = input;

  const maxIterations = Math.min(
    Math.max((nodeConfig.maxIterations as number) ?? 5, 1),
    MAX_ITERATIONS_CEILING,
  );
  const returnIntermediateSteps =
    (nodeConfig.returnIntermediateSteps as boolean) ?? false;
  const outputFormat = (nodeConfig.outputFormat as string) ?? "text";

  // ── Step 1: Initialize — resolve credentials, tools, memory, build system prompt
  // This is done inside the first Think activity to keep credential decryption
  // in activity-land (never in the deterministic workflow).
  // We pass the full nodeConfig; the activity handles setup on first call.

  const intermediateSteps: IntermediateStep[] = [];
  let totalTokens = 0;
  let iteration = 0;

  // messages starts as null — the Think activity initializes it on first call
  let messages: Array<Record<string, unknown>> | null = null;
  let systemPromptResolved: string | null = null;
  let toolDefs: Array<Record<string, unknown>> | null = null;
  let provider: string = (nodeConfig.provider as string) ?? "openai";
  let resolvedModel: string | null = null;

  while (iteration < maxIterations) {
    iteration++;

    // ── Token guard: summarize scratchpad if context is too large ──────
    if (messages && estimateCharCount(messages) > SUMMARIZE_CHAR_THRESHOLD) {
      const summarizeResult = await llm.aiAgentSummarizeActivity({
        nodeConfig,
        messages,
        systemPrompt: systemPromptResolved ?? "",
        workspaceId,
      });
      messages = summarizeResult.messages as Array<Record<string, unknown>>;
      totalTokens += (summarizeResult.tokensUsed as number) ?? 0;
    }

    // ── THINK: Call LLM ───────────────────────────────────────────────
    const thinkResult = await llm.aiAgentThinkActivity({
      nodeConfig,
      inputData,
      messages,
      systemPrompt: systemPromptResolved,
      toolDefs,
      workspaceId,
      isFirstCall: messages === null,
    });

    // Capture resolved state from first call
    if (messages === null) {
      systemPromptResolved = thinkResult.systemPrompt as string;
      toolDefs = thinkResult.toolDefs as Array<Record<string, unknown>> | null;
      provider = (thinkResult.provider as string) ?? provider;
      resolvedModel = (thinkResult.resolvedModel as string) ?? null;
    }

    messages = thinkResult.messages as Array<Record<string, unknown>>;
    totalTokens += (thinkResult.tokensUsed as number) ?? 0;

    const toolCalls = thinkResult.toolCalls as Array<{
      id: string;
      name: string;
      arguments: unknown;
    }> | null;
    const responseText = (thinkResult.text as string) ?? "";

    // ── FINAL ANSWER: No tool calls → agent is done ───────────────────
    if (!toolCalls || toolCalls.length === 0) {
      return buildAgentOutput({
        result: responseText,
        model: resolvedModel ?? (nodeConfig.model as string) ?? "",
        tokensUsed: totalTokens,
        provider,
        iterations: iteration,
        intermediateSteps,
        returnIntermediateSteps,
        outputFormat,
      });
    }

    // ── ACT + OBSERVE: Execute each tool call as a micro-activity ─────
    for (const tc of toolCalls) {
      intermediateSteps.push({
        iteration,
        thought: responseText || null,
        action: tc.name,
        actionInput: tc.arguments,
      });

      const actResult = await toolActs.aiAgentActActivity({
        toolName: tc.name,
        toolArguments: tc.arguments,
        toolDefs: toolDefs ?? [],
        workspaceId,
        nodeConfig,
      });

      const observation = actResult.observation;
      intermediateSteps[intermediateSteps.length - 1].observation = observation;

      // The Act activity already appended the tool result message to messages,
      // but we do it here in the workflow to maintain deterministic state ownership.
      messages = actResult.messages as Array<Record<string, unknown>>;
    }

    // Loop back → next THINK iteration
  }

  // ── Budget Exhausted ────────────────────────────────────────────────────
  const lastAssistant = messages
    ? [...messages].reverse().find(
        (m) => (m as { role: string }).role === "assistant",
      )
    : null;

  const fallbackText =
    (lastAssistant as { content?: string } | null)?.content ||
    `Agent completed ${iteration} iterations without a final answer. ` +
      `Consider increasing Max Iterations or simplifying the task.`;

  return buildAgentOutput({
    result: fallbackText,
    model: resolvedModel ?? (nodeConfig.model as string) ?? "",
    tokensUsed: totalTokens,
    provider,
    iterations: iteration,
    intermediateSteps,
    returnIntermediateSteps,
    outputFormat,
    warning: "max_iterations_exhausted",
  });
}

// ── Pure Helpers (safe for deterministic workflows) ──────────────────────────

/** Estimate total character count across all messages (proxy for token count). */
function estimateCharCount(
  messages: Array<Record<string, unknown>>,
): number {
  let total = 0;
  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === "string") {
      total += content.length;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (typeof block === "object" && block !== null) {
          const b = block as Record<string, unknown>;
          if (typeof b.text === "string") total += b.text.length;
          if (typeof b.content === "string") total += b.content.length;
        }
      }
    }
  }
  return total;
}

/** Build the final agent output (pure logic, no I/O). */
function buildAgentOutput({
  result,
  model,
  tokensUsed,
  provider,
  iterations,
  intermediateSteps,
  returnIntermediateSteps,
  outputFormat,
  warning,
}: {
  result: string;
  model: string;
  tokensUsed: number;
  provider: string;
  iterations: number;
  intermediateSteps: IntermediateStep[];
  returnIntermediateSteps: boolean;
  outputFormat: string;
  warning?: string;
}): Record<string, unknown> {
  let finalResult: unknown = result;
  if (outputFormat === "json") {
    finalResult = tryParseJson(result);
  }

  const output: Record<string, unknown> = {
    result: finalResult,
    model,
    tokensUsed,
    provider,
    agentType: "react",
    iterations,
  };

  if (returnIntermediateSteps && intermediateSteps.length > 0) {
    output.intermediateSteps = intermediateSteps;
  }

  if (warning) {
    output.warning = warning;
  }

  return output;
}

/** Try to parse JSON from a potentially markdown-fenced string. */
function tryParseJson(text: string): unknown {
  if (!text || typeof text !== "string") return text;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    return text;
  }
}
