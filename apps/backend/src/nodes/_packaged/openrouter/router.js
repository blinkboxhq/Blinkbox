/**
 * OpenRouter — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry (ORDER preserved from the monolith), then dispatches
 * `run(config, input, apiKey)` → handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { visionOperations } from "./v1/VisionDescription.js";

export const OPERATIONS = {
  message: chatOperations.message,
  code: chatOperations.code,
  structuredOutput: chatOperations.structuredOutput,
  functionCalling: chatOperations.functionCalling,
  reasoning: chatOperations.reasoning,
  analyzeImage: visionOperations.analyzeImage,
  analyzeDocument: chatOperations.analyzeDocument,
  extractData: chatOperations.extractData,
  classify: chatOperations.classify,
  summarize: chatOperations.summarize,
  translate: chatOperations.translate,
  sentiment: chatOperations.sentiment,
  generatePrompt: chatOperations.generatePrompt,
  improvePrompt: chatOperations.improvePrompt,
};

// Backwards-compat alias for older saved workflows.
OPERATIONS.chat = chatOperations.message;
OPERATIONS.vision = visionOperations.analyzeImage;

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`OpenRouter: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err);
  }
}
