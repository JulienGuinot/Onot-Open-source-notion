import { useState, useRef, useEffect } from 'react'
import { SelectOption, CellValue } from '@/lib/types'
import { Plus, X } from 'lucide-react'

interface SelectCellProps {
    value: CellValue
    options: SelectOption[]
    onChange: (value: string | string[] | null) => void
    onAddOption: (option: SelectOption) => void
    multi?: boolean
}

const COLOR_OPTIONS = [
    { name: 'Gray', value: '#9ca3af' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
]

export function SelectCell({ value, options, onChange, onAddOption, multi = false }: SelectCellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [newOptionName, setNewOptionName] = useState('')
    const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]?.value ?? '#6b7280')
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedValues = multi
        ? Array.isArray(value) ? value : []
        : value ? [value as string] : []

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setNewOptionName('')
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleToggleOption = (optionId: string) => {
        if (multi) {
            const current = selectedValues
            if (current.includes(optionId)) {
                onChange(current.filter((id) => id !== optionId))
            } else {
                onChange([...current, optionId])
            }
        } else {
            onChange(optionId)
            setIsOpen(false)
        }
    }

    const handleAddOption = () => {
        if (newOptionName.trim()) {
            const newOption: SelectOption = {
                id: `opt-${Date.now()}`,
                label: newOptionName.trim(),
                color: selectedColor,
            }
            onAddOption(newOption)
            setNewOptionName('')
            handleToggleOption(newOption.id)
        }
    }

    const getSelectedOptions = () => {
        return options.filter((opt) => selectedValues.includes(opt.id))
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="px-2 py-1 min-h-[28px] cursor-pointer flex items-center gap-1 flex-wrap"
            >
                {getSelectedOptions().length > 0 ? (
                    getSelectedOptions().map((opt) => (
                        <span
                            key={opt.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: opt.color }}
                        >
                            {opt.label}
                            {multi && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleOption(opt.id)
                                    }}
                                    className="hover:bg-black/20 rounded"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))
                ) : (
                    <span className="text-gray-400 text-sm">Select...</span>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-2 max-h-64 overflow-y-auto">
                        {options.map((opt) => (
                            <div
                                key={opt.id}
                                onClick={() => handleToggleOption(opt.id)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            >
                                {multi && (
                                    <input
                                        type="checkbox"
                                        checked={selectedValues.includes(opt.id)}
                                        onChange={() => { }}
                                        className="w-4 h-4"
                                    />
                                )}
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-medium text-white flex-1"
                                    style={{ backgroundColor: opt.color }}
                                >
                                    {opt.label}
                                </span>
                            </div>
                        ))}

                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <input
                                type="text"
                                value={newOptionName}
                                onChange={(e) => setNewOptionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddOption()
                                    }
                                }}
                                placeholder="New option..."
                                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded outline-none dark:text-gray-200"
                            />
                            <div className="flex items-center gap-1 mt-2">
                                {COLOR_OPTIONS.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => setSelectedColor(color.value)}
                                        className={`w-5 h-5 rounded ${selectedColor === color.value ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                                            }`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleAddOption}
                                disabled={!newOptionName.trim()}
                                className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={14} />
                                Add option
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
