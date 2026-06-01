import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.trello.com/1";

function handleError(err) {
  if (err.message?.startsWith("Trello")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Trello: Auth failed — check your API key and token.`);
  if (status === 404) throw new Error(`Trello: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Trello: Bad request — ${msg}`);
  throw new Error(`Trello: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createCard" } = config;

    if (!config.credentialId) return { success: false, error: "Trello: credential required.", skipped: true };

    let apiKey, token;
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Trello");
      if (raw.includes(":")) {
        [apiKey, token] = raw.split(":");
      } else {
        try {
          const parsed = JSON.parse(raw);
          apiKey = parsed.apiKey ?? parsed.key;
          token = parsed.token;
        } catch {
          return { success: false, error: "Trello: credential must be 'apiKey:token' or JSON {apiKey, token}.", skipped: true };
        }
      }
    } catch (err) {
      throw new Error(`Trello: Failed to resolve credential — ${err.message}`);
    }

    if (!apiKey || !token) return { success: false, error: "Trello: both apiKey and token are required.", skipped: true };

    const auth = { key: apiKey, token };

    try {
      switch (operation) {
        case "listCards": {
          if (!config.listId) return { success: false, error: "Trello listCards: 'listId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/lists/${config.listId}/cards`, { params: { ...auth }, timeout: 15000 });
          return { cards: res.data.map((c) => ({ id: c.id, name: c.name, url: c.url, shortUrl: c.shortUrl, idList: c.idList, due: c.due })), count: res.data.length };
        }

        case "getCard": {
          if (!config.cardId) return { success: false, error: "Trello getCard: 'cardId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/cards/${config.cardId}`, { params: { ...auth }, timeout: 15000 });
          const c = res.data;
          return { id: c.id, name: c.name, desc: c.desc, url: c.url, shortUrl: c.shortUrl, idList: c.idList, due: c.due, closed: c.closed };
        }

        case "createCard": {
          if (!config.listId || !config.name) return { success: false, error: "Trello createCard: 'listId' and 'name' are required.", skipped: true };
          const params = { ...auth, idList: config.listId, name: config.name };
          if (config.desc) params.desc = config.desc;
          if (config.due) params.due = config.due;
          const res = await axios.post(`${BASE}/cards`, null, { params, timeout: 15000 });
          const c = res.data;
          return { id: c.id, name: c.name, url: c.url, shortUrl: c.shortUrl, idList: c.idList };
        }

        case "updateCard": {
          if (!config.cardId) return { success: false, error: "Trello updateCard: 'cardId' is required.", skipped: true };
          const params = { ...auth };
          if (config.name) params.name = config.name;
          if (config.desc !== undefined) params.desc = config.desc;
          if (config.due) params.due = config.due;
          const res = await axios.put(`${BASE}/cards/${config.cardId}`, null, { params, timeout: 15000 });
          const c = res.data;
          return { id: c.id, name: c.name, url: c.url, shortUrl: c.shortUrl, idList: c.idList };
        }

        case "moveCard": {
          if (!config.cardId || !config.listId) return { success: false, error: "Trello moveCard: 'cardId' and 'listId' are required.", skipped: true };
          const res = await axios.put(`${BASE}/cards/${config.cardId}`, null, { params: { ...auth, idList: config.listId }, timeout: 15000 });
          const c = res.data;
          return { id: c.id, name: c.name, idList: c.idList, url: c.url, shortUrl: c.shortUrl };
        }

        case "archiveCard": {
          if (!config.cardId) return { success: false, error: "Trello archiveCard: 'cardId' is required.", skipped: true };
          const res = await axios.put(`${BASE}/cards/${config.cardId}`, null, { params: { ...auth, closed: true }, timeout: 15000 });
          return { id: res.data.id, name: res.data.name, closed: res.data.closed };
        }

        case "addComment": {
          if (!config.cardId || !config.text) return { success: false, error: "Trello addComment: 'cardId' and 'text' are required.", skipped: true };
          const res = await axios.post(`${BASE}/cards/${config.cardId}/actions/comments`, null, { params: { ...auth, text: config.text }, timeout: 15000 });
          return { id: res.data.id, text: res.data.data?.text, date: res.data.date };
        }

        case "addLabel": {
          if (!config.cardId) return { success: false, error: "Trello addLabel: 'cardId' is required.", skipped: true };
          const params = { ...auth };
          if (config.labelColor) params.color = config.labelColor;
          if (config.labelName) params.name = config.labelName;
          const res = await axios.post(`${BASE}/cards/${config.cardId}/labels`, null, { params, timeout: 15000 });
          return { id: res.data.id, color: res.data.color, name: res.data.name };
        }

        case "listBoards": {
          const res = await axios.get(`${BASE}/members/me/boards`, { params: { ...auth, fields: "id,name,url,shortUrl,closed" }, timeout: 15000 });
          return { boards: res.data.map((b) => ({ id: b.id, name: b.name, url: b.url, shortUrl: b.shortUrl, closed: b.closed })), count: res.data.length };
        }

        case "listLists": {
          if (!config.boardId) return { success: false, error: "Trello listLists: 'boardId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/boards/${config.boardId}/lists`, { params: { ...auth }, timeout: 15000 });
          return { lists: res.data.map((l) => ({ id: l.id, name: l.name, closed: l.closed })), count: res.data.length };
        }

        default:
          throw new Error(`Trello: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
