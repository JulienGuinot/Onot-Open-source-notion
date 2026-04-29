'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { createAgentToken } from '@/lib/operations/agentTokens'
import { publicSupabaseAnonKey, publicSupabaseUrl } from '@/lib/supabase'

function buildAuthUrl(): string {
    const next = `/mcp/connect${window.location.search}`
    return `/auth?next=${encodeURIComponent(next)}`
}

export default function McpConnectPage() {
    return (
        <Suspense fallback={null}>
            <McpConnectContent />
        </Suspense>
    )
}

function McpConnectContent() {
    const params = useSearchParams()
    const { user, loading } = useAuth()
    const [status, setStatus] = useState<'idle' | 'creating' | 'done' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)
    const startedRef = useRef(false)

    const redirectUri = params.get('redirect_uri') ?? ''
    const state = params.get('state') ?? ''
    const authUrl = useMemo(() => {
        if (typeof window === 'undefined') return '/auth'
        return buildAuthUrl()
    }, [])

    useEffect(() => {
        if (loading || !user) return
        if (startedRef.current) return
        if (!redirectUri || !state) {
            setStatus('error')
            setError('Missing MCP connection parameters.')
            return
        }
        if (!redirectUri.startsWith('http://127.0.0.1:') && !redirectUri.startsWith('http://localhost:')) {
            setStatus('error')
            setError('Invalid MCP callback URL.')
            return
        }
        startedRef.current = true

        async function connect() {
            setStatus('creating')
            const result = await createAgentToken(`MCP browser auth - ${new Date().toLocaleString()}`)
            if (!result) {
                setStatus('error')
                setError('Could not create an MCP token.')
                return
            }

            const callback = new URL(redirectUri)
            callback.searchParams.set('state', state)
            callback.searchParams.set('token', result.secret)
            callback.searchParams.set('api_url', window.location.origin)
            callback.searchParams.set('supabase_url', publicSupabaseUrl)
            callback.searchParams.set('supabase_anon_key', publicSupabaseAnonKey)
            setStatus('done')
            window.location.href = callback.toString()
        }

        connect()
    }, [loading, redirectUri, state, user])

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#181818] p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] p-5 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        {status === 'done' ? (
                            <Check size={20} className="text-green-600" />
                        ) : status === 'error' ? (
                            <ShieldAlert size={20} className="text-red-500" />
                        ) : (
                            <Loader2 size={20} className="animate-spin text-blue-500" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Connect Onot MCP</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {loading && 'Checking your Onot session...'}
                            {!loading && !user && 'Sign in to authorize this MCP client.'}
                            {user && status === 'creating' && 'Authorizing this MCP client...'}
                            {status === 'done' && 'Authorization complete. You can close this tab.'}
                            {status === 'error' && error}
                        </p>
                    </div>
                </div>

                {!loading && !user && (
                    <Link
                        href={authUrl}
                        className="mt-5 flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                        Sign in to Onot
                    </Link>
                )}
            </div>
        </main>
    )
}
