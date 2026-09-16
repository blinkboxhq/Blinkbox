# BlinkBox

**Open-source automation platform (Zapier / Make / n8n alternative) with a native MCP server — connect Claude Code, Cursor or ChatGPT and let the agent build, run and debug your workflows.**

Free hosted tier at [blinkbox.net](https://blinkbox.net) (no card) · self-host with Node 22 + MongoDB + Redis · MIT.

---

## What it does

- **MCP server** — the whole platform is exposed over the Model Context Protocol (Streamable HTTP). Your coding agent lists, creates, runs, activates and debugs workflows with tool calls — see [Use it from Claude Code](#use-it-from-claude-code-cursor-or-chatgpt-60-seconds)
- **Agent skill** — a [`SKILL.md`](.claude/skills/blinkbox/SKILL.md) that teaches the agent node fields, expression syntax and execution rules, so a working flow takes ~4 tool calls instead of ~12 of guessing
- **Drag-and-drop canvas** — everything the agent builds is a normal workflow you can open and edit visually
- **AI Agents** — LLM nodes that reason over data and output structured results
- **Headless scraping** — full Chromium pool, defeats anti-bot, renders JavaScript
- **Code sandbox** — write JavaScript in an isolated V8 sandbox with memory limits
- **250+ integrations** — Gmail, Slack, Stripe, GitHub, Notion, Airtable, Shopify, and more
- **Encrypted credential vault** — AES-256-GCM; secrets never leave the server decrypted

---

## Use it from Claude Code, Cursor or ChatGPT (60 seconds)

1. Sign up at [blinkbox.net](https://blinkbox.net) → **Dashboard → MCP** → create an API key.
2. Add the server to your client:

   ```bash
   # Claude Code
   claude mcp add --transport http blinkbox https://mcp.blinkbox.net/mcp \
     --header "Authorization: Bearer <your key>"
   ```

   ```json
   // Cursor / Claude Desktop / any client that takes a JSON config
   {
     "mcpServers": {
       "blinkbox": {
         "url": "https://mcp.blinkbox.net/mcp",
         "headers": { "Authorization": "Bearer <your key>" }
       }
     }
   }
   ```

   Clients that can't send headers can pass the key in the URL instead: `https://mcp.blinkbox.net/mcp?key=<your key>`.

3. (Recommended) install the skill so the agent knows the node catalog and expression syntax:

   ```bash
   mkdir -p ~/.claude/skills/blinkbox && curl -fsSL \
     https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/.claude/skills/blinkbox/SKILL.md \
     -o ~/.claude/skills/blinkbox/SKILL.md
   ```

4. Ask for what you want:

   > *"Every morning at 8, find dentists in Berlin on OpenStreetMap that list a website, email and phone, dedupe against my Google Sheet and append the new ones."*

   The agent calls `create_automation`, runs it with `run_automation`, reads `get_execution_logs` when something fails, and `activate_automation` when it's green. OAuth apps (Google, Slack, Notion…) are connected once by you in the dashboard — the agent never sees your tokens.

**Tools:** `list_automations` · `get_automation` · `create_automation` · `run_automation` · `activate_automation` · `deactivate_automation` · `rename_automation` · `delete_automation` · `list_executions` · `get_execution` · `get_execution_logs` · `list_nodes` · `get_node` · `list_node_actions` · `list_credentials` · `create_credential` · `blinkbox_api_get` · `blinkbox_api`

Self-hosting? The same server is at `<your backend>/api/mcp` — create keys in your own dashboard.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + ReactFlow |
| Backend | Node.js + Express + MongoDB Atlas + Redis |
| AI | Anthropic Claude (primary) → Groq → Gemini (fallback) |
| Scraping | Puppeteer + Chromium |
| Execution | Cursor-based distributed engine, 4 worker cells |
| Deployment | Railway (nixpacks) |

---

## Local setup

### Prerequisites

- Node.js ≥ 22
- MongoDB Atlas cluster (or local MongoDB)
- Redis (local or Upstash)

### 1. Clone

```bash
git clone https://github.com/blinkboxhq/Blinkbox.git
cd Blinkbox
npm install
```

### 2. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` — at minimum you need:

```env
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-32-char-secret
ENCRYPTION_KEY=your-exactly-32-char-key
ANTHROPIC_API_KEY=sk-ant-...          # enables the AI workflow builder behind create_automation
```

### 3. Run

```bash
# Terminal 1 — backend (port 3000)
cd apps/backend && npm run dev

# Terminal 2 — frontend (port 5174)
cd apps/frontend && npm run dev
```

Open [http://localhost:5174](http://localhost:5174).

---

## Environment variables

### Required

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | ≥ 32 chars, any random string |
| `ENCRYPTION_KEY` | Exactly 32 chars — used for credential vault AES encryption |

### AI (at least one recommended)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Enables the AI workflow builder (Claude) used by the `create_automation` MCP tool |
| `GROQ_API_KEY` | Fallback LLM (Llama 3.3 70B) |
| `GOOGLE_AI_KEY` | Fallback LLM (Gemini 2.0 Flash) |

### OAuth integrations (optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail, Drive, Calendar OAuth |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft 365 OAuth |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | Notion OAuth |
| `AIRTABLE_CLIENT_ID` / `AIRTABLE_CLIENT_SECRET` | Airtable OAuth |

### Deployment

| Variable | Description |
|----------|-------------|
| `BACKEND_PUBLIC_URL` | Public-facing backend URL (e.g. `https://api.blinkbox.net`) — required for OAuth callbacks |
| `FRONTEND_URL` | Frontend URL for CORS allowlist |
| `PORT` | Backend port (default: 3000) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vite)                  │
│  Dashboard · Workspace Canvas · MCP keys            │
└───────────────────────┬─────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│                Backend (Express)                    │
│  Auth · Automations · Executions · Credentials      │
│  MCP server · AI builder · OAuth · Webhooks         │
└──────────┬──────────────────┬───────────────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │  MongoDB    │    │    Redis    │
    │  Atlas      │    │   Queues   │
    └─────────────┘    └──────┬──────┘
                              │
                    ┌─────────▼───────────┐
                    │  Execution Workers  │
                    │  (4 cursor cells)   │
                    │  Chromium pool      │
                    └─────────────────────┘
```

### Execution engine

Workflows run as cursor-based state machines. Each execution is a MongoDB document with a cursor array. Workers claim cursors atomically via `arrayFilters`, run the node handler, advance the cursor, and release. Redis queues decouple trigger fan-out from execution. A resumer process recovers crashed executions every 5 seconds.

### Node system

Every integration is a node with two halves:

- **Frontend** (`nodeRegistry.js`) — config panel, icon, label, category
- **Backend** (`nodes/`) — stateless handler `async (config, context) => result`

The same `backendType` key connects both sides. 250+ nodes are registered.

---

## AI workflow builder

`create_automation` (the MCP tool) hands your description to a server-side builder:

> *"When a new Stripe payment comes in, look up the customer in HubSpot, and send a Slack alert to #revenue"*

The builder calls Claude with the node knowledge base and forced tool use, and returns a fully configured, canvas-correct workflow — real field values, variable chaining (`{{trigger.data.from}}`), node positions — as a draft you can run, inspect and activate from the agent or the UI.

**Provider fallback chain:** Anthropic → Groq → Gemini

---

## Security

- JWT auth on all API routes, workspace-scoped queries
- AES-256-GCM credential encryption (key never stored in DB)
- SSRF guard on all outbound HTTP requests
- Code sandbox: isolated V8 with memory/time limits (`isolated-vm`)
- Shell tool nodes gated behind `ENABLE_SHELL_TOOLS=true` (off by default)
- OAuth state tokens (CSRF protection), postMessage to explicit origins only
- Rate limiting on webhook triggers (Redis-backed, survives restarts)

---

## Deployment on Railway

1. Create a Railway project, add the repo
2. Set all required env vars in Railway dashboard
3. Set `BACKEND_PUBLIC_URL` to your Railway backend URL
4. Register that URL as an OAuth redirect URI in Google Cloud Console (if using Gmail)

The `nixpacks.toml` in `apps/backend/` installs Chromium and all native deps automatically.

---

## License

MIT
