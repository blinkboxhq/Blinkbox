import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
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
