import { NextRequest, NextResponse } from 'next/server'
import { getUserFromAuthHeader } from '@/lib/server/supabaseAdmin'
import { generateAgentToken } from '@/lib/server/jwt'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
    const auth = await getUserFromAuthHeader(req.headers.get('authorization'))
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data, error } = await auth.client
        .from('agent_tokens')
        .select('id, user_id, name, token_prefix, created_at, last_used_at, revoked_at')
        .eq('user_id', auth.userId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tokens: data ?? [] })
}

export async function POST(req: NextRequest) {
    const auth = await getUserFromAuthHeader(req.headers.get('authorization'))
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let body: { name?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const name = (body.name ?? '').trim()
    if (!name || name.length > 80) {
        return NextResponse.json({ error: 'name required (1-80 chars)' }, { status: 400 })
    }

    const { secret, prefix, hash } = generateAgentToken()

    const { data, error } = await auth.client
        .from('agent_tokens')
        .insert({
            user_id: auth.userId,
            name,
            token_prefix: prefix,
            token_hash: hash,
        })
        .select('id, user_id, name, token_prefix, created_at, last_used_at, revoked_at')
        .single()

    if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
    }

    return NextResponse.json({ token: data, secret })
}

export async function DELETE(req: NextRequest) {
    const auth = await getUserFromAuthHeader(req.headers.get('authorization'))
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await auth.client
        .from('agent_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', auth.userId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
