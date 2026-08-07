# Blinkbox skill

Teaches any LLM to build, run and debug **Blinkbox** automations properly — the right
nodes, correct credentials, working expressions, and few enough tool calls that it
stays cheap.

Without it, a model guesses node keys and config field names, invents credential ids,
and burns a dozen calls browsing the catalog. With it, a typical workflow is about
four calls and runs on the first try.

## Install

1. **Connect the Blinkbox MCP server.** In Blinkbox, open the **Connect MCP** panel,
   create a connector key (starts with `bb_`), then add the server to your client:

   ```
   https://mcp.blinkbox.net/mcp
   Authorization: Bearer bb_your_key
   ```

   Clients with no header field (ChatGPT's connector, for one) can put the key in the
   URL instead: `https://mcp.blinkbox.net/mcp/bb_your_key`. The connector acts as
   you — same workspace, same permissions.

2. **Drop this folder into your skills directory.**

   ```
   .claude/skills/blinkbox/
   ```

   Project-level (`<project>/.claude/skills/`) or personal (`~/.claude/skills/`).
   Restart the client; it loads on its own when a task looks like automation work.

Works with any MCP client. `SKILL.md` is plain Markdown — paste it into a system
prompt if your tool has no skill loader.

## What's inside

| File | Contents |
|------|----------|
| `SKILL.md` | The five laws, the golden path, tool map, efficiency rules |
| `reference/tools.md` | All 18 MCP tools with exact arguments and gotchas |
| `reference/building.md` | Workflow schema, expressions, handles, core node configs |
| `reference/credentials.md` | API key vs OAuth, slot resolution, matching |
| `reference/catalog.md` | 201 nodes by category, trigger list, non-runnable keys |
| `reference/troubleshooting.md` | Error categories, activation failures, quiet bugs |

Only `SKILL.md` loads up front. The references are pulled in when needed, so the
skill stays cheap to carry.

## Safety

The connector runs inside your own account and reuses the app's auth, validation and
workspace isolation. Auth, admin, OAuth, billing and API-key routes are blocked to
it. Deletes and other destructive calls require an explicit confirmation flag. It can
never read a stored secret back — credentials are write-only from chat.

---

Blinkbox — https://blinkbox.net
