import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listIssues";
    const org = config.organization || config.org || input.organization || "";

    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Sentry");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "Sentry: auth token required.", skipped: true };

    const BASE = "https://sentry.io/api/0";
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
    switch (operation) {
      case "listIssues": {
        if (!org) return { success: false, error: "Sentry listIssues: 'organization' slug required.", skipped: true };
        const project = config.project ? `&project=${config.project}` : "";
        const { data } = await axios.get(`${BASE}/organizations/${org}/issues/?limit=${config.limit || 25}&query=${encodeURIComponent(config.query || "is:unresolved")}${project}`, { headers, timeout: 15000 });
        return { issues: data, count: data.length };
      }
      case "getIssue": {
        const id = config.issueId || input.issueId;
        if (!id) return { success: false, error: "Sentry getIssue: 'issueId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/issues/${id}/`, { headers, timeout: 10000 });
        return data;
      }
      case "resolveIssue": {
        const id = config.issueId || input.issueId;
        if (!id) return { success: false, error: "Sentry resolveIssue: 'issueId' required.", skipped: true };
        const { data } = await axios.put(`${BASE}/issues/${id}/`, { status: "resolved" }, { headers, timeout: 10000 });
        return { id, status: data.status, resolved: true };
      }
      case "ignoreIssue": {
        const id = config.issueId || input.issueId;
        if (!id) return { success: false, error: "Sentry ignoreIssue: 'issueId' required.", skipped: true };
        const { data } = await axios.put(`${BASE}/issues/${id}/`, { status: "ignored" }, { headers, timeout: 10000 });
        return { id, status: data.status, ignored: true };
      }
      case "assignIssue": {
        const id = config.issueId || input.issueId;
        const assignee = config.assignee || input.assignee;
        if (!id) return { success: false, error: "Sentry assignIssue: 'issueId' required.", skipped: true };
        if (!assignee) return { success: false, error: "Sentry assignIssue: 'assignee' (username or email) required.", skipped: true };
        const { data } = await axios.put(`${BASE}/issues/${id}/`, { assignedTo: assignee }, { headers, timeout: 10000 });
        return { id, assignedTo: data.assignedTo };
      }
      case "listEvents": {
        const id = config.issueId || input.issueId;
        if (!id) return { success: false, error: "Sentry listEvents: 'issueId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/issues/${id}/events/?limit=${config.limit || 25}`, { headers, timeout: 15000 });
        return { events: data, count: data.length };
      }
      case "createProject": {
        if (!org) return { success: false, error: "Sentry createProject: 'organization' slug required.", skipped: true };
        const team = config.team || input.team;
        if (!team) return { success: false, error: "Sentry createProject: 'team' slug required.", skipped: true };
        const { data } = await axios.post(`${BASE}/teams/${org}/${team}/projects/`, { name: config.name || "New Project", platform: config.platform || "javascript" }, { headers, timeout: 10000 });
        return { id: data.id, slug: data.slug, name: data.name, platform: data.platform };
      }
      case "listProjects": {
        if (!org) return { success: false, error: "Sentry listProjects: 'organization' slug required.", skipped: true };
        const { data } = await axios.get(`${BASE}/organizations/${org}/projects/`, { headers, timeout: 10000 });
        return { projects: data, count: data.length };
      }
      case "updateIssue": {
        const id = config.issueId || input.issueId;
        if (!id) return { success: false, error: "Sentry updateIssue: 'issueId' required.", skipped: true };
        const update = {};
        if (config.status) update.status = config.status;
        if (config.assignedTo) update.assignedTo = config.assignedTo;
        if (config.hasSeen !== undefined) update.hasSeen = Boolean(config.hasSeen);
        if (!Object.keys(update).length) return { success: false, error: "Sentry updateIssue: provide at least one field to update (status, assignedTo, hasSeen).", skipped: true };
        const { data } = await axios.put(`${BASE}/issues/${id}/`, update, { headers, timeout: 10000 });
        return { id, status: data.status, assignedTo: data.assignedTo };
      }
      case "createRelease": {
        if (!org) return { success: false, error: "Sentry createRelease: 'organization' slug required.", skipped: true };
        if (!config.version) return { success: false, error: "Sentry createRelease: 'version' required.", skipped: true };
        const body = { version: config.version };
        if (config.ref) body.ref = config.ref;
        if (config.url) body.url = config.url;
        if (config.projects) body.projects = String(config.projects).split(",").map((p) => p.trim()).filter(Boolean);
        const { data } = await axios.post(`${BASE}/organizations/${org}/releases/`, body, { headers, timeout: 10000 });
        return { version: data.version, url: data.url, dateCreated: data.dateCreated, projects: data.projects };
      }
      case "listOrganizations": {
        const { data } = await axios.get(`${BASE}/organizations/`, { headers, timeout: 10000 });
        return { organizations: data, count: data.length };
      }
      case "captureEvent": {
        if (!org || !config.project) return { success: false, error: "Sentry captureEvent: 'organization' and 'project' required.", skipped: true };
        const dsn = config.dsn;
        if (!dsn) return { success: false, error: "Sentry captureEvent: 'dsn' required.", skipped: true };
        const dsnMatch = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
        if (!dsnMatch) return { success: false, error: "Sentry captureEvent: invalid DSN format.", skipped: true };
        const [, key, host, projectId] = dsnMatch;
        const { data } = await axios.post(`https://${host}/api/${projectId}/store/`, { message: config.message || "BlinkBox event", level: config.level || "error", tags: config.tags || {} }, { headers: { "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${key}` }, timeout: 10000 });
        return { id: data.id, success: true };
      }
      default:
        return { success: false, error: `Sentry: Unknown operation "${operation}".`, skipped: true };
    }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
      if (status === 401 || status === 403) throw new Error(`Sentry: Auth failed (${status}) — check your API token and org slug.`);
      if (status === 404) throw new Error(`Sentry: Not found — check organization/issue ID.`);
      if (status === 429) throw new Error(`Sentry: Rate limit exceeded. Add a Delay node.`);
      if (err.message.startsWith("Sentry")) throw err;
      throw new Error(`Sentry: ${status || "Error"} — ${msg}`);
    }
  },
};
