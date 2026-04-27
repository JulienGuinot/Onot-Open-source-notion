// ─── MCP client config builders ─────────────────────────────────────────────
//
// Generates the JSON config a user pastes into Claude Desktop, Cursor or the
// Claude Code CLI to register the Onot MCP server with their personal token.

export type McpClient = 'claude-desktop' | 'cursor' | 'claude-code'

export interface McpConfigInputs {
    token: string
    apiUrl: string
    supabaseUrl: string
    supabaseAnonKey: string
    /** Absolute path to mcp/dist/index.js on the user's machine. */
    serverPath?: string
}

const DEFAULT_SERVER_PATH = '/abs/path/to/Onot/mcp/dist/index.js'

function envBlock(inputs: McpConfigInputs): Record<string, string> {
    return {
        ONOT_TOKEN: inputs.token,
        ONOT_API_URL: inputs.apiUrl,
        SUPABASE_URL: inputs.supabaseUrl,
        SUPABASE_ANON_KEY: inputs.supabaseAnonKey,
    }
}

export function buildMcpConfig(client: McpClient, inputs: McpConfigInputs): string {
    const serverPath = inputs.serverPath ?? DEFAULT_SERVER_PATH

    if (client === 'claude-code') {
        const env = envBlock(inputs)
        const flags = Object.entries(env)
            .map(([k, v]) => `  --env ${k}=${v}`)
            .join(' \\\n')
        return `claude mcp add onot \\\n${flags} \\\n  -- node ${serverPath}\n`
    }

    const config = {
        mcpServers: {
            onot: {
                command: 'node',
                args: [serverPath],
                env: envBlock(inputs),
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
