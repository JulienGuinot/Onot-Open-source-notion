import { useState, useEffect, useRef } from 'react'
import { Hash } from 'lucide-react'

interface NumberCellProps {
    value: number | null
    onChange: (value: number | null) => void
}

export function NumberCell({ value, onChange }: NumberCellProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [localValue, setLocalValue] = useState(value?.toString() || '')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setLocalValue(value?.toString() || '')
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleBlur = () => {
        setIsEditing(false)
        const numValue = localValue === '' ? null : Number(localValue)
        if (numValue !== value && !isNaN(numValue || 0)) {
            onChange(numValue)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur()
        } else if (e.key === 'Escape') {
            setLocalValue(value?.toString() || '')
            setIsEditing(false)
        }
    }

    const formatNumber = (num: number | null) => {
        if (num === null || num === undefined) return null
        // Format with thousands separator
        return num.toLocaleString()
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1.5 bg-transparent outline-none text-sm dark:text-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1.5 min-h-[32px] text-sm cursor-text dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-1.5"
        >
            {value !== null && value !== undefined ? (
                <>
                    <Hash size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="font-mono">{formatNumber(value)}</span>
                </>
            ) : (
                <span className="text-gray-400">Empty</span>
            )}
        </div>
    )
}
