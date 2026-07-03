/**
 * GITHUB ISSUE — Issue resource. create/list/close/reopen/comment preserved
 * verbatim from the monolith; get, update, listComments, lock, unlock added for
 * parity. Handlers receive (config, client).
 */

async function opCreate(config, client) {
  if (!config.title) return { success: false, error: "github_issue create: 'title' is required.", skipped: true };
  const res = await client.post(client.api, { title: config.title, body: config.body || config.description, labels: config.labels || [], assignees: config.assignees || [] });
  return { number: res.data.number, url: res.data.html_url, title: res.data.title, state: res.data.state };
}

async function opList(config, client) {
  const res = await client.get(client.api, { state: config.state || "open", per_page: config.limit || 20 });
  return { issues: res.data.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, labels: i.labels.map((l) => l.name) })), count: res.data.length };
}

async function opGet(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue get: 'issueNumber' is required.", skipped: true };
  const res = await client.get(`${client.api}/${config.issueNumber}`);
  const i = res.data;
  return { number: i.number, title: i.title, body: i.body, state: i.state, url: i.html_url, labels: i.labels.map((l) => l.name), assignees: (i.assignees || []).map((a) => a.login), comments: i.comments };
}

async function opUpdate(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue update: 'issueNumber' is required.", skipped: true };
  const body = {};
  if (config.title) body.title = config.title;
  if (config.body || config.description) body.body = config.body || config.description;
  if (config.state) body.state = config.state;
  if (config.labels) body.labels = config.labels;
  if (config.assignees) body.assignees = config.assignees;
  const res = await client.patch(`${client.api}/${config.issueNumber}`, body);
  return { number: res.data.number, title: res.data.title, state: res.data.state, url: res.data.html_url };
}

async function opClose(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue close: 'issueNumber' is required.", skipped: true };
  const res = await client.patch(`${client.api}/${config.issueNumber}`, { state: "closed" });
  return { number: res.data.number, state: res.data.state };
}

async function opReopen(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue reopen: 'issueNumber' is required.", skipped: true };
  const res = await client.patch(`${client.api}/${config.issueNumber}`, { state: "open" });
  return { number: res.data.number, state: res.data.state };
}

async function opComment(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue comment: 'issueNumber' is required.", skipped: true };
  const res = await client.post(`${client.api}/${config.issueNumber}/comments`, { body: config.comment || config.body });
  return { id: res.data.id, url: res.data.html_url };
}

async function opListComments(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue listComments: 'issueNumber' is required.", skipped: true };
  const res = await client.get(`${client.api}/${config.issueNumber}/comments`, { per_page: config.limit || 30 });
  return { comments: res.data.map((c) => ({ id: c.id, body: c.body, author: c.user?.login, createdAt: c.created_at, url: c.html_url })), count: res.data.length };
}

async function opLock(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue lock: 'issueNumber' is required.", skipped: true };
  const body = config.lockReason ? { lock_reason: config.lockReason } : undefined;
  await client.put(`${client.api}/${config.issueNumber}/lock`, body);
  return { number: config.issueNumber, locked: true };
}

async function opUnlock(config, client) {
  if (!config.issueNumber) return { success: false, error: "github_issue unlock: 'issueNumber' is required.", skipped: true };
  await client.del(`${client.api}/${config.issueNumber}/lock`);
  return { number: config.issueNumber, locked: false };
}

export const issueOperations = {
  create: opCreate,
  list: opList,
  get: opGet,
  update: opUpdate,
  close: opClose,
  reopen: opReopen,
  comment: opComment,
  listComments: opListComments,
  lock: opLock,
  unlock: opUnlock,
};
