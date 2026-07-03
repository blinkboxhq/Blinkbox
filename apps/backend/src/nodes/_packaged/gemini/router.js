/**
 * Gemini — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry (ORDER preserved from the monolith), and dispatches
 * `run(config, input, apiKey)` → handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { mediaOperations } from "./v1/MediaDescription.js";
import { modelOperations } from "./v1/ModelDescription.js";

export const OPERATIONS = {
  message: chatOperations.message,
  structuredOutput: chatOperations.structuredOutput,
  functionCalling: chatOperations.functionCalling,
  reasoning: chatOperations.reasoning,
  analyzeImage: mediaOperations.analyzeImage,
  generateImage: mediaOperations.generateImage,
  analyzeDocument: chatOperations.analyzeDocument,
  analyzePdf: mediaOperations.analyzePdf,
  analyzeAudio: mediaOperations.analyzeAudio,
  analyzeVideo: mediaOperations.analyzeVideo,
  embeddings: modelOperations.embeddings,
  extractData: chatOperations.extractData,
  classify: chatOperations.classify,
  summarize: chatOperations.summarize,
  translate: chatOperations.translate,
  generatePrompt: chatOperations.generatePrompt,
  countTokens: chatOperations.countTokens,
  listModels: modelOperations.listModels,
};

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Gemini: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err);
  }
}
