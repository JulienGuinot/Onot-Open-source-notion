import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { AppData, WorkspaceData } from './types'

// ─── Client Setup ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
}

export default supabase

// ─── Database Operations ─────────────────────────────────────────────────────

export async function fetchAppData(userId: string): Promise<AppData | null> {
    if (!supabase) return null

    const { data, error } = await supabase
        .from('workspaces')
        .select('data')
        .eq('user_id', userId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        console.error('Failed to fetch app data:', error)
        return null
    }

    const stored = data?.data
    if (!stored) return null

    // Migrate legacy single-workspace cloud data
    if (stored.pages && !stored.workspaces) {
        const ws: WorkspaceData = { id: 'default', name: 'My Workspace', ...stored }
        return { currentWorkspaceId: 'default', workspaces: { default: ws } }
    }

    return stored as AppData
}

export async function saveAppDataToCloud(
    userId: string,
    appData: AppData
): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspaces')
        .upsert({
            user_id: userId,
            data: appData,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

    if (error) {
        console.error('Failed to save app data:', error)
        return false
    }

    return true
}

export async function deleteWorkspaceFromCloud(userId: string): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('user_id', userId)

    if (error) {
        console.error('Failed to delete workspace:', error)
        return false
    }

    return true
}
