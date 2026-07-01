/**
 * Zendesk — Search / Satisfaction.
 */
import { need, lim } from "../GenericFunctions.js";

async function opSearch(config, { api }) {
  const q = need(config, "query", "search"); if (q) return q;
  const { data } = await api.get(`/search.json`, { params: { query: config.query, per_page: lim(config.limit) } });
  return { success: true, results: data.results || [], count: data.count };
}
async function opSearchTickets(config, { api }) {
  const q = need(config, "query", "searchTickets"); if (q) return q;
  const { data } = await api.get(`/search.json`, { params: { query: `type:ticket ${config.query}`, per_page: lim(config.limit) } });
  return { success: true, results: data.results || [], count: data.count };
}
async function opListSatisfactionRatings(config, { api }) {
  const { data } = await api.get(`/satisfaction_ratings.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, satisfaction_ratings: data.satisfaction_ratings || [], count: data.count };
}

export const searchOperations = {
  search: opSearch, searchTickets: opSearchTickets, listSatisfactionRatings: opListSatisfactionRatings,
};
