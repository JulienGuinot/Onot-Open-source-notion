import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceData } from './types'

// ─── Client Setup ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
}

export default supabase

// ─── Database Operations ─────────────────────────────────────────────────────

export async function fetchWorkspace(userId: string): Promise<WorkspaceData | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
        .from('workspaces')
        .select('data')
        .eq('user_id', userId)
        .single()
    
    if (error) {
        if (error.code === 'PGRST116') return null // No rows found
        console.error('Failed to fetch workspace:', error)
        return null
    }
    
    return data?.data as WorkspaceData | null
}

export async function saveWorkspaceToCloud(
    userId: string, 
    workspace: WorkspaceData
): Promise<boolean> {
    if (!supabase) return false
    
    const { error } = await supabase
        .from('workspaces')
        .upsert({
            user_id: userId,
            data: workspace,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
    
    if (error) {
        console.error('Failed to save workspace:', error)
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
