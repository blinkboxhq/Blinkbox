/**
 * Monday.com — shared primitives. GraphQL transport, credential resolution,
 * error mapping, and the column-values JSON coercer. Monday API v2 (GraphQL),
 * API-Version 2024-01.
 *
 * Auth: personal API token / OAuth access token, sent as `Bearer <token>`.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const GQL_URL = "https://api.monday.com/v2";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Monday");
}

export function buildClient(token) {
  return { token };
}

export async function gql(client, query, variables = {}) {
  const token = client.token;
  let res;
  try {
    res = await axios.post(
      GQL_URL,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "API-Version": "2024-01",
        },
        timeout: 20000,
      }
    );
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.errors?.[0]?.message ?? err.message;
    if (status === 401 || status === 403) throw new Error(`Monday: Auth failed — ${msg}. Check your API token.`);
    if (status === 429) throw new Error(`Monday: Rate limit exceeded — slow down requests.`);
    throw new Error(`Monday: HTTP ${status ?? "Error"} — ${msg}`);
  }
  if (res.data.errors?.length) {
    const msg = res.data.errors[0].message;
    if (msg.includes("not found") || msg.includes("doesn't exist")) throw new Error(`Monday: Resource not found — ${msg}`);
    if (msg.includes("permission") || msg.includes("authorized")) throw new Error(`Monday: Permission denied — ${msg}`);
    throw new Error(`Monday: GraphQL error — ${msg}`);
  }
  return res.data.data;
}

export function parseColumnValues(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    throw new Error("Monday: columnValues must be valid JSON.");
  }
}

export function handleError(err) {
  if (err.message?.startsWith("Monday")) throw err;
  throw new Error(`Monday: ${err.message}`);
}

export function boundLimit(val, max, def = 50) {
  return Math.min(Number(val) || def, max);
}
