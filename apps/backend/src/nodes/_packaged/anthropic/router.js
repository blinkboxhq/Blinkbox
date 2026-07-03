/**
 * Anthropic — operation router. Merges chat, vision, and text-utility maps
 * (order preserved from the monolith), then dispatches. Handlers take
 * `(config, input, apiKey)`; errors funnel through handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { visionOperations } from "./v1/VisionDescription.js";
import { textOperations } from "./v1/TextDescription.js";

export const OPERATIONS = {
  message: chatOperations.message,
  multiTurn: chatOperations.multiTurn,
  structuredOutput: chatOperations.structuredOutput,
  functionCalling: chatOperations.functionCalling,
  extendedThinking: chatOperations.extendedThinking,
  analyzeImage: visionOperations.analyzeImage,
  analyzeDocument: visionOperations.analyzeDocument,
  analyzePdf: visionOperations.analyzePdf,
  citations: chatOperations.citations,
  extractData: visionOperations.extractData,
  classify: textOperations.classify,
  summarize: textOperations.summarize,
  translate: textOperations.translate,
  sentiment: textOperations.sentiment,
  moderateContent: textOperations.moderateContent,
  codeReview: textOperations.codeReview,
  generatePrompt: textOperations.generatePrompt,
  improvePrompt: textOperations.improvePrompt,
  promptCaching: chatOperations.promptCaching,
  countTokens: chatOperations.countTokens,
  listModels: chatOperations.listModels,
};

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Anthropic: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err);
  }
}
