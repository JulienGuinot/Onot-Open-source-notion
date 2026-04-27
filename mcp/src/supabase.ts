import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AgentSession {
    client: SupabaseClient;
    userId: string;
}

let cached: AgentSession | null = null;

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

/**
 * Returns a Supabase client authenticated as the dedicated agent user.
 * The session is cached for the process lifetime; tokens are auto-refreshed
 * by supabase-js. RLS continues to apply, so the agent can only see/edit
 * workspaces it has been invited to.
 */
export async function getAgentSession(): Promise<AgentSession> {
    if (cached) return cached;

    const url = requireEnv('SUPABASE_URL');
    const anonKey = requireEnv('SUPABASE_ANON_KEY');
    const email = requireEnv('MCP_AGENT_EMAIL');
    const password = requireEnv('MCP_AGENT_PASSWORD');

    const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: true },
    });

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
        throw new Error(`Agent sign-in failed: ${error?.message ?? 'unknown error'}`);
    }

    cached = { client, userId: data.user.id };
    return cached;
}

/**
 * Asserts the agent has a write-capable role on the workspace.
 * Throws an MCP-friendly error otherwise.
 */
export async function assertWriteAccess(workspaceId: string): Promise<void> {
    const { client, userId } = await getAgentSession();
    const { data, error } = await client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error(`No membership on workspace ${workspaceId}`);
    }
    if (!['owner', 'editor'].includes(data.role)) {
        throw new Error(`Role "${data.role}" cannot write on workspace ${workspaceId}`);
    }
}
