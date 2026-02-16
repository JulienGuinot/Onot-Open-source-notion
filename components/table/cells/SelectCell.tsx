import { useState, useRef, useCallback } from 'react'
import { SelectOption, CellValue } from '@/lib/types'
import { Plus, X, Check, Pencil, Trash2, GripVertical, MoreHorizontal } from 'lucide-react'
import { CellPortal } from '../CellPortal'

interface SelectCellProps {
    value: CellValue
    options: SelectOption[]
    onChange: (value: string | string[] | null) => void
    onAddOption: (option: SelectOption) => void
    onUpdateOption?: (optionId: string, updates: Partial<SelectOption>) => void
    onDeleteOption?: (optionId: string) => void
    onReorderOptions?: (options: SelectOption[]) => void
    multi?: boolean
}

const COLOR_OPTIONS = [
    { name: 'Gray', value: '#6b7280', light: '#f3f4f6' },
    { name: 'Red', value: '#ef4444', light: '#fef2f2' },
    { name: 'Orange', value: '#f97316', light: '#fff7ed' },
    { name: 'Amber', value: '#f59e0b', light: '#fffbeb' },
    { name: 'Yellow', value: '#eab308', light: '#fefce8' },
    { name: 'Lime', value: '#84cc16', light: '#f7fee7' },
    { name: 'Green', value: '#22c55e', light: '#f0fdf4' },
    { name: 'Emerald', value: '#10b981', light: '#ecfdf5' },
    { name: 'Teal', value: '#14b8a6', light: '#f0fdfa' },
    { name: 'Cyan', value: '#06b6d4', light: '#ecfeff' },
    { name: 'Blue', value: '#3b82f6', light: '#eff6ff' },
    { name: 'Indigo', value: '#6366f1', light: '#eef2ff' },
    { name: 'Purple', value: '#a855f7', light: '#faf5ff' },
    { name: 'Pink', value: '#ec4899', light: '#fdf2f8' },
    { name: 'Rose', value: '#f43f5e', light: '#fff1f2' },
]

export function SelectCell({
    value,
    options,
    onChange,
    onAddOption,
    onUpdateOption,
    onDeleteOption,
    onReorderOptions,
    multi = false
}: SelectCellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [newOptionName, setNewOptionName] = useState('')
    const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[4]?.value ?? '#eab308')
    const [editingOption, setEditingOption] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
    const [draggedOption, setDraggedOption] = useState<string | null>(null)
    const triggerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selectedValues = multi
        ? Array.isArray(value) ? value : []
        : value ? [value as string] : []

    const handleToggleOption = useCallback((optionId: string) => {
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
            setSearchQuery('')
        }
    }, [multi, selectedValues, onChange])

    const handleAddOption = useCallback(() => {
        const name = newOptionName.trim() || searchQuery.trim()
        if (name) {
            const newOption: SelectOption = {
                id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                label: name,
                color: selectedColor,
            }
            onAddOption(newOption)
            setNewOptionName('')
            setSearchQuery('')
            handleToggleOption(newOption.id)
        }
    }, [newOptionName, searchQuery, selectedColor, onAddOption, handleToggleOption])

    const handleStartEdit = (opt: SelectOption, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingOption(opt.id)
        setEditingName(opt.label)
    }

    const handleSaveEdit = (optionId: string) => {
        if (editingName.trim() && onUpdateOption) {
            onUpdateOption(optionId, { label: editingName.trim() })
        }
        setEditingOption(null)
        setEditingName('')
    }

    const handleDeleteOption = (optionId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (onDeleteOption) {
            onDeleteOption(optionId)
            // Remove from selected values
            if (selectedValues.includes(optionId)) {
                if (multi) {
                    onChange(selectedValues.filter(id => id !== optionId))
                } else {
                    onChange(null)
                }
            }
        }
    }

    const handleColorChange = (optionId: string, color: string) => {
        if (onUpdateOption) {
            onUpdateOption(optionId, { color })
        }
        setShowColorPicker(null)
    }

    const handleDragStart = (optionId: string) => {
        setDraggedOption(optionId)
    }

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggedOption || draggedOption === targetId || !onReorderOptions) return

        const dragIndex = options.findIndex(o => o.id === draggedOption)
        const targetIndex = options.findIndex(o => o.id === targetId)

        if (dragIndex !== -1 && targetIndex !== -1) {
            const newOptions = [...options]
            const [removed] = newOptions.splice(dragIndex, 1)
            if (removed) {
                newOptions.splice(targetIndex, 0, removed)
                onReorderOptions(newOptions)
            }
        }
    }

    const handleDragEnd = () => {
        setDraggedOption(null)
    }

    const getSelectedOptions = () => {
        return options.filter((opt) => selectedValues.includes(opt.id))
    }

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const showCreateOption = searchQuery.trim() &&
        !options.some(opt => opt.label.toLowerCase() === searchQuery.toLowerCase())

    return (
        <div className="relative w-full h-full">
            <div
                ref={triggerRef}
                onClick={() => {
                    setIsOpen(!isOpen)
                    setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="px-2 py-1.5 min-h-[32px] cursor-pointer flex items-center gap-1 flex-wrap hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                {getSelectedOptions().length > 0 ? (
                    getSelectedOptions().map((opt) => (
                        <span
                            key={opt.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-transform hover:scale-105 text-zinc-200 dark:text-zinc-800"
                            style={{
                                backgroundColor: opt.color,
                            }}
                        >
                            {opt.label}
                            {multi && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleOption(opt.id)
                                    }}
                                    className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </span>
                    ))
                ) : (
                    <span className="text-gray-400 text-sm">
                        {multi ? 'Select options...' : 'Select...'}
                    </span>
                )}
            </div>

            {isOpen && (
                <CellPortal
                    triggerRef={triggerRef}
                    onClose={() => {
                        setIsOpen(false)
                        setSearchQuery('')
                        setEditingOption(null)
                        setShowColorPicker(null)
                    }}
                    minWidth={300}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header with count */}
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    {multi ? 'Multi-select' : 'Select'}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {options.length} option{options.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Search input */}
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && showCreateOption) {
                                        e.preventDefault()
                                        handleAddOption()
                                    }
                                }}
                                placeholder="Search or create option..."
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Options list */}
                        <div className="max-h-[280px] overflow-y-auto p-1">
                            {filteredOptions.length === 0 && !showCreateOption && (
                                <div className="px-3 py-6 text-center">
                                    <div className="text-gray-400 text-sm mb-2">No options available</div>
                                    <div className="text-gray-400 text-xs">Type to create a new option</div>
                                </div>
                            )}

                            {filteredOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    draggable={!!onReorderOptions}
                                    onDragStart={() => handleDragStart(opt.id)}
                                    onDragOver={(e) => handleDragOver(e, opt.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${draggedOption === opt.id ? 'opacity-50' : ''
                                        }`}
                                    onClick={() => editingOption !== opt.id && handleToggleOption(opt.id)}
                                >
                                    {/* Drag handle */}
                                    {onReorderOptions && (
                                        <GripVertical
                                            size={14}
                                            className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity"
                                        />
                                    )}

                                    {/* Checkbox for multi-select */}
                                    {multi && (
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedValues.includes(opt.id)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {selectedValues.includes(opt.id) && (
                                                <Check size={10} className="text-white" />
                                            )}
                                        </div>
                                    )}

                                    {/* Option tag */}
                                    {editingOption === opt.id ? (
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={() => handleSaveEdit(opt.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit(opt.id)
                                                if (e.key === 'Escape') setEditingOption(null)
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded-lg outline-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="px-2.5 py-1 rounded-md text-xs font-medium truncate max-w-[160px] text-zinc-200 dark:text-zinc-800 "
                                            style={{
                                                backgroundColor: opt.color,
                                            }}
                                        >
                                            {opt.label}
                                        </span>
                                    )}

                                    {/* Spacer */}
                                    <div className="flex-1" />

                                    {/* Selected indicator (single select) */}
                                    {!multi && selectedValues.includes(opt.id) && (
                                        <Check size={14} className="text-blue-500 flex-shrink-0" />
                                    )}

                                    {/* Action buttons - always visible but subtle */}
                                    <div className="flex items-center gap-1 ml-1">
                                        {/* Color picker button */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowColorPicker(showColorPicker === opt.id ? null : opt.id)
                                                    setEditingOption(null)
                                                }}
                                                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-60 hover:opacity-100"
                                                title="Change color"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/10"
                                                    style={{ backgroundColor: opt.color }}
                                                />
                                            </button>

                                            {/* Color picker dropdown */}
                                            {showColorPicker === opt.id && (
                                                <div
                                                    className="absolute right-0 top-full mt-1 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {COLOR_OPTIONS.map((color) => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => handleColorChange(opt.id, color.value)}
                                                                className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${opt.color === color.value
                                                                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110'
                                                                    : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'
                                                                    }`}
                                                                style={{ backgroundColor: color.value }}
                                                                title={color.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Edit button */}
                                        {onUpdateOption && (
                                            <button
                                                onClick={(e) => {
                                                    handleStartEdit(opt, e)
                                                    setShowColorPicker(null)
                                                }}
                                                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-60 hover:opacity-100"
                                                title="Rename option"
                                            >
                                                <Pencil size={12} className="text-gray-500" />
                                            </button>
                                        )}

                                        {/* Delete button */}
                                        {onDeleteOption && (
                                            <button
                                                onClick={(e) => handleDeleteOption(opt.id, e)}
                                                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-60 hover:opacity-100"
                                                title="Delete option"
                                            >
                                                <Trash2 size={12} className="text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Create new option from search */}
                            {showCreateOption && (
                                <button
                                    onClick={handleAddOption}
                                    className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors border border-dashed border-blue-200 dark:border-blue-800 mt-1"
                                >
                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                        <Plus size={14} className="text-blue-600" />
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Create <span className="font-semibold text-blue-600 dark:text-blue-400">"{searchQuery}"</span>
                                    </span>
                                    <span
                                        className="ml-auto w-4 h-4 rounded-full ring-1 ring-black/10"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                </button>
                            )}
                        </div>

                        {/* New option creator - always visible */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newOptionName}
                                    onChange={(e) => setNewOptionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newOptionName.trim()) {
                                            e.preventDefault()
                                            handleAddOption()
                                        }
                                    }}
                                    placeholder="New option name..."
                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-1.5">
                                    {COLOR_OPTIONS.slice(0, 6).map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setSelectedColor(color.value)}
                                            className={`w-5 h-5 rounded-full transition-all ${selectedColor === color.value
                                                ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                                                : 'hover:scale-110'
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                    <MoreHorizontal size={14} className="text-gray-400 mx-0.5" />
                                </div>
                            </div>
                            {newOptionName.trim() && (
                                <button
                                    onClick={handleAddOption}
                                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                                >
                                    <Plus size={14} />
                                    Add "{newOptionName}"
                                </button>
                            )}
                        </div>
                    </div>
                </CellPortal>
            )}
        </div>
    )
}
