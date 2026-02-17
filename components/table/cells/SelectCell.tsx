import { useState, useRef, useCallback } from 'react'
import { SelectOption, CellValue } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { DEFAULT_OPTION_COLOR } from '@/lib/constants'
import { Plus, X, Check, Pencil, Trash2, GripVertical } from 'lucide-react'
import { CellPortal } from '../CellPortal'
import { SelectColorGrid } from '@/components/shared/SelectColorGrid'
import { OptionBadge } from '@/components/shared/OptionBadge'

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
    const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_OPTION_COLOR)
    const [editingOption, setEditingOption] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
    const [showNewColorPicker, setShowNewColorPicker] = useState(false)
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
                id: generateId('opt'),
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
        setShowColorPicker(null)
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
            if (selectedValues.includes(optionId)) {
                onChange(multi ? selectedValues.filter(id => id !== optionId) : null)
            }
        }
    }

    const handleColorChange = (optionId: string, color: string) => {
        if (onUpdateOption) {
            onUpdateOption(optionId, { color })
        }
        setShowColorPicker(null)
    }

    const handleDragStart = (optionId: string) => setDraggedOption(optionId)
    const handleDragEnd = () => setDraggedOption(null)

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

    const getSelectedOptions = () => options.filter((opt) => selectedValues.includes(opt.id))

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const showCreateOption = searchQuery.trim() &&
        !options.some(opt => opt.label.toLowerCase() === searchQuery.toLowerCase())

    const closeAll = () => {
        setIsOpen(false)
        setSearchQuery('')
        setEditingOption(null)
        setShowColorPicker(null)
        setShowNewColorPicker(false)
    }

    return (
        <div className="relative w-full h-full">
            <div
                ref={triggerRef}
                onClick={() => {
                    setIsOpen(!isOpen)
                    setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="px-2 py-1.5 min-h-[32px] cursor-pointer flex items-center gap-1 flex-wrap hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                {getSelectedOptions().length > 0 ? (
                    getSelectedOptions().map((opt) => (
                        <span
                            key={opt.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-transform hover:scale-105 text-zinc-200 dark:text-zinc-800"
                            style={{ backgroundColor: opt.color }}
                        >
                            {opt.label}
                            {multi && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleOption(opt.id) }}
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
                <CellPortal triggerRef={triggerRef} onClose={closeAll} minWidth={300}>
                    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">

                        {/* Header */}
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                    {multi ? 'Multi-select' : 'Select'}
                                </span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {options.length} option{options.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
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
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Options list */}
                        <div className="max-h-[280px] overflow-y-auto p-1">
                            {filteredOptions.length === 0 && !showCreateOption && (
                                <div className="px-3 py-6 text-center">
                                    <div className="text-gray-400 text-sm mb-1">No options available</div>
                                    <div className="text-gray-400 text-xs">Type to create a new option</div>
                                </div>
                            )}

                            {filteredOptions.map((opt) => (
                                <div key={opt.id}>
                                    <div
                                        draggable={!!onReorderOptions}
                                        onDragStart={() => handleDragStart(opt.id)}
                                        onDragOver={(e) => handleDragOver(e, opt.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${draggedOption === opt.id ? 'opacity-50' : ''}`}
                                        onClick={() => editingOption !== opt.id && handleToggleOption(opt.id)}
                                    >
                                        {onReorderOptions && (
                                            <GripVertical size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
                                        )}

                                        {multi && (
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedValues.includes(opt.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {selectedValues.includes(opt.id) && <Check size={10} className="text-white" />}
                                            </div>
                                        )}

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
                                            <OptionBadge option={opt} className="max-w-[160px]" />
                                        )}

                                        <div className="flex-1" />

                                        {!multi && selectedValues.includes(opt.id) && (
                                            <Check size={14} className="text-blue-500 flex-shrink-0" />
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowColorPicker(showColorPicker === opt.id ? null : opt.id)
                                                    setEditingOption(null)
                                                }}
                                                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                                title="Change color"
                                            >
                                                <div className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-black/10" style={{ backgroundColor: opt.color }} />
                                            </button>

                                            {onUpdateOption && (
                                                <button
                                                    onClick={(e) => { handleStartEdit(opt, e); setShowColorPicker(null) }}
                                                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title="Rename option"
                                                >
                                                    <Pencil size={12} className="text-gray-500" />
                                                </button>
                                            )}

                                            {onDeleteOption && (
                                                <button
                                                    onClick={(e) => handleDeleteOption(opt.id, e)}
                                                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                    title="Delete option"
                                                >
                                                    <Trash2 size={12} className="text-red-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline color picker */}
                                    {showColorPicker === opt.id && (
                                        <div
                                            className="mx-2 mb-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/60"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <SelectColorGrid
                                                selected={opt.color}
                                                onChange={(color) => handleColorChange(opt.id, color)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Create from search */}
                            {showCreateOption && (
                                <button
                                    onClick={handleAddOption}
                                    style={{ borderColor: selectedColor }}
                                    className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-yellow-900/20 text-left transition-colors border border-dashed mt-1"
                                >
                                    <div style={{ backgroundColor: selectedColor }} className="w-4 h-4 rounded-full flex items-center justify-center">
                                        <Plus size={10} className="text-white" />
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Create <span style={{ color: selectedColor }} className="font-semibold">&quot;{searchQuery}&quot;</span>
                                    </span>
                                    <div className="ml-auto w-4 h-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: selectedColor }} />
                                </button>
                            )}
                        </div>

                        {/* New option creator */}
                        <div className="p-3 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 space-y-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowNewColorPicker(!showNewColorPicker)}
                                    className="w-8 h-8 rounded-lg flex-shrink-0 ring-1 ring-black/10 transition-all hover:scale-105 hover:ring-2 hover:ring-blue-400"
                                    style={{ backgroundColor: selectedColor }}
                                    title="Pick color"
                                />
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
                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            {showNewColorPicker && (
                                <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                                    <SelectColorGrid
                                        selected={selectedColor}
                                        onChange={(c) => { setSelectedColor(c); setShowNewColorPicker(false) }}
                                    />
                                </div>
                            )}

                            {newOptionName.trim() && (
                                <button
                                    onClick={handleAddOption}
                                    style={{ backgroundColor: selectedColor }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white rounded-lg transition-colors font-medium shadow-sm"
                                >
                                    <Plus size={14} />
                                    Add &quot;{newOptionName}&quot;
                                </button>
                            )}
                        </div>
                    </div>
                </CellPortal>
            )}
        </div>
    )
}
