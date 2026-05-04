/**
 * JIRA NODE
 * Interact with Jira Cloud via the REST API v3.
 *
 * Operations:
 *   createIssue    — Create a Jira issue
 *   getIssue       — Get issue details by key (e.g. PROJ-123)
 *   updateIssue    — Update issue fields
 *   transitionIssue — Move issue to a new status
 *   searchIssues   — JQL search
 *   addComment     — Add a comment to an issue
 *   listProjects   — List accessible projects
 *
 * Auth: Basic auth — base64("email:apiToken") stored in vault
 *       OR store as "email:apiToken" and this node will encode it
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getAuth(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Jira");
  const raw = decrypt(cred.encryptedData, cred.iv, cred.authTag);
  // Accept pre-encoded base64 or "email:token" format
  if (raw.includes(":")) return Buffer.from(raw).toString("base64");
  return raw;
}

function handleError(err) {
  if (err.message?.startsWith("Jira")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errorMessages?.join(", ") ?? err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Jira: Auth failed — ${msg}. Check email and API token.`);
  if (status === 404) throw new Error(`Jira: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Jira: Validation error — ${msg}`);
  throw new Error(`Jira: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "searchIssues", domain } = config;
    if (!domain) return { success: false, error: "Jira: 'domain' is required (e.g. mycompany.atlassian.net) — configure this field.", skipped: true };

    const base64Auth = await getAuth(config.credentialId, context.workspaceId);
    const headers = { Authorization: `Basic ${base64Auth}`, "Content-Type": "application/json", Accept: "application/json" };
    const BASE = `https://${domain}/rest/api/3`;

    try {
      switch (operation) {
        case "createIssue": {
          const { project, issueType = "Task", summary, description, assignee, priority } = config;
          if (!project || !summary) return { success: false, error: "Jira createIssue: 'project' key and 'summary' are required — configure this field.", skipped: true };
          const body = {
            fields: {
              project: { key: project },
              issuetype: { name: issueType },
              summary,
              description: description ? { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] } : undefined,
              assignee: assignee ? { id: assignee } : undefined,
              priority: priority ? { name: priority } : undefined,
            },
          };
          const res = await axios.post(`${BASE}/issue`, body, { headers, timeout: 15000 });
          return { id: res.data.id, key: res.data.key, url: `https://${domain}/browse/${res.data.key}` };
        }

        case "getIssue": {
          if (!config.issueKey) return { success: false, error: "Jira getIssue: 'issueKey' (e.g. PROJ-123) is required — configure this field.", skipped: true };
          const res = await axios.get(`${BASE}/issue/${config.issueKey}`, { headers, timeout: 15000 });
          const f = res.data.fields;
          return { id: res.data.id, key: res.data.key, summary: f.summary, status: f.status?.name, assignee: f.assignee?.displayName, priority: f.priority?.name, url: `https://${domain}/browse/${res.data.key}` };
        }

        case "updateIssue": {
          if (!config.issueKey) return { success: false, error: "Jira updateIssue: 'issueKey' is required — configure this field.", skipped: true };
          const fields = {};
          if (config.summary) fields.summary = config.summary;
          if (config.assignee) fields.assignee = { id: config.assignee };
          if (config.priority) fields.priority = { name: config.priority };
          if (config.description) fields.description = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: config.description }] }] };
          await axios.put(`${BASE}/issue/${config.issueKey}`, { fields }, { headers, timeout: 15000 });
          return { updated: true, issueKey: config.issueKey };
        }

        case "transitionIssue": {
          if (!config.issueKey || !config.transitionId) return { success: false, error: "Jira transitionIssue: 'issueKey' and 'transitionId' are required — configure this field.", skipped: true };
          await axios.post(`${BASE}/issue/${config.issueKey}/transitions`, { transition: { id: config.transitionId } }, { headers, timeout: 15000 });
          return { transitioned: true, issueKey: config.issueKey };
        }

        case "addComment": {
          if (!config.issueKey || !config.comment) return { success: false, error: "Jira addComment: 'issueKey' and 'comment' are required — configure this field.", skipped: true };
          const body = { body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: config.comment }] }] } };
          const res = await axios.post(`${BASE}/issue/${config.issueKey}/comment`, body, { headers, timeout: 15000 });
          return { id: res.data.id, created: res.data.created };
        }

        case "searchIssues": {
          const jql = config.jql ?? "order by created DESC";
          const res = await axios.post(`${BASE}/issue/search`, { jql, maxResults: Math.min(Number(config.limit ?? 20), 100), fields: ["summary", "status", "assignee", "priority", "created"] }, { headers, timeout: 15000 });
          return { issues: res.data.issues?.map((i) => ({ id: i.id, key: i.key, summary: i.fields.summary, status: i.fields.status?.name, url: `https://${domain}/browse/${i.key}` })) ?? [], total: res.data.total };
        }

        case "listProjects": {
          const res = await axios.get(`${BASE}/project`, { headers, timeout: 15000 });
          return { projects: res.data?.map((p) => ({ id: p.id, key: p.key, name: p.name })) ?? [], count: res.data?.length ?? 0 };
        }

        default:
          throw new Error(`Jira: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
