import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/server/supabaseAdmin'
import { sha256Hex, signSupabaseJwt } from '@/lib/server/jwt'

export const runtime = 'nodejs'

const JWT_TTL_SECONDS = 60 * 60 // 1h

export async function POST(req: NextRequest) {
    let body: { token?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const token = body.token?.trim()
    if (!token || !token.startsWith('onot_')) {
        return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    }

    const hash = sha256Hex(token)

    const admin = getServiceClient()
    const { data, error } = await admin
        .from('agent_tokens')
        .select('id, user_id, revoked_at')
        .eq('token_hash', hash)
        .maybeSingle()

    if (error) {
        return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
    }
    if (!data || data.revoked_at) {
        return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    }

    // Best-effort touch — failures must not block the exchange.
    admin
        .from('agent_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)
        .then(({ error: updErr }) => {
            if (updErr) console.error('touch last_used_at failed:', updErr.message)
        })

    let signed
    try {
        signed = signSupabaseJwt(data.user_id, JWT_TTL_SECONDS)
    } catch (err) {
        console.error('JWT sign failed:', err)
        return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
    }

    return NextResponse.json({
        access_token: signed.token,
        user_id: data.user_id,
        expires_at: signed.expiresAt,
    })
}
