/**
 * Linear — User resource. Handlers receive `(config, apiKey)`.
 */
import { gql, LIMIT } from "../GenericFunctions.js";

async function opListUsers(config, apiKey) {
  const data = await gql(`query($first: Int) { users(first: $first) { nodes { id name email active admin } } }`, { first: LIMIT(config, 50) }, apiKey);
  return { users: data.users.nodes, count: data.users.nodes.length };
}

async function opGetViewer(config, apiKey) {
  const data = await gql(`query { viewer { id name email admin } }`, {}, apiKey);
  return data.viewer;
}

export const userOperations = {
  listUsers: opListUsers,
  getViewer: opGetViewer,
};
