'use client'

const GRADIENT_COLORS = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-cyan-400 to-sky-500',
    'from-fuchsia-400 to-purple-600',
    'from-lime-400 to-emerald-500',
]

function hashColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
    return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length]!
}

interface UserAvatarProps {
    avatarUrl?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    userId?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    className?: string
    ring?: boolean
}

const SIZE_CLASSES = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
}

export default function UserAvatar({
    avatarUrl,
    firstName,
    lastName,
    email,
    userId = '',
    size = 'md',
    className = '',
    ring = false,
}: UserAvatarProps) {
    const initials = firstName
        ? `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toUpperCase()
        : (email ?? '?').charAt(0).toUpperCase()

    const displayName = firstName
        ? `${firstName} ${lastName ?? ''}`.trim()
        : email ?? ''

    const sizeClass = SIZE_CLASSES[size]
    const ringClass = ring ? 'ring-2 ring-white dark:ring-zinc-800' : ''
    const gradient = hashColor(userId || email || firstName || '?')

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={displayName}
                title={displayName}
                className={`${sizeClass} rounded-full object-cover ${ringClass} ${className}`}
            />
        )
    }

    return (
        <div
            title={displayName}
            className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient}
                        flex items-center justify-center text-white font-semibold
                        ${ringClass} ${className}`}
        >
            {initials}
        </div>
    )
}

export function getUserDisplayName(
    firstName?: string | null,
    lastName?: string | null,
    email?: string | null
): string {
    if (firstName?.trim()) {
        return `${firstName} ${lastName ?? ''}`.trim()
    }
    return email ?? ''
}
