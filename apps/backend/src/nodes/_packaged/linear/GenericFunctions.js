/**
 * Linear — shared helpers for all v1 action files.
 * Linear uses a single GraphQL endpoint; every handler is called `(config, apiKey)`
 * where `apiKey` is the resolved token (lin_api_...). Handlers POST GraphQL query
 * strings via the `gql(query, variables, apiKey)` helper. makeReq(token) simply
 * passes the token through as the requester the slim entry hands to the router.
 */
import axios from "axios";

export const BASE = "https://api.linear.app/graphql";

export async function gql(query, variables, apiKey) {
  const res = await axios.post(BASE, { query, variables }, {
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    timeout: 15000,
  });
  if (res.data.errors?.length) throw new Error(`Linear: ${res.data.errors[0].message}`);
  return res.data.data;
}

export const LIMIT = (config, def = 25) => Math.min(Number(config.limit || def), 100);

export const ISSUE_FIELDS = "id identifier title description priority url state { name } assignee { name } team { key } createdAt updatedAt";

export function makeReq(token) {
  return token;
}

export function handleError(err) {
  if (err.message?.startsWith("Linear")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error("Linear: Invalid API key.");
  if (status === 429) throw new Error("Linear: Rate limit exceeded. Slow down requests.");
  throw new Error(`Linear: ${err.message}`);
}
