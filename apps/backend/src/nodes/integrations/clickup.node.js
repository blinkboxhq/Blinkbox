import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.clickup.com/api/v2";

function handleError(err) {
  if (err.message?.startsWith("ClickUp")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.err ?? err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`ClickUp: Auth failed — check your API token.`);
  if (status === 404) throw new Error(`ClickUp: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`ClickUp: Bad request — ${msg}`);
  throw new Error(`ClickUp: ${status ?? "Error"} — ${msg}`);
}

function parseDueDate(val) {
  if (!val) return undefined;
  const n = Number(val);
  if (!isNaN(n)) return n;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.getTime();
  return undefined;
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createTask" } = config;

    if (!config.credentialId) return { success: false, error: "ClickUp: credential required.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "ClickUp");
    } catch (err) {
      throw new Error(`ClickUp: Failed to resolve credential — ${err.message}`);
    }
    if (!token) return { success: false, error: "ClickUp: API token is required.", skipped: true };

    const headers = { Authorization: token, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "listTasks": {
          if (!config.listId) return { success: false, error: "ClickUp listTasks: 'listId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/list/${config.listId}/task`, { headers, timeout: 15000 });
          return {
            tasks: (res.data.tasks ?? []).map((t) => ({ id: t.id, name: t.name, url: t.url, status: t.status?.status, priority: t.priority?.priority })),
            count: res.data.tasks?.length ?? 0,
          };
        }

        case "createTask": {
          if (!config.listId || !config.name) return { success: false, error: "ClickUp createTask: 'listId' and 'name' are required.", skipped: true };
          const body = { name: config.name };
          if (config.description) body.description = config.description;
          if (config.priority) body.priority = Number(config.priority);
          const due = parseDueDate(config.dueDate);
          if (due) body.due_date = due;
          if (config.assignees) {
            const ids = String(config.assignees).split(",").map((s) => Number(s.trim())).filter(Boolean);
            if (ids.length) body.assignees = ids;
          }
          const res = await axios.post(`${BASE}/list/${config.listId}/task`, body, { headers, timeout: 15000 });
          const t = res.data;
          return { id: t.id, name: t.name, url: t.url, status: t.status?.status, priority: t.priority?.priority };
        }

        case "updateTask": {
          if (!config.taskId) return { success: false, error: "ClickUp updateTask: 'taskId' is required.", skipped: true };
          const body = {};
          if (config.name) body.name = config.name;
          if (config.description !== undefined) body.description = config.description;
          if (config.priority) body.priority = Number(config.priority);
          const due = parseDueDate(config.dueDate);
          if (due) body.due_date = due;
          const res = await axios.put(`${BASE}/task/${config.taskId}`, body, { headers, timeout: 15000 });
          const t = res.data;
          return { id: t.id, name: t.name, url: t.url, status: t.status?.status, priority: t.priority?.priority };
        }

        case "deleteTask": {
          if (!config.taskId) return { success: false, error: "ClickUp deleteTask: 'taskId' is required.", skipped: true };
          await axios.delete(`${BASE}/task/${config.taskId}`, { headers, timeout: 15000 });
          return { deleted: true, taskId: config.taskId };
        }

        case "getTask": {
          if (!config.taskId) return { success: false, error: "ClickUp getTask: 'taskId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/task/${config.taskId}`, { headers, timeout: 15000 });
          const t = res.data;
          return { id: t.id, name: t.name, url: t.url, status: t.status?.status, priority: t.priority?.priority, description: t.description };
        }

        case "addComment": {
          if (!config.taskId || !config.comment) return { success: false, error: "ClickUp addComment: 'taskId' and 'comment' are required.", skipped: true };
          const res = await axios.post(`${BASE}/task/${config.taskId}/comment`, { comment_text: config.comment }, { headers, timeout: 15000 });
          return { id: res.data.id, comment: config.comment };
        }

        case "createFolder": {
          if (!config.spaceId || !config.name) return { success: false, error: "ClickUp createFolder: 'spaceId' and 'name' are required.", skipped: true };
          const res = await axios.post(`${BASE}/space/${config.spaceId}/folder`, { name: config.name }, { headers, timeout: 15000 });
          const f = res.data;
          return { id: f.id, name: f.name, orderindex: f.orderindex };
        }

        case "listSpaces": {
          if (!config.teamId) return { success: false, error: "ClickUp listSpaces: 'teamId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/team/${config.teamId}/space`, { headers, timeout: 15000 });
          return { spaces: (res.data.spaces ?? []).map((s) => ({ id: s.id, name: s.name })), count: res.data.spaces?.length ?? 0 };
        }

        case "listFolders": {
          if (!config.spaceId) return { success: false, error: "ClickUp listFolders: 'spaceId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/space/${config.spaceId}/folder`, { headers, timeout: 15000 });
          return { folders: (res.data.folders ?? []).map((f) => ({ id: f.id, name: f.name })), count: res.data.folders?.length ?? 0 };
        }

        case "listLists": {
          if (!config.folderId) return { success: false, error: "ClickUp listLists: 'folderId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/folder/${config.folderId}/list`, { headers, timeout: 15000 });
          return { lists: (res.data.lists ?? []).map((l) => ({ id: l.id, name: l.name })), count: res.data.lists?.length ?? 0 };
        }

        default:
          throw new Error(`ClickUp: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
