import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Page, WorkspaceData, WorkspaceMember, WorkspaceInvite, MemberRole, UserProfile } from './types'
import { createWorkspaceInCloud, updateWorkspaceInCloud } from './operations/workspaces'
import { savePageToCloud } from './operations/pages'

// ─── Client Setup ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
}

export default supabase

export function formatError(err: unknown): string {
    if (!err) return 'unknown error'
    if (err instanceof Error) return err.message
    if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>
        return e.message as string
            || JSON.stringify(err)
    }
    return String(err)
}



/**
 * Detects and migrates old single-blob format where all workspaces lived in
 * one row's JSONB `data` field. Returns migrated workspace IDs on success.
 */
export async function migrateOldCloudData(
    userId: string
): Promise<WorkspaceData[] | null> {
    if (!supabase) return null

    const { data: rows, error } = await supabase
        .from('workspaces')
        .select('id, data')
        .eq('user_id', userId)

    if (error || !rows?.length) return null

    const legacyRow = rows.find(
        (r) => (r.data as any)?.workspaces && typeof (r.data as any).workspaces === 'object'
    )

    if (!legacyRow) return null

    const blob = legacyRow.data as any
    const results: WorkspaceData[] = []

    for (const [, wsData] of Object.entries<any>(blob.workspaces)) {
        const created = await createWorkspaceInCloud(
            userId,
            wsData.name || 'My Workspace',
            wsData.darkMode ?? false
        )
        if (!created) continue

        const pages: Record<string, Page> = wsData.pages ?? {}
        const pageOrder: string[] = wsData.pageOrder ?? []

        for (const page of Object.values<Page>(pages)) {
            await savePageToCloud(created.id, page, userId)
        }

        await updateWorkspaceInCloud(created.id, { pageOrder })
        results.push({ ...created, pageOrder })
    }

    await supabase.from('workspaces').delete().eq('id', legacyRow.id)

    return results.length ? results : null
}

