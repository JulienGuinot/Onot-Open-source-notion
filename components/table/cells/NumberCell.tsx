import { useState, useEffect, useRef } from 'react'

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
        }
    }, [isEditing])

    const handleBlur = () => {
        setIsEditing(false)
        const numValue = localValue === '' ? null : Number(localValue)
        if (numValue !== value) {
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

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
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
            {value !== null && value !== undefined ? value : <span className="text-gray-400">Empty</span>}
        </div>
    )
}
