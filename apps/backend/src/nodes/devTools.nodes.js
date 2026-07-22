import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";
import { executeCustom as containerExecuteCustom } from "../infra/container.pool.js";
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

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

// ── graphql_request ───────────────────────────────────────────────────────────
export const graphql_request = {
  async run(config, input, context) {
    const url = config.endpoint || config.url || input?.url;
    const query = config.query || input?.query;
    if (!url) return { success: false, error: "graphql_request: 'url' is required.", skipped: true };
    if (!query) return { success: false, error: "graphql_request: 'query' is required.", skipped: true };

    assertSafeUrl(url);

    let variables = config.variables || input?.variables || {};
    if (typeof variables === "string") { try { variables = JSON.parse(variables); } catch { variables = {}; } }

    let extraHeaders = config.headers || {};
    if (typeof extraHeaders === "string") { try { extraHeaders = JSON.parse(extraHeaders); } catch { extraHeaders = {}; } }
    const headers = { "Content-Type": "application/json", ...extraHeaders };

    if (config.authToken || config.credentialId) {
      const token = config.authToken || await getKey(config.credentialId, context?.workspaceId, "GraphQL");
      headers.Authorization = `Bearer ${token}`;
    }

    const timeoutMs = config.timeout ? (config.timeout <= 300 ? config.timeout * 1000 : config.timeout) : 30000;
    const res = await axios.post(url, { query, variables }, { headers, timeout: timeoutMs });
    if (res.data.errors?.length) throw new Error(`GraphQL errors: ${res.data.errors.map((e) => e.message).join("; ")}`);
    return { data: res.data.data, errors: res.data.errors || null, extensions: res.data.extensions || null };
  },
};

// ── grpc_call ─────────────────────────────────────────────────────────────────
export const grpc_call = {
  async run(config, input) {
    // gRPC requires native bindings — soft-fail with guidance
    return {
      success: false,
      error: "grpc_call: gRPC native bindings are not available in this environment. Use the HTTP/REST equivalent or a gRPC-Web proxy.",
      skipped: true,
      host: config.host,
      method: config.method,
    };
  },
};

// ── gitlab ────────────────────────────────────────────────────────────────────
export const gitlab = {
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
          // The panel sends [{ key, value }] rows; older configs sent a plain object.
          const pairs = Array.isArray(vars)
            ? vars.filter((v) => v?.key).map((v) => ({ key: v.key, value: String(v.value ?? "") }))
            : vars && typeof vars === "object"
              ? Object.entries(vars).map(([key, value]) => ({ key, value: String(value) }))
              : [];
          if (pairs.length) body.variables = pairs;
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

// ── azure_devops ──────────────────────────────────────────────────────────────
export const azure_devops = {
  async run(config, input, context) {
    const operation = config.operation || "listWorkItems";
    const org = config.organization || input?.organization;
    const project = config.project || input?.project;
    const token = config.token || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "AzureDevOps"));
    if (!token) throw new Error("azure_devops: Personal Access Token required.");
    if (!org) return { success: false, error: "azure_devops: 'organization' is required.", skipped: true };

    const auth = Buffer.from(`:${token}`).toString("base64");
    const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
    const base = `https://dev.azure.com/${org}/${project}/_apis`;

    if (operation === "listWorkItems") {
      const wiql = { query: `SELECT [Id],[Title],[State],[AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [Id] DESC` };
      const queryRes = await axios.post(`${base}/wit/wiql?api-version=7.0`, wiql, { headers });
      const ids = (queryRes.data.workItems || []).slice(0, parseInt(config.limit || 20)).map((w) => w.id);
      if (!ids.length) return { items: [], count: 0 };
      const itemsRes = await axios.get(`${base}/wit/workitems?ids=${ids.join(",")}&api-version=7.0`, { headers });
      return { items: itemsRes.data.value, count: itemsRes.data.value.length };
    }
    if (operation === "createWorkItem") {
      const type = config.workItemType || "Task";
      const body = [{ op: "add", path: "/fields/System.Title", value: config.title }, { op: "add", path: "/fields/System.Description", value: config.description || "" }];
      const res = await axios.post(`${base}/wit/workitems/$${type}?api-version=7.0`, body, { headers: { ...headers, "Content-Type": "application/json-patch+json" } });
      return res.data;
    }
    if (operation === "listPipelines") {
      const res = await axios.get(`${base}/pipelines?api-version=7.0`, { headers });
      return { items: res.data.value, count: res.data.count };
    }
    throw new Error(`azure_devops: Unknown operation "${operation}".`);
  },
};

// ── github_issue ──────────────────────────────────────────────────────────────
export const github_issue = {
  async run(config, input, context) {
    const operation = config.operation || "create";
    const owner = config.owner || input?.owner;
    const repo = config.repo || input?.repo;
    const token = config.token || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "GitHub"));
    if (!token) throw new Error("github_issue: GitHub token required.");
    if (!owner || !repo) return { success: false, error: "github_issue: 'owner' and 'repo' are required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" };
    const api = `https://api.github.com/repos/${owner}/${repo}/issues`;

    if (operation === "create") {
      const res = await axios.post(api, { title: config.title, body: config.body || config.description, labels: config.labels || [], assignees: config.assignees || [] }, { headers });
      return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
    }
    if (operation === "list") {
      const res = await axios.get(api, { headers, params: { state: config.state || "open", per_page: config.limit || 20 } });
      return { issues: res.data.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, labels: i.labels.map((l) => l.name) })), count: res.data.length };
    }
    if (operation === "close" || operation === "reopen") {
      const res = await axios.patch(`${api}/${config.issueNumber}`, { state: operation === "close" ? "closed" : "open" }, { headers });
      return { number: res.data.number, state: res.data.state };
    }
    if (operation === "comment") {
      const res = await axios.post(`${api}/${config.issueNumber}/comments`, { body: config.comment || config.body }, { headers });
      return { id: res.data.id, url: res.data.html_url };
    }
    throw new Error(`github_issue: Unknown operation "${operation}".`);
  },
};

// ── docker ────────────────────────────────────────────────────────────────────
export const docker = {
  async run(config, input) {
    const operation = config.operation || "listContainers";
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

    const dockerRequest = (method, path, data) =>
      axios({ method, socketPath, url: `http://localhost${path}`, data, timeout: 30000 })
        .catch((err) => { throw new Error(`docker: ${err.response?.data?.message || err.message}`); });

    if (operation === "listContainers") {
      const res = await dockerRequest("get", `/containers/json?all=${config.all !== false}`);
      return { containers: res.data.map((c) => ({ id: c.Id.slice(0, 12), names: c.Names, image: c.Image, status: c.Status, state: c.State })), count: res.data.length };
    }
    if (operation === "listImages") {
      const res = await dockerRequest("get", "/images/json");
      return { images: res.data.map((i) => ({ id: i.Id.slice(7, 19), tags: i.RepoTags, size: i.Size, created: new Date(i.Created * 1000).toISOString() })), count: res.data.length };
    }
    if (operation === "start") {
      await dockerRequest("post", `/containers/${config.containerId}/start`);
      return { containerId: config.containerId, started: true };
    }
    if (operation === "stop") {
      await dockerRequest("post", `/containers/${config.containerId}/stop`);
      return { containerId: config.containerId, stopped: true };
    }
    if (operation === "logs") {
      const res = await dockerRequest("get", `/containers/${config.containerId}/logs?stdout=true&stderr=true&tail=${config.tail || 100}`);
      return { logs: String(res.data), containerId: config.containerId };
    }
    if (operation === "stats") {
      const res = await dockerRequest("get", `/containers/${config.containerId}/stats?stream=false`);
      return { cpuPercent: null, memoryUsage: res.data.memory_stats?.usage, containerId: config.containerId };
    }
    throw new Error(`docker: Unknown operation "${operation}".`);
  },
};

// ── docker_run ────────────────────────────────────────────────────────────────
export const docker_run = {
  async run(config, input, context = {}) {
    const image = config.image || input?.image;
    const cmd = config.command || input?.command;
    if (!image) return { success: false, error: "docker_run: 'image' is required.", skipped: true };

    const result = await containerExecuteCustom(
      { image, command: Array.isArray(cmd) ? cmd.join(" ") : (cmd || ""), env: config.env || {}, timeoutSeconds: Math.ceil((config.timeout || 60000) / 1000) },
      context.workspaceId || "default"
    );
    return { output: result.stdout, stderr: result.stderr, exitCode: result.exitCode, image, command: cmd };
  },
};

// ── ssh ───────────────────────────────────────────────────────────────────────
export const ssh = {
  async run(config, input, context) {
    const { NodeSSH } = await import("node-ssh").catch(() => { throw new Error("ssh: node-ssh package not installed."); });
    const host = config.host || input?.host;
    const command = config.command || input?.command;
    if (!host) return { success: false, error: "ssh: 'host' is required.", skipped: true };
    if (!command) return { success: false, error: "ssh: 'command' is required.", skipped: true };

    const client = new NodeSSH();
    await client.connect({
      host, port: parseInt(config.port || 22),
      username: config.username || "ubuntu",
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      readyTimeout: 15000,
    });

    try {
      const result = await client.execCommand(command, { cwd: config.cwd || "/" });
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.code, host, command };
    } finally {
      client.dispose();
    }
  },
};

// ── google_docs ───────────────────────────────────────────────────────────────
export const google_docs = {
  async run(config, input, context) {
    const operation = config.operation || "read";
    const docId = config.docId || input?.docId;
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Google"));
    if (!token) throw new Error("google_docs: Google OAuth access token required.");

    const headers = { Authorization: `Bearer ${token}` };

    if (operation === "read") {
      if (!docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
      const res = await axios.get(`https://docs.googleapis.com/v1/documents/${docId}`, { headers });
      const body = res.data.body?.content || [];
      const text = body.flatMap((el) => el.paragraph?.elements?.map((e) => e.textRun?.content || "") || []).join("");
      return { docId, title: res.data.title, text, content: res.data.body };
    }
    if (operation === "create") {
      const res = await axios.post("https://docs.googleapis.com/v1/documents", { title: config.title || "New Document" }, { headers });
      return { docId: res.data.documentId, title: res.data.title, url: `https://docs.google.com/document/d/${res.data.documentId}` };
    }
    if (operation === "append") {
      if (!docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
      const text = config.text || input?.text || "";
      const res = await axios.post(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        requests: [{ insertText: { location: { index: 1 }, text } }],
      }, { headers });
      return { docId, revised: res.data.documentId };
    }
    throw new Error(`google_docs: Unknown operation "${operation}".`);
  },
};

// ── google_forms ──────────────────────────────────────────────────────────────
export const google_forms = {
  async run(config, input, context) {
    const operation = config.operation || "getResponses";
    const formId = config.formId || input?.formId;
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Google"));
    if (!token) throw new Error("google_forms: Google OAuth access token required.");
    if (!formId) return { success: false, error: "google_forms: 'formId' is required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}` };

    if (operation === "getResponses") {
      const res = await axios.get(`https://forms.googleapis.com/v1/forms/${formId}/responses`, { headers });
      const responses = (res.data.responses || []).map((r) => ({ responseId: r.responseId, createTime: r.createTime, answers: r.answers }));
      return { responses, count: responses.length, formId };
    }
    if (operation === "getForm") {
      const res = await axios.get(`https://forms.googleapis.com/v1/forms/${formId}`, { headers });
      return { formId, title: res.data.info?.title, description: res.data.info?.description, questions: res.data.items?.length || 0 };
    }
    throw new Error(`google_forms: Unknown operation "${operation}".`);
  },
};

// ── figma ─────────────────────────────────────────────────────────────────────
export const figma = {
  async run(config, input, context) {
    const operation = config.operation || "getFile";
    const fileKey = config.fileKey || input?.fileKey;
    const token = config.apiToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Figma"));
    if (!token) throw new Error("figma: Figma Personal Access Token required.");
    if (!fileKey) return { success: false, error: "figma: 'fileKey' is required.", skipped: true };

    const headers = { "X-Figma-Token": token };
    const base = "https://api.figma.com/v1";

    if (operation === "getFile") {
      const res = await axios.get(`${base}/files/${fileKey}`, { headers, params: { depth: config.depth || 2 } });
      return { name: res.data.name, lastModified: res.data.lastModified, thumbnailUrl: res.data.thumbnailUrl, version: res.data.version, pages: res.data.document?.children?.map((c) => ({ id: c.id, name: c.name })) };
    }
    if (operation === "getComponents") {
      const res = await axios.get(`${base}/files/${fileKey}/components`, { headers });
      return { components: res.data.meta?.components || [], count: (res.data.meta?.components || []).length };
    }
    if (operation === "exportImage") {
      const nodeId = config.nodeId || input?.nodeId;
      if (!nodeId) return { success: false, error: "figma exportImage: 'nodeId' required.", skipped: true };
      const res = await axios.get(`${base}/images/${fileKey}`, { headers, params: { ids: nodeId, format: config.format || "png", scale: config.scale || 2 } });
      return { images: res.data.images, err: res.data.err };
    }
    throw new Error(`figma: Unknown operation "${operation}".`);
  },
};

// ── figma_comment ─────────────────────────────────────────────────────────────
export const figma_comment = {
  async run(config, input, context) {
    const mode = config.mode || "post";
    const fileKey = config.fileKey || input?.fileKey;
    const token = config.apiToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Figma"));
    if (!token) throw new Error("figma_comment: Figma Personal Access Token required.");
    if (!fileKey) return { success: false, error: "figma_comment: 'fileKey' is required.", skipped: true };

    const headers = { "X-Figma-Token": token, "Content-Type": "application/json" };
    const base = `https://api.figma.com/v1/files/${fileKey}/comments`;

    if (mode === "list") {
      const res = await axios.get(base, { headers });
      const comments = (res.data.comments || []).map((c) => ({ id: c.id, message: c.message, author: c.user?.handle, resolved: !!c.resolved_at, createdAt: c.created_at }));
      return { comments, count: comments.length };
    }
    if (mode === "post") {
      const body = { message: config.message || input?.message };
      if (config.nodeId) body.client_meta = { node_id: config.nodeId, node_offset: { x: parseFloat(config.x || 0), y: parseFloat(config.y || 0) } };
      const res = await axios.post(base, body, { headers });
      return { commentId: res.data.id, message: res.data.message, createdAt: res.data.created_at, fileKey };
    }
    if (mode === "reply") {
      const res = await axios.post(base, { message: config.message, comment_id: config.commentId }, { headers });
      return { commentId: res.data.id, parentId: config.commentId, message: res.data.message, createdAt: res.data.created_at };
    }
    if (mode === "resolve") {
      await axios.delete(`${base}/${config.commentId}`, { headers });
      return { commentId: config.commentId, resolved: true };
    }
    throw new Error(`figma_comment: Unknown mode "${mode}".`);
  },
};
