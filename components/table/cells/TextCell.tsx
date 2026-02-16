import { useState, useEffect, useRef } from 'react'

interface TextCellProps {
    value: string | null
    onChange: (value: string) => void
}

export function TextCell({ value, onChange }: TextCellProps) {
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
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1.5 bg-transparent outline-none text-sm dark:text-gray-200"
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1.5 min-h-[32px] text-sm cursor-text dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
            {value || <span className="text-gray-400">Empty</span>}
        </div>
    )
}
