/**
 * Perplexity (Sonar) — operation router. Spreads every resource's operations map
 * into a single OPERATIONS registry (ORDER preserved from the monolith), and
 * dispatches `run(config, input, apiKey)` → handler, funneling errors to handleError.
 */
import { handleError } from "./GenericFunctions.js";
import { searchOperations } from "./v1/SearchDescription.js";
import { textOperations } from "./v1/TextDescription.js";

export const OPERATIONS = {
  message: searchOperations.message,
  search: searchOperations.search,
  askWithCitations: searchOperations.askWithCitations,
  structuredOutput: searchOperations.structuredOutput,
  reasoning: searchOperations.reasoning,
  deepResearch: searchOperations.deepResearch,
  factCheck: searchOperations.factCheck,
  compare: searchOperations.compare,
  newsDigest: searchOperations.newsDigest,
  extractData: textOperations.extractData,
  classify: textOperations.classify,
  summarize: textOperations.summarize,
  translate: textOperations.translate,
  analyzeDocument: textOperations.analyzeDocument,
  generatePrompt: textOperations.generatePrompt,
};

export const DEFAULT_OPERATION = "message";

export async function run(config, input, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Perplexity: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
  try {
    return await handler(config, input, apiKey);
  } catch (err) {
    handleError(err);
  }
}
