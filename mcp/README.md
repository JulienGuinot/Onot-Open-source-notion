# Onot MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents
(Claude Desktop, Claude Code, Cursor, Codex, your own LangGraph / OpenAI agent…)
read and write your Onot workspaces, pages and blocks — like the Notion MCP, but
for Onot.

The server authenticates with a **personal access token** generated in the Onot
web app. It exchanges the token for a short-lived Supabase JWT and acts as the
user that owns the token, so:

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
                                  for the user that owns ONOT_TOKEN
```

The Onot Next.js app sits in the loop only at session start (token → JWT
exchange). After that the MCP server talks to Supabase directly; the web app
picks up changes via its existing Supabase Realtime subscription.

---

## 2. One-time setup

### 2.1 Generate a personal access token

In the Onot web app, open the workspace context menu → **AI agents** → **+ New
token**. Give it a name (e.g. *Claude Desktop on laptop*) and copy the value
shown — it starts with `onot_…` and is only displayed once. Treat it like a
password.

The token grants the bearer the same access as your own account, scoped to
every workspace you are a member of. You can revoke it at any time from the
same modal; revocation takes effect within a few seconds.

### 2.2 Install and build

```bash
cd mcp
npm install
npm run build
```

### 2.3 Configure environment

```bash
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_ANON_KEY, ONOT_TOKEN, ONOT_API_URL
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are the same values your Onot app uses
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`). `ONOT_API_URL`
is the base URL of your Onot deployment (e.g. `https://onot.app`, or
`http://localhost:3000` for local dev).

### 2.4 Smoke test

```bash
node --env-file=.env dist/index.js
```

You should see `[onot-mcp] ready (stdio)`. Stop with Ctrl-C — agents launch
this binary themselves.

---

## 3. Plugging an agent in

The server speaks **MCP over stdio**. Any MCP-capable client launches it as a
child process. Below: configs for the three most common ones. Replace
`/abs/path/to/Onot/mcp` with your real path.

### 3.1 Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "onot": {
      "command": "node",
      "args": ["/abs/path/to/Onot/mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_ANON_KEY": "...",
        "ONOT_TOKEN": "onot_...",
        "ONOT_API_URL": "https://onot.app"
      }
    }
  }
}
```

Restart Claude Desktop. The `onot` server should appear in the tools menu.

### 3.2 Claude Code (CLI)

```bash
claude mcp add onot \
  --env SUPABASE_URL=https://xxx.supabase.co \
  --env SUPABASE_ANON_KEY=... \
  --env ONOT_TOKEN=onot_... \
  --env ONOT_API_URL=https://onot.app \
  -- node /abs/path/to/Onot/mcp/dist/index.js
```

### 3.3 Cursor / Codex / any stdio MCP client

Same shape — point `command` at `node` and `args` at `dist/index.js`, pass the
four env vars.

### 3.4 Custom agent (OpenAI, LangGraph, your own loop)

Use the official MCP SDK as a client:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/abs/path/to/Onot/mcp/dist/index.js'],
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    ONOT_TOKEN: process.env.ONOT_TOKEN!,
    ONOT_API_URL: process.env.ONOT_API_URL!,
  },
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

- **Authentication.** The server exchanges `ONOT_TOKEN` at `/api/mcp/exchange`
  for a short-lived (1 h) Supabase JWT signed with `SUPABASE_JWT_SECRET`. The
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

## 8. Roadmap (optional next steps)

- HTTP/SSE transport (`StreamableHTTPServerTransport`) so a single hosted
  server can be shared by multiple users.
- Optimistic concurrency on `read_page` → `write_page` (the underlying
  `savePageToCloud` already supports `expectedUpdatedAt`).
- A "human-in-the-loop" mode where mutations land in a `pending_changes`
  table and require approval in the UI before being applied.
- Playwright-based hybrid mode for blocks the agent should *see* rather than
  manipulate as data (drawings, embedded maps).
