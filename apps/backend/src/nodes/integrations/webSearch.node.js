/**
 * WEB SEARCH NODE — slim entry. Queries the live internet via the Tavily API and
 * returns structured JSON. Delegates to the modular router under
 * _packaged/webSearch/. Preserves the original single-op contract EXACTLY: for
 * the default search-family ops a missing 'query' SKIPS first (before the cred
 * check), then an absent credential SKIPS, then a failed resolution SKIPS. The
 * AI-agent `toolDefinition` export is preserved verbatim. Extra ops (qnaSearch,
 * searchContext, extract) run their own per-op validation inside their handlers.
 */
import { run as runWebSearch, DEFAULT_OPERATION } from "../_packaged/webSearch/router.js";
import { getApiKey } from "../_packaged/webSearch/GenericFunctions.js";

const QUERY_FIRST_OPS = new Set(["search", "qnaSearch", "searchContext"]);

export default {
  toolDefinition: {
    name: "web_search",
    description: "Search the internet for current information using Tavily. Returns titles, URLs, content snippets, and an AI-generated answer.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        searchDepth: { type: "string", enum: ["basic", "advanced"], description: "Search depth — basic is faster, advanced is deeper" },
        maxResults: { type: "number", description: "Number of results to return (1-20, default 5)" },
        topic: { type: "string", enum: ["general", "news", "finance"], description: "Search topic category" },
      },
      required: ["query"],
    },
  },

  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (QUERY_FIRST_OPS.has(operation) && !config.query) {
      return { success: false, error: "Web Search: 'query' is required.", skipped: true };
    }
    if (!config.credentialId) {
      return { success: false, error: "Web Search: No credential selected — pick a Tavily API key credential.", skipped: true };
    }

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Web Search: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runWebSearch({ ...config, operation }, { apiKey });
  },
};
