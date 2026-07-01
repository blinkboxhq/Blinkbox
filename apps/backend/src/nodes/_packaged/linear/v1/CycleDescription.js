/**
 * Linear — Cycle resource. Handlers receive `(config, apiKey)`.
 */
import { gql } from "../GenericFunctions.js";

async function opListCycles(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listCycles: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { cycles(first: 50) { nodes { id number name startsAt endsAt completedAt } } } }`, { id: config.teamId }, apiKey);
  return { cycles: data.team.cycles.nodes };
}

export const cycleOperations = {
  listCycles: opListCycles,
};
