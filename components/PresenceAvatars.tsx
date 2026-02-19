'use client'

import { PresenceUser } from '@/lib/types'
import UserAvatar, { getUserDisplayName } from './UserAvatar'

interface PresenceAvatarsProps {
    users: PresenceUser[]
    currentUserId?: string | null
    max?: number
}

export default function PresenceAvatars({ users, currentUserId, max = 5 }: PresenceAvatarsProps) {
    const others = users.filter((u) => u.user_id !== currentUserId)
    if (others.length === 0) return null

    const visible = others.slice(0, max)
    const overflow = others.length - max

    return (
        <div className="flex items-center -space-x-2">
            {visible.map((u) => (
                <div
                    key={u.user_id}
                    className="transition-transform hover:scale-110 hover:z-10 cursor-default"
                    title={getUserDisplayName(u.first_name, u.last_name, u.email)}
                >
                    <UserAvatar
                        avatarUrl={u.avatar_url}
                        firstName={u.first_name}
                        lastName={u.last_name}
                        email={u.email}
                        userId={u.user_id}
                        size="sm"
                        ring
                    />
                </div>
            ))}

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
