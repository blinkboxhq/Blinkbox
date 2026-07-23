/**
 * SendGrid — email validation, account stats, suppression management.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opValidateEmail(config, token) {
  if (!config.email) return { success: false, error: "SendGrid validateEmail: 'email' is required.", skipped: true };
  const response = await axios.post(`${BASE}/validations/email`, { email: config.email, source: config.source || "blinkbox" }, { headers: auth(token), timeout: 120000 });
  const r = response.data.result || {};
  return { verdict: r.verdict, score: r.score, email: r.email, suggestion: r.suggestion, checks: r.checks };
}

async function opGetStats(config, token) {
  if (!config.startDate) return { success: false, error: "SendGrid getStats: 'startDate' (YYYY-MM-DD) is required.", skipped: true };
  const params = { start_date: config.startDate };
  if (config.endDate) params.end_date = config.endDate;
  if (config.aggregatedBy) params.aggregated_by = config.aggregatedBy;
  const response = await axios.get(`${BASE}/stats`, { headers: auth(token), params, timeout: 120000 });
  return { stats: response.data || [] };
}

async function opListSuppressions(config, token) {
  const type = config.suppressionType || "bounces";
  const valid = ["bounces", "blocks", "spam_reports", "invalid_emails", "unsubscribes"];
  if (!valid.includes(type)) throw new Error(`SendGrid listSuppressions: 'suppressionType' must be one of ${valid.join(", ")}.`);
  const path = type === "unsubscribes" ? "/suppression/unsubscribes" : `/suppression/${type}`;
  const response = await axios.get(`${BASE}${path}`, { headers: auth(token), timeout: 120000 });
  return { type, suppressions: response.data || [] };
}

async function opDeleteSuppression(config, token) {
  const type = config.suppressionType || "bounces";
  if (!config.email) return { success: false, error: "SendGrid deleteSuppression: 'email' is required.", skipped: true };
  const path = type === "unsubscribes" ? "/asm/suppressions/global" : `/suppression/${type}`;
  await axios.delete(`${BASE}${path}/${encodeURIComponent(config.email)}`, { headers: auth(token), timeout: 120000 });
  return { email: config.email, type, removed: true };
}

export const miscOperations = {
  validateEmail: opValidateEmail,
  getStats: opGetStats,
  listSuppressions: opListSuppressions,
  deleteSuppression: opDeleteSuppression,
};
