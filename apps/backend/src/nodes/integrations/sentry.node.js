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
      case "listProjects": {
        if (!org) return { success: false, error: "Sentry listProjects: 'organization' slug required.", skipped: true };
        const { data } = await axios.get(`${BASE}/organizations/${org}/projects/`, { headers, timeout: 10000 });
        return { projects: data, count: data.length };
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
  },
};
