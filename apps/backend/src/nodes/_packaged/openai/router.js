/**
 * OpenAI — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry (ORDER preserved from the monolith), and dispatches
 * `run(config, input, apiKey)` → handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { imageOperations } from "./v1/ImageDescription.js";
import { audioOperations } from "./v1/AudioDescription.js";
import { modelOperations } from "./v1/ModelDescription.js";

export const OPERATIONS = {
  message: chatOperations.message,
  structuredOutput: chatOperations.structuredOutput,
  functionCalling: chatOperations.functionCalling,
  reasoning: chatOperations.reasoning,
  analyzeImage: imageOperations.analyzeImage,
  generateImage: imageOperations.generateImage,
  editImage: imageOperations.editImage,
  textToSpeech: audioOperations.textToSpeech,
  transcribeAudio: audioOperations.transcribeAudio,
  translateAudio: audioOperations.translateAudio,
  embeddings: chatOperations.embeddings,
  moderateContent: chatOperations.moderateContent,
  analyzeDocument: chatOperations.analyzeDocument,
  generatePrompt: chatOperations.generatePrompt,
  improvePrompt: chatOperations.improvePrompt,
  imageVariation: imageOperations.imageVariation,
  listModels: modelOperations.listModels,
  fineTune: modelOperations.fineTune,
};

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`OpenAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err, "OpenAI");
  }
}
