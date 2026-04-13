import supabase, { formatError } from "../supabase"
import { UserProfile } from "../types"

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error || !data) return null
    return data as UserProfile
}

export async function upsertProfile(
    profile: Pick<UserProfile, 'id'> & Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null> {
    if (!supabase) return null

    const { data, error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select()
        .single()

    if (error || !data) {
        console.error('Failed to upsert profile:', formatError(error))
        return null
    }
    return data as UserProfile
}

export async function fetchProfilesByIds(userIds: string[]): Promise<Record<string, UserProfile>> {
    if (!supabase || !userIds.length) return {}

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

    if (error || !data) return {}

    const map: Record<string, UserProfile> = {}
    for (const p of data) {
        map[p.id] = p as UserProfile
    }
    return map
}

