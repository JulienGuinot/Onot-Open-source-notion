import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Page, WorkspaceData, WorkspaceMember, WorkspaceInvite, MemberRole } from './types'

// ─── Client Setup ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
}

export default supabase

function formatError(err: unknown): string {
    if (!err) return 'unknown error'
    if (err instanceof Error) return err.message
    if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>
        return e.message as string
            || JSON.stringify(err)
    }
    return String(err)
}

// ─── Workspace Operations ────────────────────────────────────────────────────

export async function fetchUserWorkspaces(userId: string): Promise<WorkspaceData[]> {
    if (!supabase) return []

    const { data: memberships, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId)

    if (memErr || !memberships?.length) {
        if (memErr) console.error('Failed to fetch memberships:', formatError(memErr))
        return []
    }

    const ids = memberships.map((m) => m.workspace_id)

    const { data: rows, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name, data')
        .in('id', ids)

    if (wsErr || !rows) {
        console.error('Failed to fetch workspaces:', formatError(wsErr))
        return []
    }

    const roleMap = Object.fromEntries(memberships.map((m) => [m.workspace_id, m.role]))

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        pageOrder: (r.data as any)?.pageOrder ?? [],
        darkMode: (r.data as any)?.darkMode ?? false,
        role: roleMap[r.id] as MemberRole,
    }))
}

export async function createWorkspaceInCloud(
    userId: string,
    name: string,
    darkMode = false
): Promise<WorkspaceData | null> {
    if (!supabase) return null

    const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
            owner_id: userId,
            name,
            data: { darkMode, pageOrder: [] },
        })
        .select('id, name, data')
        .single()

    if (wsErr || !ws) {
        console.error('Failed to create workspace:', formatError(wsErr))
        return null
    }

    const { error: memErr } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: ws.id, user_id: userId, role: 'owner' })

    if (memErr) console.error('Failed to create owner membership:', formatError(memErr))

    return {
        id: ws.id,
        name: ws.name,
        pageOrder: (ws.data as any)?.pageOrder ?? [],
        darkMode: (ws.data as any)?.darkMode ?? false,
        role: 'owner',
    }
}

export async function updateWorkspaceInCloud(
    workspaceId: string,
    updates: { name?: string; darkMode?: boolean; pageOrder?: string[] }
): Promise<boolean> {
    if (!supabase) return false

    const patch: Record<string, unknown> = {}
    if (updates.name !== undefined) patch.name = updates.name

    const settingsPatch: Record<string, unknown> = {}
    if (updates.darkMode !== undefined) settingsPatch.darkMode = updates.darkMode
    if (updates.pageOrder !== undefined) settingsPatch.pageOrder = updates.pageOrder

    if (Object.keys(settingsPatch).length) {
        const { data: current } = await supabase
            .from('workspaces')
            .select('data')
            .eq('id', workspaceId)
            .single()

        patch.data = { ...(current?.data as object ?? {}), ...settingsPatch }
    }

    if (!Object.keys(patch).length) return true

    const { error } = await supabase
        .from('workspaces')
        .update(patch)
        .eq('id', workspaceId)

    if (error) {
        console.error('Failed to update workspace:', formatError(error))
        return false
    }
    return true
}

export async function deleteWorkspaceFromCloud(workspaceId: string): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)

    if (error) {
        console.error('Failed to delete workspace:', formatError(error))
        return false
    }
    return true
}

// ─── Page Operations ─────────────────────────────────────────────────────────

export async function fetchWorkspacePages(workspaceId: string): Promise<Record<string, Page>> {
    if (!supabase) return {}

    const { data: rows, error } = await supabase
        .from('pages')
        .select('id, data, updated_at')
        .eq('workspace_id', workspaceId)

    if (error || !rows) {
        if (error) console.error('Failed to fetch pages:', formatError(error))
        return {}
    }

    const pages: Record<string, Page> = {}
    for (const row of rows) {
        const page = row.data as unknown as Page
        if (page && page.id) {
            pages[row.id] = { ...page, id: row.id }
        }
    }
    return pages
}

/**
 * Saves a page to the cloud. If `expectedUpdatedAt` is provided, the write
 * is conditional: it only succeeds if the row's `updated_at` hasn't changed
 * since we last read it. Returns `'conflict'` when a newer version exists.
 */
export async function savePageToCloud(
    workspaceId: string,
    page: Page,
    userId: string,
    expectedUpdatedAt?: string
): Promise<boolean | 'conflict'> {
    if (!supabase) return false

    if (expectedUpdatedAt) {
        const { data: current } = await supabase
            .from('pages')
            .select('updated_at')
            .eq('id', page.id)
            .eq('workspace_id', workspaceId)
            .single()

        if (current && current.updated_at !== expectedUpdatedAt) {
            return 'conflict'
        }
    }

    const { error } = await supabase
        .from('pages')
        .upsert(
            {
                id: page.id,
                workspace_id: workspaceId,
                data: page,
                updated_by: userId,
            },
            { onConflict: 'id,workspace_id' }
        )

    if (error) {
        console.error('Failed to save page:', formatError(error))
        return false
    }
    return true
}

export async function deletePageFromCloud(
    workspaceId: string,
    pageId: string
): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('workspace_id', workspaceId)

    if (error) {
        console.error('Failed to delete page:', formatError(error))
        return false
    }
    return true
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function fetchWorkspaceMembers(
    workspaceId: string
): Promise<WorkspaceMember[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id, role, created_at')
        .eq('workspace_id', workspaceId)

    if (error || !data) {
        if (error) console.error('Failed to fetch members:', formatError(error))
        return []
    }

    return data as WorkspaceMember[]
}

export async function addMember(
    workspaceId: string,
    userId: string,
    role: MemberRole
): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role })

    if (error) {
        console.error('Failed to add member:', formatError(error))
        return false
    }
    return true
}

export async function updateMemberRole(
    workspaceId: string,
    userId: string,
    role: MemberRole
): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

    if (error) {
        console.error('Failed to update member role:', formatError(error))
        return false
    }
    return true
}

export async function removeMember(
    workspaceId: string,
    userId: string
): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

    if (error) {
        console.error('Failed to remove member:', formatError(error))
        return false
    }
    return true
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export async function createInvite(
    workspaceId: string,
    role: Exclude<MemberRole, 'owner'>,
    createdBy: string,
    expiresInHours?: number
): Promise<WorkspaceInvite | null> {
    if (!supabase) return null

    const insert: Record<string, unknown> = {
        workspace_id: workspaceId,
        role,
        created_by: createdBy,
    }

    if (expiresInHours) {
        insert.expires_at = new Date(Date.now() + expiresInHours * 3600_000).toISOString()
    }

    const { data, error } = await supabase
        .from('workspace_invites')
        .insert(insert)
        .select()
        .single()

    if (error || !data) {
        console.error('Failed to create invite:', formatError(error))
        return null
    }

    return data as WorkspaceInvite
}

export async function fetchInviteByToken(
    token: string
): Promise<(WorkspaceInvite & { workspace_name?: string }) | null> {
    if (!supabase) return null

    const { data, error } = await supabase
        .from('workspace_invites')
        .select('*, workspaces(name)')
        .eq('token', token)
        .single()

    if (error || !data) return null

    const invite = data as any
    return {
        ...invite,
        workspace_name: invite.workspaces?.name,
        workspaces: undefined,
    } as WorkspaceInvite & { workspace_name?: string }
}

export async function acceptInvite(
    token: string,
    userId: string
): Promise<{ workspaceId: string; role: MemberRole } | null> {
    if (!supabase) return null

    const invite = await fetchInviteByToken(token)
    if (!invite) return null

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        console.error('Invite has expired for token:', token)
        return null
    }

    const { error } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: invite.workspace_id,
            user_id: userId,
            role: invite.role,
        })

    if (error) {
        console.error('Failed to accept invite:', formatError(error))
        return null
    }

    return { workspaceId: invite.workspace_id, role: invite.role as MemberRole }
}

export async function fetchWorkspaceInvites(
    workspaceId: string
): Promise<WorkspaceInvite[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', workspaceId)

    if (error || !data) return []
    return data as WorkspaceInvite[]
}

export async function revokeInvite(inviteId: string): Promise<boolean> {
    if (!supabase) return false

    const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', inviteId)

    if (error) {
        console.error('Failed to revoke invite:', formatError(error))
        return false
    }
    return true
}

// ─── Legacy migration helper ─────────────────────────────────────────────────

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

// ─── Realtime helpers ────────────────────────────────────────────────────────

export function subscribeToPagesChanges(
    workspaceId: string,
    onInsert: (page: Page) => void,
    onUpdate: (page: Page) => void,
    onDelete: (pageId: string) => void,
    skipUserId?: string
): RealtimeChannel | null {
    if (!supabase) return null

    const isSelf = (row: any) => skipUserId && row.updated_by === skipUserId

    const channel = supabase
        .channel(`pages:${workspaceId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'pages',
                filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
                const row = payload.new as any
                if (isSelf(row)) return
                const page = { ...(row.data as Page), id: row.id }
                onInsert(page)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'pages',
                filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
                const row = payload.new as any
                if (isSelf(row)) return
                const page = { ...(row.data as Page), id: row.id }
                onUpdate(page)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'pages',
                filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
                const row = payload.old as any
                onDelete(row.id)
            }
        )
        .subscribe()

    return channel
}

export function subscribeToWorkspaceChanges(
    workspaceId: string,
    onUpdate: (ws: Partial<WorkspaceData>) => void
): RealtimeChannel | null {
    if (!supabase) return null

    const channel = supabase
        .channel(`workspace:${workspaceId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'workspaces',
                filter: `id=eq.${workspaceId}`,
            },
            (payload) => {
                const row = payload.new as any
                onUpdate({
                    name: row.name,
                    pageOrder: (row.data as any)?.pageOrder,
                    darkMode: (row.data as any)?.darkMode,
                })
            }
        )
        .subscribe()

    return channel
}

export function subscribeToPresence(
    workspaceId: string,
    userId: string,
    email: string,
    onSync: (users: { user_id: string; email: string; online_at: string }[]) => void
): RealtimeChannel | null {
    if (!supabase) return null

    const channel = supabase.channel(`presence:${workspaceId}`, {
        config: { presence: { key: userId } },
    })

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<{ user_id: string; email: string; online_at: string }>()
            const users = Object.values(state)
                .flat()
                .map((u) => ({
                    user_id: u.user_id,
                    email: u.email,
                    online_at: u.online_at,
                }))
            onSync(users)
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userId,
                    email,
                    online_at: new Date().toISOString(),
                })
            }
        })

    return channel
}

export function unsubscribeChannel(channel: RealtimeChannel | null) {
    if (!channel || !supabase) return
    supabase.removeChannel(channel)
}
