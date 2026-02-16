import { useState, useEffect, useRef } from 'react'
import { ExternalLink, Link } from 'lucide-react'

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
            inputRef.current.select()
        }
    }, [isEditing])

    const handleBlur = () => {
        setIsEditing(false)
        let finalValue = localValue.trim()
        // Auto-add https:// if missing
        if (finalValue && !finalValue.match(/^https?:\/\//)) {
            finalValue = 'https://' + finalValue
        }
        if (finalValue !== (value || '')) {
            onChange(finalValue)
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

    const getDisplayUrl = (url: string) => {
        try {
            const parsed = new URL(url)
            return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
        } catch {
            return url
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
                className="w-full px-2 py-1.5 bg-transparent outline-none text-sm dark:text-gray-200"
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1.5 min-h-[32px] text-sm cursor-text flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
            {value ? (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 truncate group"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Link size={12} className="flex-shrink-0 text-blue-400" />
                    <span className="truncate underline-offset-2 group-hover:underline">{getDisplayUrl(value)}</span>
                    <ExternalLink size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            ) : (
                <span className="text-gray-400 flex items-center gap-1.5">
                    <Link size={12} />
                    Add URL
                </span>
            )}
        </div>
    )
}
