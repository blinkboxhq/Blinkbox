/**
 * WEB SEARCH (Tavily) — Search & Extract resource. `search` preserved verbatim
 * from the monolith; qnaSearch, extract, searchContext added for parity with the
 * Tavily API surface. `extract` accepts user-supplied URLs, so every URL is run
 * through the SSRF resolver guard before it is sent. Handlers receive
 * (config, ctx) where ctx is { apiKey }.
 */
import { post, asArray, MAX_RESULTS_LIMIT } from "../GenericFunctions.js";
import { assertSafeUrlResolved } from "../../../../utils/ssrf.js";

function buildSearchPayload(config, apiKey) {
  const {
    query: searchQuery,
    searchDepth = "basic",
    maxResults = 5,
    includeAnswer = true,
    topic = "general",
  } = config;
  const payload = {
    api_key: apiKey,
    query: searchQuery,
    search_depth: searchDepth,
    max_results: Math.min(maxResults, MAX_RESULTS_LIMIT),
    include_answer: includeAnswer,
    topic,
  };
  const includeDomains = asArray(config.includeDomains);
  const excludeDomains = asArray(config.excludeDomains);
  if (includeDomains.length > 0) payload.include_domains = includeDomains;
  if (excludeDomains.length > 0) payload.exclude_domains = excludeDomains;
  return payload;
}

async function opSearch(config, { apiKey }) {
  if (!config.query) return { success: false, error: "Web Search: 'query' is required.", skipped: true };
  const data = await post("/search", buildSearchPayload(config, apiKey));
  return {
    answer: data.answer || null,
    results: (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
    query: data.query,
    responseTime: data.response_time,
  };
}

async function opQnaSearch(config, { apiKey }) {
  if (!config.query) return { success: false, error: "Web Search: 'query' is required.", skipped: true };
  const payload = buildSearchPayload({ ...config, includeAnswer: true }, apiKey);
  const data = await post("/search", payload);
  return { answer: data.answer || null, query: data.query, responseTime: data.response_time };
}

async function opSearchContext(config, { apiKey }) {
  if (!config.query) return { success: false, error: "Web Search: 'query' is required.", skipped: true };
  const data = await post("/search", buildSearchPayload({ ...config, searchDepth: config.searchDepth || "advanced" }, apiKey));
  const context = (data.results || []).map((r) => `${r.title}\n${r.url}\n${r.content}`).join("\n\n---\n\n");
  return { context, sources: (data.results || []).map((r) => r.url), query: data.query };
}

async function opExtract(config, { apiKey }) {
  const urls = asArray(config.urls);
  if (urls.length === 0) return { success: false, error: "Web Search: 'urls' is required for extract.", skipped: true };
  for (const u of urls) {
    try { await assertSafeUrlResolved(u); }
    catch (e) { return { success: false, error: `Web Search: Blocked URL — ${e.message}`, skipped: true }; }
  }
  const data = await post("/extract", { api_key: apiKey, urls });
  return {
    results: (data.results || []).map((r) => ({ url: r.url, rawContent: r.raw_content })),
    failedResults: data.failed_results || [],
    responseTime: data.response_time,
  };
}

export const searchOperations = {
  search: opSearch,
  qnaSearch: opQnaSearch,
  searchContext: opSearchContext,
  extract: opExtract,
};
