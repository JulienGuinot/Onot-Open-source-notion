// ─── Workspace Operations ────────────────────────────────────────────────────

import { fetchWorkspacePages } from "./pages"
import supabase, { formatError } from "../supabase"
import { MemberRole, WorkspaceData } from "../types"

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
        const selectPromise = supabase
            .from('workspaces')
            .select('data')
            .eq('id', workspaceId)
            .single()

        const selectTimeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 8000)
        )

        const { data: current, error: selectErr } = await Promise.race([selectPromise, selectTimeout])
        if (selectErr) {
            console.error('Failed to read workspace before update:', formatError(selectErr))
            return false
        }

        patch.data = { ...(current?.data as object ?? {}), ...settingsPatch }
    }

    if (!Object.keys(patch).length) return true

    const updatePromise = supabase
        .from('workspaces')
        .update(patch)
        .eq('id', workspaceId)

    const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: "TIMEOUT" } }), 8000)
    )

    const { error } = await Promise.race([updatePromise, timeoutPromise])

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
