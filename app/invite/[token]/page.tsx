'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { acceptInvite, fetchInviteByToken } from '@/lib/supabase'
import { saveCurrentWorkspaceId } from '@/lib/storage'
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react'
import Link from 'next/link'

type InviteState =
    | { status: 'loading' }
    | { status: 'needs_auth' }
    | { status: 'preview'; workspaceName: string; role: string }
    | { status: 'accepting' }
    | { status: 'success'; workspaceId: string }
    | { status: 'error'; message: string }

export default function InvitePage() {
    const params = useParams<{ token: string }>()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [state, setState] = useState<InviteState>({ status: 'loading' })

    const token = params.token

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            setState({ status: 'needs_auth' })
            return
        }

        const loadInvite = async () => {
            setState({ status: 'loading' })
            const invite = await fetchInviteByToken(token)
            if (!invite) {
                setState({ status: 'error', message: 'This invite link is invalid or has been revoked.' })
                return
            }
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                setState({ status: 'error', message: 'This invite link has expired.' })
                return
            }
            setState({
                status: 'preview',
                workspaceName: invite.workspace_name ?? 'a workspace',
                role: invite.role,
            })
        }

        loadInvite()
    }, [token, user, authLoading])

    const handleAccept = async () => {
        if (!user) return
        setState({ status: 'accepting' })

        const result = await acceptInvite(token, user.id)
        if (!result) {
            setState({ status: 'error', message: 'Failed to accept the invite. It may be invalid or expired.' })
            return
        }

        saveCurrentWorkspaceId(result.workspaceId)
        setState({ status: 'success', workspaceId: result.workspaceId })
        setTimeout(() => router.push('/'), 2000)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 mb-4 shadow-xl shadow-blue-500/25">
                        <span className="text-3xl">📝</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Workspace Invite
                    </h1>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
                    {state.status === 'loading' && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
                            <p className="text-slate-400">Loading invite...</p>
                        </div>
                    )}

                    {state.status === 'needs_auth' && (
                        <div className="flex flex-col items-center py-6 space-y-4">
                            <LogIn className="w-10 h-10 text-slate-400" />
                            <p className="text-slate-300 text-center">
                                You need to sign in to accept this invite.
                            </p>
                            <Link
                                href="/auth"
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600
                                           hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg
                                           shadow-blue-500/25 transition-all"
                            >
                                Sign in
                            </Link>
                        </div>
                    )}

                    {state.status === 'preview' && (
                        <div className="flex flex-col items-center py-6 space-y-5">
                            <p className="text-slate-300 text-center text-lg">
                                You&apos;ve been invited to join
                            </p>
                            <div className="px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700 w-full text-center">
                                <p className="text-white font-semibold text-xl">{state.workspaceName}</p>
                                <p className="text-slate-400 text-sm mt-1">
                                    as {state.role === 'editor' ? 'an editor' : 'a viewer'}
                                </p>
                            </div>
                            <button
                                onClick={handleAccept}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-violet-600
                                           hover:from-blue-600 hover:to-violet-700 text-white font-semibold
                                           rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40
                                           transition-all"
                            >
                                Accept invite
                            </button>
                        </div>
                    )}

                    {state.status === 'accepting' && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
                            <p className="text-slate-400">Joining workspace...</p>
                        </div>
                    )}

                    {state.status === 'success' && (
                        <div className="flex flex-col items-center py-6 space-y-4">
                            <CheckCircle2 className="w-12 h-12 text-green-400" />
                            <p className="text-green-300 text-lg font-medium">
                                You&apos;ve joined the workspace!
                            </p>
                            <p className="text-slate-400 text-sm">Redirecting...</p>
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div className="flex flex-col items-center py-6 space-y-4">
                            <XCircle className="w-12 h-12 text-red-400" />
                            <p className="text-red-300 text-center">{state.message}</p>
                            <Link
                                href="/"
                                className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                            >
                                Go to app
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
