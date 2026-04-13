
// ─── Members ─────────────────────────────────────────────────────────────────

import { fetchProfilesByIds } from "../operations/profiles"
import supabase, { formatError } from "../supabase"
import { MemberRole, WorkspaceInvite, WorkspaceMember } from "../types"

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

    const userIds = data.map((m) => m.user_id)
    const profiles = await fetchProfilesByIds(userIds)

    return data.map((m) => ({
        ...m,
        profile: profiles[m.user_id],
    })) as WorkspaceMember[]
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