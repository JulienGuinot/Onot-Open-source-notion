import { useState } from 'react'
import { SelectOption } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { DEFAULT_OPTION_COLOR } from '@/lib/constants'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { SelectColorGrid } from './SelectColorGrid'
import { OptionBadge } from './OptionBadge'

// ─── Types ───────────────────────────────────────────────────

interface OptionsEditorProps {
    options: SelectOption[]
    onAddOption: (option: SelectOption) => void
    onUpdateOption?: (optionId: string, updates: Partial<SelectOption>) => void
    onDeleteOption?: (optionId: string) => void
    onReorderOptions?: (options: SelectOption[]) => void
    /** 'solid' badges like in SelectCell, 'outline' badges like in ColumnHeaderMenu */
    badgeVariant?: 'solid' | 'outline'
}

// ─── Component ───────────────────────────────────────────────

export function OptionsEditor({
    options,
    onAddOption,
    onUpdateOption,
    onDeleteOption,
    onReorderOptions,
    badgeVariant = 'solid',
}: OptionsEditorProps) {
    const [newOptionName, setNewOptionName] = useState('')
    const [newOptionColor, setNewOptionColor] = useState<string>(DEFAULT_OPTION_COLOR)
    const [showNewColorPicker, setShowNewColorPicker] = useState(false)
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [colorPickerOptionId, setColorPickerOptionId] = useState<string | null>(null)
    const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null)

    // ─── Handlers ────────────────────────────────────────────

    const handleAddOption = () => {
        if (!newOptionName.trim()) return
        const newOption: SelectOption = {
            id: generateId('opt'),
            label: newOptionName.trim(),
            color: newOptionColor,
        }
        onAddOption(newOption)
        setNewOptionName('')
    }

    const handleSaveEdit = (optionId: string) => {
        if (editingName.trim() && onUpdateOption) {
            onUpdateOption(optionId, { label: editingName.trim() })
        }
        setEditingOptionId(null)
        setEditingName('')
    }

    const handleStartEdit = (opt: SelectOption) => {
        setEditingOptionId(opt.id)
        setEditingName(opt.label)
        setColorPickerOptionId(null)
    }

    const handleColorChange = (optionId: string, color: string) => {
        onUpdateOption?.(optionId, { color })
        setColorPickerOptionId(null)
    }

    // ─── Drag & Drop ─────────────────────────────────────────

    const handleDragStart = (optionId: string) => setDraggedOptionId(optionId)
    const handleDragEnd = () => setDraggedOptionId(null)

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggedOptionId || draggedOptionId === targetId || !onReorderOptions) return
        const dragIndex = options.findIndex(o => o.id === draggedOptionId)
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

    // ─── Render ──────────────────────────────────────────────

    return (
        <div>
            {/* Options list */}
            <div className="max-h-[280px] overflow-y-auto p-1">
                {options.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        No options yet. Add one below.
                    </div>
                )}

                {options.map((opt) => (
                    <div key={opt.id}>
                        <div
                            draggable={!!onReorderOptions}
                            onDragStart={() => handleDragStart(opt.id)}
                            onDragOver={(e) => handleDragOver(e, opt.id)}
                            onDragEnd={handleDragEnd}
                            className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${draggedOptionId === opt.id ? 'opacity-50' : ''}`}
                        >
                            {onReorderOptions && (
                                <GripVertical
                                    size={14}
                                    className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity"
                                />
                            )}

                            {editingOptionId === opt.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => handleSaveEdit(opt.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(opt.id)
                                        if (e.key === 'Escape') {
                                            setEditingOptionId(null)
                                            setEditingName('')
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded-lg outline-none"
                                    autoFocus
                                />
                            ) : (
                                <OptionBadge
                                    option={opt}
                                    variant={badgeVariant}
                                    className="max-w-[160px]"
                                />
                            )}

                            <div className="flex-1" />

                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setColorPickerOptionId(colorPickerOptionId === opt.id ? null : opt.id)
                                        setEditingOptionId(null)
                                    }}
                                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                    title="Change color"
                                >
                                    <div
                                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-black/10"
                                        style={{ backgroundColor: opt.color }}
                                    />
                                </button>

                                {onUpdateOption && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleStartEdit(opt)
                                        }}
                                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                        title="Rename option"
                                    >
                                        <Pencil size={12} className="text-gray-500" />
                                    </button>
                                )}

                                {onDeleteOption && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteOption(opt.id)
                                        }}
                                        className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        title="Delete option"
                                    >
                                        <Trash2 size={12} className="text-red-500" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Inline color picker */}
                        {colorPickerOptionId === opt.id && (
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
            </div>

            {/* Add new option */}
            <div className="p-3 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 space-y-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewColorPicker(!showNewColorPicker)}
                        className="w-8 h-8 rounded-lg flex-shrink-0 ring-1 ring-black/10 transition-all hover:scale-105 hover:ring-2 hover:ring-blue-400"
                        style={{ backgroundColor: newOptionColor }}
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

                {/* Color grid for new option */}
                {showNewColorPicker && (
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <SelectColorGrid
                            selected={newOptionColor}
                            onChange={(c) => { setNewOptionColor(c); setShowNewColorPicker(false) }}
                        />
                    </div>
                )}

                {newOptionName.trim() && (
                    <button
                        onClick={handleAddOption}
                        style={{ backgroundColor: newOptionColor }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        <Plus size={14} />
                        Add &quot;{newOptionName}&quot;
                    </button>
                )}
            </div>
        </div>
    )
}
