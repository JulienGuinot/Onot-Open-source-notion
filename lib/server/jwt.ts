// Minimal HS256 JWT signer/verifier for the MCP token-exchange flow.
// Signs tokens with SUPABASE_JWT_SECRET so Supabase accepts them as a normal
// authenticated user session — no service-role bypass at runtime.

import crypto from 'node:crypto'

function b64url(input: Buffer | string): string {
    const buf = typeof input === 'string' ? Buffer.from(input) : input
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface SupabaseJwtPayload {
    sub: string
    aud: string
    role: string
    iat: number
    exp: number
}

export function signSupabaseJwt(userId: string, ttlSeconds = 3600): { token: string; expiresAt: number } {
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) throw new Error('Missing SUPABASE_JWT_SECRET')

    const now = Math.floor(Date.now() / 1000)
    const exp = now + ttlSeconds

    const header = { alg: 'HS256', typ: 'JWT' }
    const payload: SupabaseJwtPayload = {
        sub: userId,
        aud: 'authenticated',
        role: 'authenticated',
        iat: now,
        exp,
    }

    const encodedHeader = b64url(JSON.stringify(header))
    const encodedPayload = b64url(JSON.stringify(payload))
    const data = `${encodedHeader}.${encodedPayload}`
    const signature = b64url(crypto.createHmac('sha256', secret).update(data).digest())

    return { token: `${data}.${signature}`, expiresAt: exp }
}

export function sha256Hex(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex')
}

export function generateAgentToken(): { secret: string; prefix: string; hash: string } {
    const random = crypto.randomBytes(32).toString('base64url')
    const secret = `onot_${random}`
    return {
        secret,
        prefix: secret.slice(0, 12),
        hash: sha256Hex(secret),
    }
}
