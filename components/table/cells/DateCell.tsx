import { useState, useEffect, useRef } from 'react'

interface DateCellProps {
    value: string | null
    onChange: (value: string) => void
}

export function DateCell({ value, onChange }: DateCellProps) {
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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })
        } catch {
            return dateStr
        }
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="date"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 bg-transparent outline-none text-sm dark:text-gray-200"
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1 min-h-[28px] text-sm cursor-text dark:text-gray-200"
        >
            {value ? formatDate(value) : <span className="text-gray-400">Empty</span>}
        </div>
    )
}
