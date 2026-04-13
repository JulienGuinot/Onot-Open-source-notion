// ─── Page Operations ─────────────────────────────────────────────────────────

import supabase, { formatError } from "../supabase"
import { Page } from "../types"

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

    console.log("SavePageToCloud appelée")
    console.log(supabase ? "Supabase is ok" : "Supabase is not ok")
    if (!supabase) return false

    if (expectedUpdatedAt) {
        console.log("fetch supabase - expectedUpdatedAt")
        const { data: current, error } = await supabase
            .from('pages')
            .select('updated_at')
            .eq('id', page.id)
            .eq('workspace_id', workspaceId)
            .single()



        console.error("Une erreur est survenue", error, current)

        if (current && current.updated_at !== expectedUpdatedAt) {
            return 'conflict'
        }
    }

    console.log("fetch supabase 2")
    const upsertPromise = supabase
        .from('pages')
        .upsert(
            { id: page.id, workspace_id: workspaceId, data: page, updated_by: userId },
            { onConflict: 'id,workspace_id' }
        )

    const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: "TIMEOUT" } }), 8000)
    )

    const { error } = await Promise.race([upsertPromise, timeoutPromise])
    console.log("Après race, error:", error)

    if (error) {
        console.error('Failed to save page:', formatError(error))
        return false
    }

    console.log("Carré ca a marché")
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