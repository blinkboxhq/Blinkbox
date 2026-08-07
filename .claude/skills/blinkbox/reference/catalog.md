# Node catalog

**201 picker-visible nodes.** `list_nodes` is authoritative — this file is a map so
you know what to search for, not a substitute for the call.

| Category | Count | What's in it |
|----------|-------|--------------|
| `trigger` | 64 | Everything that starts a workflow |
| `apps` | 42 | SaaS integrations — Slack, Notion, Airtable, Stripe, HubSpot… |
| `infra` | 33 | HTTP, code, scraping, files, SSH, monitoring, media |
| `ai_models` | 24 | LLM providers, as plain action nodes and as agent models |
| `ai_agent` | 11 | AI Agent plus its memory / tool parts |
| `logic` | 11 | Condition, loop, merge, delay, dedupe, aggregate… |
| `data` | 10 | CSV, JSON, dates, crypto, mapping, formatting |
| `databases` | 6 | Postgres, MySQL, MongoDB, Redis, and friends |

Picker surfaces: 64 trigger-only · 59 action-only · 68 action+agent · 10 agent-only.

---

## Reading a `list_nodes` row

```
• slack — Slack [action+agent, apps, has actions, slack oauth]
• condition — Condition [action, logic]
• dns_lookup — DNS Lookup [action, infra, ⚠ not runnable yet]
```

- `has actions` → it's an app node; `get_node` names the default operation,
  `list_node_actions` lists the rest.
- `<provider> oauth` → needs a browser-connected credential.
- `⚠ not runnable yet` → **do not use it.**

---

## Not runnable — never put these in a workflow

They exist in the builder but have no backend handler:

```
dns_lookup · figma · file_download · file_upload · gitlab · google_docs
google_forms · graphql_request · http_monitor · ip_lookup · math_expression
regex_match · text_format · tool_call_workflow · tool_http_request
tool_mcp_client · tool_mongodb · tool_scraper · tool_sql · tool_webhook
variable_set_get · webhook_response · zip_files
```

Several have working substitutes: `graphql_request` → `http_request`;
`http_monitor` → `http_monitor_trigger`; `google_docs` → `google_docs_trigger` for
reacting, or `http_request` against the Docs API for writing. Confirm with
`list_nodes` rather than assuming.

---

## Triggers worth knowing by name

**Generic** — `manual`, `webhook`, `cron_trigger` (Schedule), `chat_trigger`,
`db_trigger`, `rss_trigger`, `imap_trigger`

**Apps** — `slack_trigger`, `gmail_trigger`, `outlook_trigger`, `github_trigger`,
`github_issue_trigger`, `stripe_trigger`, `shopify_trigger`, `woocommerce_trigger`,
`notion_trigger`, `airtable_trigger`, `google_sheets_trigger`, `google_drive_trigger`,
`google_calendar_trigger`, `google_forms_trigger`, `discord_trigger`,
`telegram_trigger`, `whatsapp_trigger`, `hubspot_trigger`, `pipedrive_trigger`,
`intercom_trigger`, `zendesk_trigger`, `jira_trigger`, `linear_trigger`,
`asana_trigger`, `clickup_trigger`, `trello_trigger`, `monday_trigger`,
`typeform_trigger`, `jotform_trigger`, `calendly_trigger`, `mailchimp_trigger`

**Dev / infra** — `sentry_trigger`, `vercel_trigger`, `netlify_trigger`,
`datadog_trigger`, `pagerduty_trigger`, `docker_trigger`, `ssh_trigger`,
`ssl_trigger`, `dns_trigger`, `port_monitor_trigger`, `http_monitor_trigger`,
`azure_devops_trigger`, `gitlab_trigger`

**Content / social** — `reddit_trigger`, `youtube_trigger`, `instagram_trigger`,
`tiktok_trigger`, `mastodon_trigger`, `hackernews_trigger`, `producthunt_trigger`,
`price_alert_trigger`, `virustotal_trigger`, `figma_trigger`, `sharepoint_trigger`,
`onedrive_trigger`

Most app triggers carry **events** — call `get_node` with `event: "<id>"` for the
exact config for the one you want.

---

## Workhorse action nodes

`http_request` · `code` · `condition` · `loop` · `merge` · `delay` · `set_fields` ·
`filter_array` · `aggregate` · `deduplicate` · `data_mapper` · `csv_parser` ·
`date_time` · `crypto_utils` · `email_parser` · `web_scraper` · `ai_agent`

---

## AI

**Agent models** (`picker: "agent"`, also usable as plain actions):
`agent_openai`, `agent_anthropic`, `agent_gemini`, `agent_xai`, `agent_deepseek`,
`agent_perplexity`, `agent_openrouter`, `agent_moonshot` (Kimi), `agent_zai` (GLM),
`agent_minimax`, `agent_nvidia_nim`, `agent_sakana`

**Memory:** `agent_memory` (vector), `agent_memory_window` (buffer)

**As plain action nodes:** `openai`, `anthropic`, `gemini`, `deepseek`, … — same
providers, called once instead of driving an agent loop.

---

## Documentation coverage

About 89 nodes carry a captured config schema; the rest return
`Config fields: not documented yet` from `get_node`. For those: inspect an existing
automation that already uses the node, or have the user configure it once in the
builder and read it back. **Do not invent field names** — a wrong key is written to
the config and silently ignored by the executor, which is the hardest class of bug to
see.
