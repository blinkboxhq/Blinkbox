/**
 * tool_think — Agent reasoning scratchpad
 *
 * Lets the AI agent "think out loud" before calling external tools.
 * The thought is logged but has no side effects — it's purely internal.
 * Exposed via toolDefinition so the cursor executor can wire it up
 * automatically when connected to an ai_agent via the tools slot.
 */

const toolThinkNode = {
  name: "tool_think",
  type: "action",
  handler: {
    async run(config) {
      return { thought: config.thought || "" };
    },
  },
};

toolThinkNode.toolDefinition = {
  name: "think",
  description:
    "Use this tool to reason step-by-step before deciding what action to take. " +
    "Write your internal analysis — classify the situation, weigh options, and plan your next steps. " +
    "This thought is private and has no external side effects.",
  parameters: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "Your internal reasoning, analysis, or plan.",
      },
    },
    required: ["thought"],
  },
  execute: async ({ thought }) => ({ thought }),
};

export default toolThinkNode;
