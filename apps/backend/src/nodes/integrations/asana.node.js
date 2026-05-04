import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://app.asana.com/api/1.0";

function handleError(err) {
  if (err.message?.startsWith("Asana")) throw err;
  const status = err.response?.status;
  const errors = err.response?.data?.errors;
  const msg = Array.isArray(errors) ? errors.map((e) => e.message).join(", ") : (err.response?.data?.message ?? err.message);
  if (status === 401 || status === 403) throw new Error(`Asana: Auth failed — check your personal access token.`);
  if (status === 404) throw new Error(`Asana: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Asana: Bad request — ${msg}`);
  throw new Error(`Asana: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createTask" } = config;

    if (!config.credentialId) return { success: false, error: "Asana: credential required.", skipped: true };
    const cred = await resolveCredential(config.credentialId, context.workspaceId, "Asana");
    const token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    if (!token) return { success: false, error: "Asana: personal access token is required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };

    try {
      switch (operation) {
        case "listTasks": {
          if (!config.projectGid) return { success: false, error: "Asana listTasks: 'projectGid' is required.", skipped: true };
          const res = await axios.get(`${BASE}/tasks`, {
            headers,
            params: { project: config.projectGid, opt_fields: "gid,name,completed,due_on,permalink_url,assignee.name" },
            timeout: 15000,
          });
          return { tasks: res.data.data ?? [], count: res.data.data?.length ?? 0 };
        }

        case "createTask": {
          if (!config.name) return { success: false, error: "Asana createTask: 'name' is required.", skipped: true };
          const body = { data: { name: config.name } };
          if (config.projectGid) body.data.projects = [config.projectGid];
          if (config.notes) body.data.notes = config.notes;
          if (config.dueOn) body.data.due_on = config.dueOn;
          if (config.assignee) body.data.assignee = config.assignee;
          const res = await axios.post(`${BASE}/tasks`, body, { headers, timeout: 15000 });
          const t = res.data.data;
          return { gid: t.gid, name: t.name, permalink_url: t.permalink_url, completed: t.completed, due_on: t.due_on };
        }

        case "updateTask": {
          if (!config.taskGid) return { success: false, error: "Asana updateTask: 'taskGid' is required.", skipped: true };
          const body = { data: {} };
          if (config.name) body.data.name = config.name;
          if (config.notes !== undefined) body.data.notes = config.notes;
          if (config.dueOn) body.data.due_on = config.dueOn;
          if (config.assignee) body.data.assignee = config.assignee;
          const res = await axios.put(`${BASE}/tasks/${config.taskGid}`, body, { headers, timeout: 15000 });
          const t = res.data.data;
          return { gid: t.gid, name: t.name, permalink_url: t.permalink_url, completed: t.completed, due_on: t.due_on };
        }

        case "completeTask": {
          if (!config.taskGid) return { success: false, error: "Asana completeTask: 'taskGid' is required.", skipped: true };
          const res = await axios.put(`${BASE}/tasks/${config.taskGid}`, { data: { completed: true } }, { headers, timeout: 15000 });
          const t = res.data.data;
          return { gid: t.gid, name: t.name, completed: t.completed };
        }

        case "getTask": {
          if (!config.taskGid) return { success: false, error: "Asana getTask: 'taskGid' is required.", skipped: true };
          const res = await axios.get(`${BASE}/tasks/${config.taskGid}`, {
            headers,
            params: { opt_fields: "gid,name,completed,due_on,notes,permalink_url,assignee.name,projects.name" },
            timeout: 15000,
          });
          const t = res.data.data;
          return { gid: t.gid, name: t.name, completed: t.completed, due_on: t.due_on, notes: t.notes, permalink_url: t.permalink_url };
        }

        case "addComment": {
          if (!config.taskGid || !config.text) return { success: false, error: "Asana addComment: 'taskGid' and 'text' are required.", skipped: true };
          const res = await axios.post(`${BASE}/tasks/${config.taskGid}/stories`, { data: { text: config.text } }, { headers, timeout: 15000 });
          const s = res.data.data;
          return { gid: s.gid, text: s.text, created_at: s.created_at };
        }

        case "createProject": {
          if (!config.name || !config.teamGid) return { success: false, error: "Asana createProject: 'name' and 'teamGid' are required.", skipped: true };
          const res = await axios.post(`${BASE}/projects`, { data: { name: config.name, team: config.teamGid } }, { headers, timeout: 15000 });
          const p = res.data.data;
          return { gid: p.gid, name: p.name, permalink_url: p.permalink_url };
        }

        case "listProjects": {
          const res = await axios.get(`${BASE}/projects`, {
            headers,
            params: { opt_fields: "gid,name,permalink_url,team.name", limit: 100 },
            timeout: 15000,
          });
          return { projects: res.data.data ?? [], count: res.data.data?.length ?? 0 };
        }

        default:
          throw new Error(`Asana: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
