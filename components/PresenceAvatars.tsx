'use client'

import { PresenceUser } from '@/lib/types'

interface PresenceAvatarsProps {
    users: PresenceUser[]
    currentUserId?: string | null
    max?: number
}

const COLORS = [
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
    'from-cyan-400 to-cyan-600',
    'from-fuchsia-400 to-fuchsia-600',
    'from-lime-400 to-lime-600',
]

function colorForUser(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
    }
    return COLORS[Math.abs(hash) % COLORS.length]!
}

export default function PresenceAvatars({ users, currentUserId, max = 5 }: PresenceAvatarsProps) {
    const others = users.filter((u) => u.user_id !== currentUserId)
    if (others.length === 0) return null

    const visible = others.slice(0, max)
    const overflow = others.length - max

    return (
        <div className="flex items-center -space-x-2">
            {visible.map((u) => {
                const initial = (u.email ?? '?').charAt(0).toUpperCase()
                return (
                    <div
                        key={u.user_id}
                        title={u.email}
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${colorForUser(u.user_id)}
                                    flex items-center justify-center text-white text-[11px] font-semibold
                                    ring-2 ring-white dark:ring-zinc-800 transition-transform
                                    hover:scale-110 hover:z-10 cursor-default`}
                    >
                        {initial}
                    </div>
                )
            })}

            {overflow > 0 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700
                                flex items-center justify-center text-[10px] font-semibold
                                text-gray-600 dark:text-gray-300
                                ring-2 ring-white dark:ring-zinc-800">
                    +{overflow}
                </div>
            )}
        </div>
    )
}
