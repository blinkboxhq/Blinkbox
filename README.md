# BlinkBox

**Visual automation platform — build workflows that used to take a sprint in an afternoon.**

BlinkBox replaces Zapier, Make, and n8n for teams that need AI agents, headless scraping, and sandboxed code execution — all on a flat-rate plan with no per-task fees.

---

## What it does

- **Drag-and-drop canvas** — connect triggers, actions, AI nodes, and logic blocks visually
- **Brian AI** — describe an automation in plain English, get a fully wired workflow in seconds
- **AI Agents** — LLM nodes that reason over data and output structured results
- **Headless scraping** — full Chromium pool, defeats anti-bot, renders JavaScript
- **Code sandbox** — write JavaScript in an isolated V8 sandbox with memory limits
- **250+ integrations** — Gmail, Slack, Stripe, GitHub, Notion, Airtable, Shopify, and more
- **Encrypted credential vault** — AES-256-GCM; secrets never leave the server decrypted
- **Multi-turn chat** — Brian remembers context across follow-ups to refine your workflow

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
ANTHROPIC_API_KEY=sk-ant-...          # enables Brian AI
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
| `ANTHROPIC_API_KEY` | Enables Brian AI via Claude Sonnet 4.6 |
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
│  Dashboard · Workspace Canvas · Brian AI Chat       │
└───────────────────────┬─────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│                Backend (Express)                    │
│  Auth · Automations · Executions · Credentials      │
│  Brian Controller · OAuth · Webhooks                │
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

## Brian AI

Brian is the AI workflow builder. Type a description in the dashboard chat bar:

> *"When a new Stripe payment comes in, look up the customer in HubSpot, and send a Slack alert to #revenue"*

Brian calls Claude Sonnet 4.6 with a 70-node knowledge base and forced tool use. It outputs a fully configured workflow with real field values, correct variable chaining (`{{trigger.data.from}}`), and proper node positions — ready to run.

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
