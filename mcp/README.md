# Onot MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents
(Claude Desktop, Claude Code, Cursor, Codex, your own LangGraph / OpenAI agent…)
read and write your Onot workspaces, pages and blocks — like the Notion MCP, but
for Onot.

The server authenticates through the Onot web app. On first launch it opens a
browser authorization page, creates a personal access token for the signed-in
user, stores it locally, then exchanges it for a short-lived Supabase JWT. It
acts as the user that approved the connection, so:

- The agent only sees workspaces that user is a member of.
- All RLS policies in `supabase/migrations/` keep applying.
- You can revoke access at any time from the AI agents modal in the web app.

---

## 1. Architecture

```
┌──────────────┐   stdio (MCP)    ┌────────────────┐   HTTPS    ┌──────────────┐
│  AI agent    │ ───────────────► │  onot-mcp      │ ─────────► │  Supabase    │
│  (Claude…)   │ ◄─────────────── │  (this server) │ ◄───────── │  (RLS on)    │
└──────────────┘  tools/resources └────────────────┘            └──────────────┘
                                            │ POST /api/mcp/exchange
                                            ▼
                                  Onot Next.js → mints Supabase JWT
                                  for the user that approved access
```

The Onot Next.js app sits in the loop only at browser authorization and session
start (stored token → JWT exchange). After that the MCP server talks to
Supabase directly; the web app picks up changes via its existing Supabase
Realtime subscription.

---

## 2. User setup

### 2.1 Add Onot to your MCP client

The server is distributed as an npm package. You do **not** need to clone Onot,
download this repo, or build anything locally. Your MCP client launches it with:

```bash
npx -y onot-mcp@latest
```

Requirements:

- Node.js 18.18 or newer.
- A browser session signed in to Onot.

On first launch, `onot-mcp` opens Onot in your browser. Approve the connection
there; the MCP server stores a local token at `~/.onot/mcp.json` for future
launches. You can revoke tokens from the **AI agents** modal in Onot.

The server speaks **MCP over stdio**. Any MCP-capable client launches it as a
child process.

---

## 3. Client configs

### 3.1 Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "onot": {
      "command": "npx",
      "args": ["-y", "onot-mcp@latest"]
    }
  }
}
```

Restart Claude Desktop. On first use, approve access in the browser tab that
opens. The `onot` server should then appear in the tools menu.

### 3.2 Claude Code (CLI)

```bash
claude mcp add onot -- npx -y onot-mcp@latest
```

### 3.3 Cursor / Codex / any stdio MCP client

Use the same JSON shape as Claude Desktop: `command` is `npx`, `args` is
`["-y", "onot-mcp@latest"]`. On first launch, approve access in the browser.

### 3.4 Custom agent (OpenAI, LangGraph, your own loop)

Use the official MCP SDK as a client:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', 'onot-mcp@latest'],
});

const client = new Client({ name: 'my-agent', version: '0.0.1' });
await client.connect(transport);

const tools = await client.listTools();          // → wire into your LLM tool-calling loop
const res = await client.callTool({
  name: 'list_workspaces',
  arguments: {},
});
```

Hook the tool definitions returned by `listTools()` into whatever tool-calling
mechanism your model uses (OpenAI `tools`, Anthropic `tools`, Vercel AI SDK,
LangChain `Tool`, etc.).

### 3.5 Local development

For development on this repo, run the package locally instead of using npm:

```bash
cd mcp
npm install
npm run build
node --env-file=.env dist/index.js
```

Your `.env` must contain:

```bash
ONOT_API_URL=http://localhost:3000
```

`ONOT_API_URL` is optional for the hosted app, but useful in local development
so the browser authorization page opens your local Next.js server.

You should see `[onot-mcp] ready (stdio)`. Stop with Ctrl-C — MCP clients
normally launch this process themselves.

---

## 4. API surface

### Resources (read-only, addressable by URI)

| URI                                                | Content                              |
|----------------------------------------------------|--------------------------------------|
| `onot://workspaces`                                | List of workspaces + roles           |
| `onot://workspace/{workspaceId}/pages`             | Page metadata for a workspace        |
| `onot://workspace/{workspaceId}/page/{pageId}`     | Full page (JSON + Markdown rendering)|

### Tools

#### Read

| Tool             | Purpose                                                    |
|------------------|------------------------------------------------------------|
| `list_workspaces`| Workspaces the agent is a member of                        |
| `list_pages`     | Page index for a workspace                                 |
| `read_page`      | Full page (`format`: `json` \| `markdown` \| `both`)       |
| `search_pages`   | Substring search over titles + block content               |

#### Page mutations

| Tool          | Notes                                                                |
|---------------|----------------------------------------------------------------------|
| `create_page` | Returns `page_id`. Auto-appends to the workspace `pageOrder`         |
| `rename_page` | Updates `title` and/or `icon`                                        |
| `delete_page` | **Requires `confirm: true`**. Removes the page from `pageOrder`      |

#### Block mutations

| Tool                | Notes                                                            |
|---------------------|------------------------------------------------------------------|
| `append_block`      | Add at end of page                                               |
| `insert_block`      | Insert at `prepend` / `append` / `before` / `after` an anchor    |
| `update_block`      | Update content / language / callout icon                         |
| `change_block_type` | Re-type a block in place (e.g. `text` → `h2`)                    |
| `move_block`        | Move within the same page (anchor positioning)                   |
| `delete_block`      | **Requires `confirm: true`**                                     |
| `set_todo_checked`  | Specialized helper for `todo` blocks                             |
| `update_table_cell` | Specialized helper for `table` blocks                            |
| `add_agent_note`    | Convenience: appends a `callout` tagged with a robot icon        |

Allowed block types (validated server-side): `text, h1, h2, h3, bullet-list,
numbered-list, todo, code, markdown, quote, divider, toggle, callout, image,
table, drawing, youtube, file, map`.

---

## 5. Safety guarantees

- **Authentication.** The first launch opens `/mcp/connect` in the browser.
  The signed-in user approves the MCP client, which creates a personal access
  token and returns it to a localhost callback. The MCP server stores it at
  `~/.onot/mcp.json`, then exchanges it at `/api/mcp/exchange` for a
  short-lived (1 h) Supabase JWT signed with `SUPABASE_JWT_SECRET`. The
  exchange is repeated transparently when the JWT is close to expiry. Wrong
  or revoked tokens fail fast with a 401 — no silent fallback.
- **Authorization.** Every mutation calls `assertWriteAccess` first, which
  checks `workspace_members.role ∈ {owner, editor}` for the calling user.
  Combined with RLS this is belt-and-braces.
- **Revocation.** Revoking a token in the web UI takes effect immediately for
  new exchanges; existing JWTs naturally expire within the 1 h TTL.
- **Validation.** All tool inputs are validated by `zod` schemas before any DB
  call. Block types are checked against the allow-list.
- **Destructive ops are explicit.** `delete_page` and `delete_block` require an
  explicit `confirm: true` argument — no fuzzy "delete the block about X".
- **Diffs in responses.** `update_block`, `change_block_type`, `move_block`,
  `update_table_cell` return before/after info so the agent can verify and the
  user can audit.
- **No bypass.** The server uses the **anon key + user JWT**, not the service
  role key. There is no path that escalates beyond the agent's own membership.

---

## 6. Suggested system prompt for the agent

```
You can read and edit the user's Onot notes via the `onot` MCP server.

Workflow rules:
1. Always start by calling `list_workspaces`. Pick the workspace explicitly.
2. Before editing a page, call `read_page` and quote the relevant block ids in
   your reasoning so the user can audit your changes.
3. Prefer `insert_block` with `position: "after"` over rewriting whole pages.
4. Never call `delete_page` or `delete_block` without the user explicitly
   asking for a deletion. Pass `confirm: true` only in that case.
5. When writing notes generated by yourself, use `add_agent_note` so the user
   can tell at a glance what came from the agent.
```

---

## 7. Troubleshooting

| Symptom                                        | Cause / fix                                                                 |
|------------------------------------------------|-----------------------------------------------------------------------------|
| `Token exchange failed (401)`                  | Token wrong or revoked — generate a new one in the web app (§2.1).          |
| `Token exchange failed (500)`                  | Server missing `SUPABASE_JWT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`.        |
| `No membership on workspace …`                 | The user that owns the token is not a member of that workspace.             |
| `Role "viewer" cannot write …`                 | Bump role to `editor` in `workspace_members`.                               |
| `Block not found: …`                           | Stale id. Re-`read_page` before mutating.                                   |
| Mutations succeed but the UI doesn't update    | Reload the Onot tab; or check Supabase Realtime is enabled (migration 004). |

---

## 8. Maintainer release checklist

This package is intended to be installable directly from npm by end users.
Before publishing a new version:

1. Update `mcp/package.json` version.
2. Run `npm install` at the repo root if lockfiles need to change.
3. Run `npm install` and `npm run build` inside `mcp/`.
4. Run a local smoke test:

   ```bash
   cd mcp
   node --env-file=.env dist/index.js
   ```

5. Check the packed artifact:

   ```bash
   cd mcp
   npm pack --dry-run
   ```

   The package should include `dist/`, `README.md`, and `package.json`.

6. Publish from `mcp/`:

   ```bash
   npm publish
   ```

After publishing, the generated user configs automatically resolve the new
version through `npx -y onot-mcp@latest`.

---

## 9. Roadmap (optional next steps)

- HTTP/SSE transport (`StreamableHTTPServerTransport`) so a single hosted
  server can be shared by multiple users.
- Optimistic concurrency on `read_page` → `write_page` (the underlying
  `savePageToCloud` already supports `expectedUpdatedAt`).
- A "human-in-the-loop" mode where mutations land in a `pending_changes`
  table and require approval in the UI before being applied.
- Playwright-based hybrid mode for blocks the agent should *see* rather than
  manipulate as data (drawings, embedded maps).
