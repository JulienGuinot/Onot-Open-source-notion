// ─── MCP client config builders ─────────────────────────────────────────────
//
// Generates the config a user pastes into Claude Desktop, Cursor or Claude
// Code. Authentication is handled by the MCP package through the browser.

export type McpClient = 'claude-desktop' | 'cursor' | 'claude-code'

export const MCP_PACKAGE = 'onot-mcp@latest'
const MCP_COMMAND = 'npx'
const MCP_ARGS = ['-y', MCP_PACKAGE]

export function buildMcpConfig(client: McpClient): string {
    if (client === 'claude-code') {
        return `claude mcp add onot -- ${MCP_COMMAND} ${MCP_ARGS.join(' ')}\n`
    }

    const config = {
        mcpServers: {
            onot: {
                command: MCP_COMMAND,
                args: MCP_ARGS,
            },
        },
    }
    return JSON.stringify(config, null, 2)
}

export const CLIENT_LABELS: Record<McpClient, string> = {
    'claude-desktop': 'Claude Desktop',
    cursor: 'Cursor',
    'claude-code': 'Claude Code (CLI)',
}
