import { useState, useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'

interface UrlCellProps {
    value: string | null
    onChange: (value: string) => void
}

export function UrlCell({ value, onChange }: UrlCellProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [localValue, setLocalValue] = useState(value || '')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setLocalValue(value || '')
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    const handleBlur = () => {
        setIsEditing(false)
        if (localValue !== (value || '')) {
            onChange(localValue)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur()
        } else if (e.key === 'Escape') {
            setLocalValue(value || '')
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="url"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="https://..."
                className="w-full px-2 py-1 bg-transparent outline-none text-sm dark:text-gray-200"
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1 min-h-[28px] text-sm cursor-text flex items-center gap-1"
        >
            {value ? (
                <>
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 truncate"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="truncate">{value}</span>
                        <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                </>
            ) : (
                <span className="text-gray-400">Empty</span>
            )}
        </div>
    )
}
