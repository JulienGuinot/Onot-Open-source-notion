'use client'

import { useState } from 'react'
import { X, Link2, Copy, Check, Trash2, ChevronDown, UserPlus, Shield, Eye, Edit3 } from 'lucide-react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useAuth } from '@/providers/AuthProvider'
import { MemberRole } from '@/lib/types'
import UserAvatar, { getUserDisplayName } from './UserAvatar'

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
}

const ROLE_LABELS: Record<MemberRole, string> = {
    owner: 'Owner',
    editor: 'Editor',
    viewer: 'Viewer',
}

const ROLE_ICONS: Record<MemberRole, React.ReactNode> = {
    owner: <Shield size={14} />,
    editor: <Edit3 size={14} />,
    viewer: <Eye size={14} />,
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
    const { user } = useAuth()
    const {
        workspace, members, invites, userRole,
        createInviteLink, revokeInviteLink,
        removeMemberFromWorkspace, updateMemberRoleInWorkspace,
    } = useWorkspace()

    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null)

    if (!isOpen || !workspace) return null

    const isOwner = userRole === 'owner'

    const handleGenerateLink = async () => {
        setLoading(true)
        try {
            const link = await createInviteLink(inviteRole)
            setGeneratedLink(link)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!generatedLink) return
        await navigator.clipboard.writeText(generatedLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRevokeInvite = async (inviteId: string) => {
        console.log("Revoking", inviteId)
        await revokeInviteLink(inviteId)
        setGeneratedLink(null)
    }

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Remove this member?')) return
        await removeMemberFromWorkspace(userId)
    }

    const handleChangeRole = async (userId: string, newRole: MemberRole) => {
        await updateMemberRoleInWorkspace(userId, newRole)
        setRoleMenuOpen(null)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl
                            border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Share &ldquo;{workspace.name}&rdquo;
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Invite people to collaborate on this workspace
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Invite link generator */}
                    {isOwner && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <UserPlus size={16} />
                                Create invite link
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                                    className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200
                                               dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300
                                               focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                    <option value="editor">Can edit</option>
                                    <option value="viewer">Can view</option>
                                </select>
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm
                                               bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors
                                               disabled:opacity-50 font-medium"
                                >
                                    <Link2 size={14} />
                                    {loading ? 'Generating...' : 'Generate link'}
                                </button>
                            </div>

                            {generatedLink && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20
                                                border border-green-200 dark:border-green-800 rounded-lg">
                                    <input
                                        type="text"
                                        value={generatedLink}
                                        readOnly
                                        className="flex-1 text-sm bg-transparent text-green-800 dark:text-green-300
                                                   focus:outline-none truncate"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-800/40 rounded-md transition-colors"
                                    >
                                        {copied ? (
                                            <Check size={16} className="text-green-600" />
                                        ) : (
                                            <Copy size={16} className="text-green-600" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Active invites */}
                    {isOwner && invites.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Active invite links
                            </div>
                            {invites.map((inv) => {
                                const expired = inv.expires_at && new Date(inv.expires_at) < new Date()
                                return (
                                    <div
                                        key={inv.id}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm
                                                   ${expired
                                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
                                                : 'bg-gray-50 dark:bg-gray-800/50'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Link2 size={14} className="text-gray-400" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {inv.role} link
                                            </span>
                                            {expired && (
                                                <span className="text-xs text-red-500 font-medium">Expired</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRevokeInvite(inv.id)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Members list */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Members ({members.length})
                        </div>
                        <div className="space-y-0.5 max-h-60 overflow-y-auto">
                            {members.map((member) => {
                                const p = member.profile
                                const isMe = member.user_id === user?.id
                                const displayName = getUserDisplayName(p?.first_name, p?.last_name, p?.email ?? member.email)

                                return (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg
                                                   hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <UserAvatar
                                                avatarUrl={p?.avatar_url}
                                                firstName={p?.first_name}
                                                lastName={p?.last_name}
                                                email={p?.email ?? member.email}
                                                userId={member.user_id}
                                                size="md"
                                            />
                                            <div className="min-w-0">
                                                <div className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                    <span className="truncate">{displayName}</span>
                                                    {isMe && (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                                            (You)
                                                        </span>
                                                    )}
                                                </div>
                                                {p?.first_name && p?.email && (
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                        {p.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {isOwner && member.role !== 'owner' ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setRoleMenuOpen(
                                                            roleMenuOpen === member.user_id ? null : member.user_id
                                                        )}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md
                                                                   bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                                                                   hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        {ROLE_ICONS[member.role]}
                                                        {ROLE_LABELS[member.role]}
                                                        <ChevronDown size={10} />
                                                    </button>

                                                    {roleMenuOpen === member.user_id && (
                                                        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#252525]
                                                                        border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                                            {(['editor', 'viewer'] as const).map((r) => (
                                                                <button
                                                                    key={r}
                                                                    onClick={() => handleChangeRole(member.user_id, r)}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
                                                                               hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                                >
                                                                    {ROLE_ICONS[r]}
                                                                    <span className="text-gray-700 dark:text-gray-300">{ROLE_LABELS[r]}</span>
                                                                    {member.role === r && <Check size={12} className="ml-auto text-blue-500" />}
                                                                </button>
                                                            ))}
                                                            <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setRoleMenuOpen(null)
                                                                        handleRemoveMember(member.user_id)
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
                                                                               text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md
                                                                 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                    {ROLE_ICONS[member.role]}
                                                    {ROLE_LABELS[member.role]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
