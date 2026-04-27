'use client'

import { useEffect, useState } from 'react'
import { X, Bot, Plus, Copy, Check, Trash2, AlertTriangle, BookOpen } from 'lucide-react'
import { AgentToken } from '@/lib/types'
import { createAgentToken, listAgentTokens, revokeAgentToken } from '@/lib/operations/agentTokens'
import { buildMcpConfig, CLIENT_LABELS, McpClient } from '@/lib/mcpConfig'

interface AgentsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AgentsModal({ isOpen, onClose }: AgentsModalProps) {
    const [tokens, setTokens] = useState<AgentToken[]>([])
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [creating, setCreating] = useState(false)
    const [justCreated, setJustCreated] = useState<{ token: AgentToken; secret: string } | null>(null)
    const [client, setClient] = useState<McpClient>('claude-desktop')
    const [copied, setCopied] = useState<'secret' | 'config' | null>(null)
    const [detail, setDetail] = useState<AgentToken | null>(null)

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        setLoading(true)
        listAgentTokens().then((rows) => {
            if (!cancelled) {
                setTokens(rows)
                setLoading(false)
            }
        })
        return () => { cancelled = true }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            setJustCreated(null)
            setName('')
            setCopied(null)
            setDetail(null)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleCreate = async () => {
        const trimmed = name.trim()
        if (!trimmed) return
        setCreating(true)
        try {
            const result = await createAgentToken(trimmed)
            if (result) {
                setJustCreated(result)
                setTokens((prev) => [result.token, ...prev])
                setName('')
            }
        } finally {
            setCreating(false)
        }
    }

    const handleRevoke = async (id: string) => {
        if (!confirm('Revoke this token? Any agent using it will lose access.')) return
        const ok = await revokeAgentToken(id)
        if (ok) setTokens((prev) => prev.filter((t) => t.id !== id))
    }

    const copy = async (value: string, kind: 'secret' | 'config') => {
        await navigator.clipboard.writeText(value)
        setCopied(kind)
        setTimeout(() => setCopied(null), 2000)
    }

    const apiUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

    const config = justCreated
        ? buildMcpConfig(client, {
            token: justCreated.secret,
            apiUrl,
            supabaseUrl,
            supabaseAnonKey,
        })
        : ''

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[92dvh] bg-white dark:bg-[#1e1e1e] rounded-t-lg sm:rounded-lg shadow-2xl
                            border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Bot size={18} className="text-blue-500" />
                            AI agents
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Create a token to connect Claude Desktop, Cursor or any MCP client to your Onot account.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-6 overflow-y-auto">
                    {/* Create new */}
                    {!justCreated && (
                        <div className="space-y-3">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                New token
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                    placeholder="e.g. Claude Desktop on laptop"
                                    maxLength={80}
                                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200
                                               dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300
                                               focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !name.trim()}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm
                                               bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors
                                               disabled:opacity-50 font-medium"
                                >
                                    <Plus size={14} />
                                    {creating ? 'Creating...' : 'Create token'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Just-created reveal */}
                    {justCreated && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                                            border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    Copy this token now — it will not be shown again. Treat it like a password; any holder can act as your account.
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Token</div>
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20
                                                border border-green-200 dark:border-green-800 rounded-lg">
                                    <code className="flex-1 text-xs font-mono text-green-800 dark:text-green-300 break-all">
                                        {justCreated.secret}
                                    </code>
                                    <button
                                        onClick={() => copy(justCreated.secret, 'secret')}
                                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-800/40 rounded-md transition-colors shrink-0"
                                    >
                                        {copied === 'secret'
                                            ? <Check size={16} className="text-green-600" />
                                            : <Copy size={16} className="text-green-600" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium uppercase tracking-wider text-gray-400">MCP client config</div>
                                    <div className="flex gap-1">
                                        {(Object.keys(CLIENT_LABELS) as McpClient[]).map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setClient(c)}
                                                className={`px-2 py-1 text-xs rounded-md transition-colors ${client === c
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {CLIENT_LABELS[c]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <pre className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                                                    rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre">
                                        {config}
                                    </pre>
                                    <button
                                        onClick={() => copy(config, 'config')}
                                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 border border-gray-200
                                                   dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {copied === 'config'
                                            ? <Check size={14} className="text-green-600" />
                                            : <Copy size={14} className="text-gray-500" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Replace <code>/abs/path/to/Onot/mcp/dist/index.js</code> with the path on your machine after running <code>npm install &amp;&amp; npm run build</code> inside <code>mcp/</code>.
                                </p>
                            </div>

                            <ClientInstructions client={client} />

                            <button
                                onClick={() => setJustCreated(null)}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                Done — back to token list
                            </button>
                        </div>
                    )}

                    {/* Existing tokens */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active tokens ({tokens.length})
                        </div>
                        {loading ? (
                            <div className="text-sm text-gray-400">Loading…</div>
                        ) : tokens.length === 0 ? (
                            <div className="text-sm text-gray-400 italic">No tokens yet.</div>
                        ) : (
                            <div className="space-y-1">
                                {tokens.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setDetail(t)}
                                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg
                                                   bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/60
                                                   text-left transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.name}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                {t.token_prefix}…
                                                {t.last_used_at && (
                                                    <span className="ml-2">last used {new Date(t.last_used_at).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); handleRevoke(t.id) }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRevoke(t.id) } }}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                            title="Revoke"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {detail && (
                <TokenDetailModal
                    token={detail}
                    apiUrl={apiUrl}
                    supabaseUrl={supabaseUrl}
                    supabaseAnonKey={supabaseAnonKey}
                    onClose={() => setDetail(null)}
                    onRevoke={async () => {
                        await handleRevoke(detail.id)
                        setDetail(null)
                    }}
                />
            )}
        </div>
    )
}

function TokenDetailModal({
    token,
    apiUrl,
    supabaseUrl,
    supabaseAnonKey,
    onClose,
    onRevoke,
}: {
    token: AgentToken
    apiUrl: string
    supabaseUrl: string
    supabaseAnonKey: string
    onClose: () => void
    onRevoke: () => void
}) {
    const [client, setClient] = useState<McpClient>('claude-desktop')
    const [copied, setCopied] = useState(false)

    const config = buildMcpConfig(client, {
        token: '<your-token>',
        apiUrl,
        supabaseUrl,
        supabaseAnonKey,
    })

    const copy = async () => {
        await navigator.clipboard.writeText(config)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl max-h-[92dvh] bg-white dark:bg-[#1e1e1e] rounded-t-lg sm:rounded-lg shadow-2xl
                            border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 truncate">
                            <Bot size={18} className="text-blue-500 shrink-0" />
                            <span className="truncate">{token.name}</span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                            {token.token_prefix}…
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Created</div>
                            <div className="text-gray-700 dark:text-gray-300">{new Date(token.created_at).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Last used</div>
                            <div className="text-gray-700 dark:text-gray-300">
                                {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Status</div>
                            <div className="text-gray-700 dark:text-gray-300">
                                {token.revoked_at ? (
                                    <span className="text-red-500">Revoked {new Date(token.revoked_at).toLocaleDateString()}</span>
                                ) : (
                                    <span className="text-green-600 dark:text-green-400">Active</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Prefix</div>
                            <div className="text-gray-700 dark:text-gray-300 font-mono text-xs">{token.token_prefix}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60
                                    border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <div>
                            Full secret only shown once at creation. Below is the config template — replace <code>&lt;your-token&gt;</code> with the secret you saved. Lost it? Revoke and create a new one.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Config template</div>
                            <div className="flex gap-1">
                                {(Object.keys(CLIENT_LABELS) as McpClient[]).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setClient(c)}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors ${client === c
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {CLIENT_LABELS[c]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <pre className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                                            rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre">
                                {config}
                            </pre>
                            <button
                                onClick={copy}
                                className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 border border-gray-200
                                           dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {copied
                                    ? <Check size={14} className="text-green-600" />
                                    : <Copy size={14} className="text-gray-500" />}
                            </button>
                        </div>
                    </div>

                    <ClientInstructions client={client} />

                    {!token.revoked_at && (
                        <button
                            onClick={onRevoke}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg
                                       border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400
                                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 size={14} />
                            Revoke token
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function ClientInstructions({ client }: { client: McpClient }) {
    const steps: Record<McpClient, { title: string; items: React.ReactNode[]; docs?: { label: string; href: string } }> = {
        'claude-desktop': {
            title: 'Add to Claude Desktop',
            docs: { label: 'MCP docs', href: 'https://modelcontextprotocol.io/quickstart/user' },
            items: [
                <>Build the MCP server: <code>cd mcp &amp;&amp; npm install &amp;&amp; npm run build</code>.</>,
                <>Open Claude Desktop → <b>Settings</b> → <b>Developer</b> → <b>Edit Config</b>.</>,
                <>Paste the JSON above into <code>claude_desktop_config.json</code>. If <code>mcpServers</code> already exists, merge the <code>onot</code> entry into it.</>,
                <>Replace the placeholder path with the absolute path to <code>mcp/dist/index.js</code>.</>,
                <>Quit Claude Desktop fully (tray icon → Quit) then reopen. The <b>onot</b> tools should appear in the tools menu.</>,
            ],
        },
        cursor: {
            title: 'Add to Cursor',
            docs: { label: 'Cursor MCP docs', href: 'https://docs.cursor.com/context/model-context-protocol' },
            items: [
                <>Build the MCP server: <code>cd mcp &amp;&amp; npm install &amp;&amp; npm run build</code>.</>,
                <>Cursor → <b>Settings</b> → <b>MCP</b> → <b>Add new MCP server</b> (or edit <code>~/.cursor/mcp.json</code>).</>,
                <>Paste the JSON above and set the absolute path to <code>mcp/dist/index.js</code>.</>,
                <>Reload Cursor. Open the chat → <b>Tools</b> panel — <b>onot</b> should be listed and toggleable.</>,
            ],
        },
        'claude-code': {
            title: 'Add to Claude Code (CLI)',
            docs: { label: 'Claude Code MCP docs', href: 'https://docs.claude.com/en/docs/claude-code/mcp' },
            items: [
                <>Build the MCP server: <code>cd mcp &amp;&amp; npm install &amp;&amp; npm run build</code>.</>,
                <>Run the <code>claude mcp add</code> command above in your terminal. Replace the path with the absolute path to <code>mcp/dist/index.js</code>.</>,
                <>Verify with <code>claude mcp list</code> — <b>onot</b> should be present.</>,
                <>Inside a Claude Code session, run <code>/mcp</code> to confirm the server is connected.</>,
            ],
        },
    }

    const s = steps[client]
    return (
        <div className="space-y-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                    <BookOpen size={14} />
                    {s.title}
                </div>
                {s.docs && (
                    <a
                        href={s.docs.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-300 hover:underline"
                    >
                        {s.docs.label} ↗
                    </a>
                )}
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed [&_code]:px-1 [&_code]:py-0.5 [&_code]:bg-white [&_code]:dark:bg-gray-800 [&_code]:rounded [&_code]:text-[11px]">
                {s.items.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ol>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-blue-200/60 dark:border-blue-900/30">
                Token acts as your account. Revoke it from the list below if a device is lost or shared.
            </p>
        </div>
    )
}
