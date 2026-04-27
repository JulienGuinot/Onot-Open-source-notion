// Server-only Supabase clients. Never import from client code.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function getServiceClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

/**
 * Returns a Supabase client whose requests run as the user identified by
 * `accessToken` (extracted from the Authorization header). RLS applies.
 */
export function getUserClient(accessToken: string): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    return createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
}

export async function getUserFromAuthHeader(
    authHeader: string | null
): Promise<{ userId: string; client: SupabaseClient } | null> {
    if (!authHeader?.startsWith('Bearer ')) return null
    const accessToken = authHeader.slice('Bearer '.length).trim()
    if (!accessToken) return null

    const client = getUserClient(accessToken)
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) return null
    return { userId: data.user.id, client }
}
