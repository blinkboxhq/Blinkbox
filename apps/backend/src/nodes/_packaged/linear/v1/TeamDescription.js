/**
 * Linear — Team resource. Handlers receive `(config, apiKey)`.
 */
import { gql } from "../GenericFunctions.js";

async function opListTeams(config, apiKey) {
  const data = await gql(`query { teams { nodes { id name key } } }`, {}, apiKey);
  return { teams: data.teams.nodes, count: data.teams.nodes.length };
}

async function opGetTeam(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear getTeam: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { id name key description issueCount cyclesEnabled } }`, { id: config.teamId }, apiKey);
  return data.team;
}

async function opListTeamStates(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listTeamStates: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { states { nodes { id name type color } } } }`, { id: config.teamId }, apiKey);
  return { states: data.team.states.nodes };
}

async function opListTeamMembers(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listTeamMembers: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { members { nodes { id name email active } } } }`, { id: config.teamId }, apiKey);
  return { members: data.team.members.nodes };
}

export const teamOperations = {
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamStates: opListTeamStates,
  listTeamMembers: opListTeamMembers,
};
