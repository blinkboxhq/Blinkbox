/**
 * xAI (Grok) — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry (ORDER preserved from the monolith), and dispatches
 * `run(config, input, apiKey)` → handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { imageOperations } from "./v1/ImageDescription.js";

export const OPERATIONS = {
  message: chatOperations.message,
  structuredOutput: chatOperations.structuredOutput,
  functionCalling: chatOperations.functionCalling,
  reasoning: chatOperations.reasoning,
  liveSearch: chatOperations.liveSearch,
  analyzeImage: imageOperations.analyzeImage,
  generateImage: imageOperations.generateImage,
  analyzeDocument: chatOperations.analyzeDocument,
  extractData: chatOperations.extractData,
  classify: chatOperations.classify,
  summarize: chatOperations.summarize,
  translate: chatOperations.translate,
  sentiment: chatOperations.sentiment,
  generatePrompt: chatOperations.generatePrompt,
  improvePrompt: chatOperations.improvePrompt,
};

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`xAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err);
  }
}
