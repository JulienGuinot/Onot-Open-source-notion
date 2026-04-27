// ─── Personal access tokens for MCP / agent integrations ────────────────────

import supabase, { formatError } from '../supabase'
import { AgentToken } from '../types'

/**
 * All API calls go through Next.js route handlers so the secret-bearing
 * exchange logic and JWT signing live server-side. The browser passes the
 * user's Supabase access token via Authorization: Bearer for auth.
 */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!supabase) throw new Error('Supabase client not configured')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not signed in')

    return fetch(path, {
        ...init,
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.access_token}`,
            ...(init.headers ?? {}),
        },
    })
}

export async function listAgentTokens(): Promise<AgentToken[]> {
    try {
        const res = await authedFetch('/api/mcp/tokens', { method: 'GET' })
        if (!res.ok) {
            console.error('Failed to list agent tokens:', await res.text())
            return []
        }
        const json = await res.json()
        return json.tokens as AgentToken[]
    } catch (err) {
        console.error('Failed to list agent tokens:', formatError(err))
        return []
    }
}

export interface CreatedAgentToken {
    token: AgentToken
    /** Full plaintext value — only available at creation. */
    secret: string
}

export async function createAgentToken(name: string): Promise<CreatedAgentToken | null> {
    try {
        const res = await authedFetch('/api/mcp/tokens', {
            method: 'POST',
            body: JSON.stringify({ name }),
        })
        if (!res.ok) {
            console.error('Failed to create agent token:', await res.text())
            return null
        }
        return (await res.json()) as CreatedAgentToken
    } catch (err) {
        console.error('Failed to create agent token:', formatError(err))
        return null
    }
}

export async function revokeAgentToken(id: string): Promise<boolean> {
    try {
        const res = await authedFetch(`/api/mcp/tokens?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
        })
        return res.ok
    } catch (err) {
        console.error('Failed to revoke agent token:', formatError(err))
        return false
    }
}
