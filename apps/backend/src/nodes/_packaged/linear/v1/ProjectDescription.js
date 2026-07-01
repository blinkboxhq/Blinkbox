/**
 * Linear — Project resource (incl. milestones). Handlers receive `(config, apiKey)`.
 */
import { gql, LIMIT } from "../GenericFunctions.js";

async function opCreateProject(config, apiKey) {
  if (!config.name || !config.teamIds) return { success: false, error: "Linear createProject: 'name' and 'teamIds' are required.", skipped: true };
  const teamIds = String(config.teamIds).split(",").map((s) => s.trim()).filter(Boolean);
  const input = { name: config.name, teamIds };
  if (config.description) input.description = config.description;
  if (config.state) input.state = config.state;
  if (config.targetDate) input.targetDate = config.targetDate;
  const data = await gql(`mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }`, { input }, apiKey);
  const p = data.projectCreate.project;
  return { id: p.id, name: p.name, url: p.url, created: true };
}

async function opGetProject(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear getProject: 'projectId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { project(id: $id) { id name description state url progress targetDate lead { name } } }`, { id: config.projectId }, apiKey);
  const p = data.project;
  return { id: p.id, name: p.name, description: p.description, state: p.state, progress: p.progress, targetDate: p.targetDate, lead: p.lead?.name, url: p.url };
}

async function opUpdateProject(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear updateProject: 'projectId' is required.", skipped: true };
  const input = {};
  if (config.name) input.name = config.name;
  if (config.description) input.description = config.description;
  if (config.state) input.state = config.state;
  if (config.targetDate) input.targetDate = config.targetDate;
  await gql(`mutation($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`, { id: config.projectId, input }, apiKey);
  return { updated: true, projectId: config.projectId };
}

async function opListProjects(config, apiKey) {
  const data = await gql(`query($first: Int) { projects(first: $first, orderBy: updatedAt) { nodes { id name description state url progress targetDate } } }`, { first: LIMIT(config) }, apiKey);
  return { projects: data.projects.nodes, count: data.projects.nodes.length };
}

async function opListProjectMilestones(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear listProjectMilestones: 'projectId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { project(id: $id) { projectMilestones(first: 50) { nodes { id name targetDate } } } }`, { id: config.projectId }, apiKey);
  return { milestones: data.project.projectMilestones.nodes };
}

async function opCreateProjectMilestone(config, apiKey) {
  if (!config.projectId || !config.name) return { success: false, error: "Linear createProjectMilestone: 'projectId' and 'name' are required.", skipped: true };
  const input = { projectId: config.projectId, name: config.name };
  if (config.targetDate) input.targetDate = config.targetDate;
  const data = await gql(`mutation($input: ProjectMilestoneCreateInput!) { projectMilestoneCreate(input: $input) { success projectMilestone { id name } } }`, { input }, apiKey);
  return { id: data.projectMilestoneCreate.projectMilestone.id, name: data.projectMilestoneCreate.projectMilestone.name, created: true };
}

export const projectOperations = {
  createProject: opCreateProject,
  getProject: opGetProject,
  updateProject: opUpdateProject,
  listProjects: opListProjects,
  listProjectMilestones: opListProjectMilestones,
  createProjectMilestone: opCreateProjectMilestone,
};
