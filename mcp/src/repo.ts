// Thin data-access layer over Supabase. All calls run as the agent user,
// so RLS is the source of truth for what is readable / writable.

import { getAgentSession } from './supabase.js';
import { Page, WorkspaceRow } from './types.js';

export async function listWorkspaces(): Promise<{ id: string; name: string; role: string }[]> {
    const { client, userId } = await getAgentSession();
    const { data, error } = await client
        .from('workspace_members')
        .select('role, workspaces:workspace_id(id, name)')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return (data ?? []).flatMap((row: any) => {
        const w = row.workspaces;
        if (!w) return [];
        return [{ id: w.id, name: w.name, role: row.role }];
    });
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceRow> {
    const { client } = await getAgentSession();
    const { data, error } = await client
        .from('workspaces')
        .select('id, name, data')
        .eq('id', workspaceId)
        .single();
    if (error || !data) throw new Error(error?.message ?? 'workspace not found');
    return data as WorkspaceRow;
}

export async function listPages(workspaceId: string): Promise<{ id: string; title: string; type: string; parentId: string | null; updatedAt: number }[]> {
    const { client } = await getAgentSession();
    const { data, error } = await client
        .from('pages')
        .select('id, data')
        .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => {
        const p = r.data as Page;
        return {
            id: r.id,
            title: p?.title ?? '(untitled)',
            type: p?.type ?? 'page',
            parentId: p?.parentId ?? null,
            updatedAt: p?.updatedAt ?? 0,
        };
    });
}

export async function readPage(workspaceId: string, pageId: string): Promise<Page> {
    const { client } = await getAgentSession();
    const { data, error } = await client
        .from('pages')
        .select('id, data')
        .eq('workspace_id', workspaceId)
        .eq('id', pageId)
        .single();
    if (error || !data) throw new Error(error?.message ?? 'page not found');
    const page = data.data as Page;
    return { ...page, id: data.id };
}

export async function writePage(workspaceId: string, page: Page): Promise<void> {
    const { client, userId } = await getAgentSession();
    const updated = { ...page, updatedAt: Date.now() };
    const { error } = await client
        .from('pages')
        .upsert(
            { id: page.id, workspace_id: workspaceId, data: updated, updated_by: userId },
            { onConflict: 'id,workspace_id' },
        );
    if (error) throw new Error(error.message);
}

export async function deletePage(workspaceId: string, pageId: string): Promise<void> {
    const { client } = await getAgentSession();
    const { error } = await client
        .from('pages')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('id', pageId);
    if (error) throw new Error(error.message);
}

export async function appendToPageOrder(workspaceId: string, pageId: string): Promise<void> {
    const { client } = await getAgentSession();
    const ws = await getWorkspace(workspaceId);
    const order = Array.isArray(ws.data?.pageOrder) ? [...ws.data!.pageOrder!] : [];
    if (!order.includes(pageId)) order.push(pageId);
    const newData = { ...(ws.data ?? {}), pageOrder: order };
    const { error } = await client.from('workspaces').update({ data: newData }).eq('id', workspaceId);
    if (error) throw new Error(error.message);
}

export async function removeFromPageOrder(workspaceId: string, pageId: string): Promise<void> {
    const { client } = await getAgentSession();
    const ws = await getWorkspace(workspaceId);
    const order = Array.isArray(ws.data?.pageOrder) ? ws.data!.pageOrder!.filter((id) => id !== pageId) : [];
    const newData = { ...(ws.data ?? {}), pageOrder: order };
    const { error } = await client.from('workspaces').update({ data: newData }).eq('id', workspaceId);
    if (error) throw new Error(error.message);
}
