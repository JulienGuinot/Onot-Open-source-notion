import { SelectOption } from '@/lib/types'

interface OptionBadgeProps {
    option: SelectOption
    variant?: 'solid' | 'outline'
    className?: string
}

export function OptionBadge({ option, variant = 'solid', className = '' }: OptionBadgeProps) {
    if (variant === 'outline') {
        return (
            <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium truncate ${className}`}
                style={{
                    backgroundColor: option.color + '20',
                    color: option.color,
                    border: `1px solid ${option.color}40`,
                }}
            >
                {option.label}
            </span>
        )
    }

    return (
        <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium truncate text-zinc-200 dark:text-zinc-800 ${className}`}
            style={{ backgroundColor: option.color }}
        >
            {option.label}
        </span>
    )
}
