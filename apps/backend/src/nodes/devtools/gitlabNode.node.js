import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = u.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/, /^0:0:0:0:0:0:0:1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/i, /^fe80:/i, /^fd/i,
    /\.internal$/, /\.local$/,
  ];
  if (blocked.some(r => r.test(h))) throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "listIssues";
    const baseUrl = config.baseUrl || "https://gitlab.com";
    const projectId = config.project || config.projectId || input?.projectId;
    if (!projectId) return { success: false, error: "gitlab: 'project' (ID or namespace/name) is required.", skipped: true };
    assertSafeUrl(baseUrl);

    const token = await getOAuthToken(config.credentialId, context?.workspaceId, "GitLab");
    const headers = { "PRIVATE-TOKEN": token, "Content-Type": "application/json" };
    const api = `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}`;

    function handleError(err) {
      if (err.message?.startsWith("gitlab:")) throw err;
      const status = err.response?.status;
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      if (status === 401 || status === 403) throw new Error(`gitlab: Auth failed — ${msg}. Check your Personal Access Token.`);
      if (status === 404) throw new Error(`gitlab: Resource not found — ${msg}. Check project ID or namespace.`);
      if (status === 400) throw new Error(`gitlab: Validation error — ${msg}`);
      throw new Error(`gitlab: ${status ?? "Error"} — ${msg}`);
    }

    try {
      switch (operation) {
        case "listIssues": {
          const res = await axios.get(`${api}/issues`, { headers, params: { state: config.state || "opened", per_page: Math.min(Number(config.limit || 20), 100) }, timeout: 15000 });
          return { items: res.data.map((i) => ({ id: i.id, iid: i.iid, title: i.title, state: i.state, web_url: i.web_url, author: i.author?.username })), count: res.data.length };
        }

        case "createIssue": {
          if (!config.title) return { success: false, error: "gitlab createIssue: 'title' is required.", skipped: true };
          const res = await axios.post(`${api}/issues`, { title: config.title, description: config.description, labels: config.labels }, { headers, timeout: 15000 });
          return { id: res.data.id, iid: res.data.iid, title: res.data.title, state: res.data.state, web_url: res.data.web_url };
        }

        case "updateIssue": {
          if (!config.issueIid) return { success: false, error: "gitlab updateIssue: 'issueIid' is required.", skipped: true };
          const body = {};
          if (config.title) body.title = config.title;
          if (config.description) body.description = config.description;
          if (config.labels) body.labels = config.labels;
          if (config.state_event) body.state_event = config.state_event;
          const res = await axios.put(`${api}/issues/${config.issueIid}`, body, { headers, timeout: 15000 });
          return { id: res.data.id, iid: res.data.iid, title: res.data.title, state: res.data.state, web_url: res.data.web_url };
        }

        case "commentIssue": {
          if (!config.issueIid) return { success: false, error: "gitlab commentIssue: 'issueIid' is required.", skipped: true };
          if (!config.body) return { success: false, error: "gitlab commentIssue: 'body' is required.", skipped: true };
          const res = await axios.post(`${api}/issues/${config.issueIid}/notes`, { body: config.body }, { headers, timeout: 15000 });
          return { id: res.data.id, body: res.data.body, author: res.data.author?.username, created_at: res.data.created_at };
        }

        case "createMR": {
          if (!config.title || !config.sourceBranch) return { success: false, error: "gitlab createMR: 'title' and 'sourceBranch' are required.", skipped: true };
          const res = await axios.post(`${api}/merge_requests`, { title: config.title, source_branch: config.sourceBranch, target_branch: config.targetBranch || "main", description: config.description }, { headers, timeout: 15000 });
          return { id: res.data.id, iid: res.data.iid, title: res.data.title, state: res.data.state, web_url: res.data.web_url };
        }

        case "mergeMR": {
          if (!config.mrIid) return { success: false, error: "gitlab mergeMR: 'mrIid' is required.", skipped: true };
          const res = await axios.put(`${api}/merge_requests/${config.mrIid}/merge`, {}, { headers, timeout: 15000 });
          return { id: res.data.id, iid: res.data.iid, state: res.data.state, merged_at: res.data.merged_at, web_url: res.data.web_url };
        }

        case "triggerPipeline": {
          let vars = config.variables;
          if (typeof vars === "string") { try { vars = JSON.parse(vars); } catch { vars = {}; } }
          const body = { ref: config.ref || "main" };
          if (vars && typeof vars === "object") {
            body.variables = Object.entries(vars).map(([key, value]) => ({ key, value: String(value) }));
          }
          const res = await axios.post(`${api}/pipeline`, body, { headers, timeout: 15000 });
          return { id: res.data.id, status: res.data.status, ref: res.data.ref, web_url: res.data.web_url };
        }

        case "getProject": {
          const res = await axios.get(api, { headers, timeout: 15000 });
          return { id: res.data.id, name: res.data.name, description: res.data.description, web_url: res.data.web_url, default_branch: res.data.default_branch, visibility: res.data.visibility, star_count: res.data.star_count, forks_count: res.data.forks_count };
        }

        default:
          throw new Error(`gitlab: Unknown operation "${operation}". Valid: listIssues, createIssue, updateIssue, commentIssue, createMR, mergeMR, triggerPipeline, getProject.`);
      }
    } catch (err) { handleError(err); }
  },
};
