import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
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
