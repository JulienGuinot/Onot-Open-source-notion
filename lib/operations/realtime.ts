// ─── Realtime helpers ────────────────────────────────────────────────────────

import { RealtimeChannel } from "@supabase/supabase-js"
import supabase from "../supabase"
import { Page, WorkspaceData } from "../types"

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
    presenceData: { email: string; first_name?: string; last_name?: string; avatar_url?: string },
    onSync: (users: { user_id: string; email: string; online_at: string; first_name?: string; last_name?: string; avatar_url?: string }[]) => void
): RealtimeChannel | null {
    if (!supabase) return null

    const channel = supabase.channel(`presence:${workspaceId}`, {
        config: { presence: { key: userId } },
    })

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<{
                user_id: string; email: string; online_at: string;
                first_name?: string; last_name?: string; avatar_url?: string
            }>()
            const users = Object.values(state)
                .flat()
                .map((u) => ({
                    user_id: u.user_id,
                    email: u.email,
                    online_at: u.online_at,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    avatar_url: u.avatar_url,
                }))
            onSync(users)
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userId,
                    online_at: new Date().toISOString(),
                    ...presenceData,
                })
            }
        })

    return channel
}

export function unsubscribeChannel(channel: RealtimeChannel | null) {
    if (!channel || !supabase) return
    supabase.removeChannel(channel)
}
