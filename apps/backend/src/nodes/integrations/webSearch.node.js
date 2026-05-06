/**
 * WEB SEARCH NODE
 *
 * Queries the live internet via the Tavily Search API and returns
 * structured JSON results. No browser needed — pure API call.
 *
 * Config:
 *   credentialId   — Vault reference to Tavily API key (type: "api_key")
 *   query          — Search query string (already expression-resolved)
 *   searchDepth    — "basic" (default, fast) | "advanced" (deeper, slower)
 *   maxResults     — Number of results (default: 5, max: 20)
 *   includeAnswer  — Include AI-generated summary answer (default: true)
 *   includeDomains — Array of domains to restrict search to (optional)
 *   excludeDomains — Array of domains to exclude (optional)
 *   topic          — "general" (default) | "news" | "finance"
 *
 * Output:
 *   { answer, results: [{ title, url, content, score }], query, responseTime }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.tavily.com/search";
const MAX_RESULTS_LIMIT = 20;

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
    const {
      credentialId,
      query: searchQuery,
      searchDepth = "basic",
      maxResults = 5,
      includeAnswer = true,
      includeDomains = [],
      excludeDomains = [],
      topic = "general",
    } = config;

    if (!searchQuery) return { success: false, error: "Web Search: 'query' is required.", skipped: true };
    // Vault: resolve + decrypt API key
    const cred = await resolveCredential(credentialId, context.workspaceId, "Web Search");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const payload = {
      api_key: apiKey,
      query: searchQuery,
      search_depth: searchDepth,
      max_results: Math.min(maxResults, MAX_RESULTS_LIMIT),
      include_answer: includeAnswer,
      topic,
    };

    if (includeDomains.length > 0) payload.include_domains = includeDomains;
    if (excludeDomains.length > 0) payload.exclude_domains = excludeDomains;

    try {
      const response = await axios.post(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
        maxContentLength: 5 * 1024 * 1024,
      });

      return {
        answer: response.data.answer || null,
        results: (response.data.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
        query: response.data.query,
        responseTime: response.data.response_time,
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Web Search: Invalid Tavily API key.");
      if (err.response?.status === 429) throw new Error("Web Search: Rate limit exceeded. Retry later.");
      throw new Error(`Web Search failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
