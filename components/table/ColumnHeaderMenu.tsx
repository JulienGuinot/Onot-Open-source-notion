import { useState } from "react";
import { ColumnType, SelectOption, TableColumn } from "@/lib/types";
import { getColumnIcon } from "./utils";
import {
    Trash2, Copy, EyeOff, ArrowLeft, ArrowRight,
    ArrowUp, ArrowDown, WrapText, AlignLeft, Plus, X, GripVertical, Pencil, ChevronRight
} from "lucide-react";

const COLOR_OPTIONS = [
    { name: 'Gray', value: '#6b7280' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
];

interface ColumnHeaderMenuProps {
    column: TableColumn;
    onRename: (name: string) => void;
    onChangeType: (type: ColumnType) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onHide: () => void;
    onInsertLeft: () => void;
    onInsertRight: () => void;
    onSort: (direction: 'asc' | 'desc' | null) => void;
    onToggleWrap: () => void;
    currentSort: 'asc' | 'desc' | null;
    canDelete: boolean;
    onClose: () => void;
    onUpdateOptions?: (options: SelectOption[]) => void;
}

export function ColumnHeaderMenu({
    column,
    onRename,
    onChangeType,
    onDelete,
    onDuplicate,
    onHide,
    onInsertLeft,
    onInsertRight,
    onSort,
    onToggleWrap,
    currentSort,
    canDelete,
    onClose,
    onUpdateOptions,
}: ColumnHeaderMenuProps) {
    const [name, setName] = useState(column.name);
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showOptionsEditor, setShowOptionsEditor] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionColor, setNewOptionColor] = useState(COLOR_OPTIONS[4]?.value ?? '#eab308');
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editingOptionName, setEditingOptionName] = useState('');
    const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
    const [colorPickerOptionId, setColorPickerOptionId] = useState<string | null>(null);
    const [showNewOptionColorPicker, setShowNewOptionColorPicker] = useState(false);

    const isSelectType = column.type === 'select' || column.type === 'multi-select';

    const columnTypes: { type: ColumnType; label: string; description: string }[] = [
        { type: 'text', label: 'Text', description: 'Plain text content' },
        { type: 'number', label: 'Number', description: 'Numeric values' },
        { type: 'select', label: 'Select', description: 'Single choice from options' },
        { type: 'multi-select', label: 'Multi-Select', description: 'Multiple choices from options' },
        { type: 'date', label: 'Date', description: 'Date picker' },
        { type: 'checkbox', label: 'Checkbox', description: 'True/false toggle' },
        { type: 'url', label: 'URL', description: 'Web links' },
    ];

    const handleAddOption = () => {
        if (!newOptionName.trim() || !onUpdateOptions) return;

        const newOption: SelectOption = {
            id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label: newOptionName.trim(),
            color: newOptionColor,
        };

        onUpdateOptions([...(column.options || []), newOption]);
        setNewOptionName('');
    };

    const handleUpdateOption = (optionId: string, updates: Partial<SelectOption>) => {
        if (!onUpdateOptions) return;
        const newOptions = (column.options || []).map(opt =>
            opt.id === optionId ? { ...opt, ...updates } : opt
        );
        onUpdateOptions(newOptions);
    };

    const handleDeleteOption = (optionId: string) => {
        if (!onUpdateOptions) return;
        onUpdateOptions((column.options || []).filter(opt => opt.id !== optionId));
    };

    const handleDragStart = (optionId: string) => {
        setDraggedOptionId(optionId);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedOptionId || draggedOptionId === targetId || !onUpdateOptions) return;

        const options = column.options || [];
        const dragIndex = options.findIndex(o => o.id === draggedOptionId);
        const targetIndex = options.findIndex(o => o.id === targetId);

        if (dragIndex !== -1 && targetIndex !== -1) {
            const newOptions = [...options];
            const [removed] = newOptions.splice(dragIndex, 1);
            if (removed) {
                newOptions.splice(targetIndex, 0, removed);
                onUpdateOptions(newOptions);
            }
        }
    };

    const handleDragEnd = () => {
        setDraggedOptionId(null);
    };

    const handleSaveEditOption = () => {
        if (editingOptionId && editingOptionName.trim()) {
            handleUpdateOption(editingOptionId, { label: editingOptionName.trim() });
        }
        setEditingOptionId(null);
        setEditingOptionName('');
    };

    // Options Editor Panel
    if (showOptionsEditor && isSelectType) {
        return (
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowOptionsEditor(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} className="text-gray-500" />
                    </button>
                    <span className="text-sm font-medium dark:text-gray-200">Edit options</span>
                </div>

                {/* Options list */}
                <div className="max-h-[280px] overflow-y-auto p-2">
                    {(column.options || []).length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            No options yet. Add one below.
                        </div>
                    ) : (
                        (column.options || []).map((opt) => (
                            <div
                                key={opt.id}
                                draggable
                                onDragStart={() => handleDragStart(opt.id)}
                                onDragOver={(e) => handleDragOver(e, opt.id)}
                                onDragEnd={handleDragEnd}
                                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${draggedOptionId === opt.id ? 'opacity-50' : ''
                                    }`}
                            >
                                <GripVertical
                                    size={14}
                                    className="text-gray-300 dark:text-gray-600 cursor-grab flex-shrink-0"
                                />

                                {editingOptionId === opt.id ? (
                                    <input
                                        type="text"
                                        value={editingOptionName}
                                        onChange={(e) => setEditingOptionName(e.target.value)}
                                        onBlur={handleSaveEditOption}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEditOption();
                                            if (e.key === 'Escape') {
                                                setEditingOptionId(null);
                                                setEditingOptionName('');
                                            }
                                        }}
                                        className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded outline-none"
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className="px-2.5 py-1 rounded-full text-xs font-medium flex-1 truncate"
                                        style={{
                                            backgroundColor: opt.color + '20',
                                            color: opt.color,
                                            border: `1px solid ${opt.color}40`
                                        }}
                                    >
                                        {opt.label}
                                    </span>
                                )}

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Color picker */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setColorPickerOptionId(colorPickerOptionId === opt.id ? null : opt.id);
                                            }}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            title="Change color"
                                        >
                                            <div
                                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                                style={{ backgroundColor: opt.color }}
                                            />
                                        </button>
                                        {colorPickerOptionId === opt.id && (
                                            <div
                                                className="absolute right-0 top-full mt-1 z-20"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                                                    <div className="grid grid-cols-5 gap-1.5">
                                                        {COLOR_OPTIONS.map((color) => (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => {
                                                                    handleUpdateOption(opt.id, { color: color.value });
                                                                    setColorPickerOptionId(null);
                                                                }}
                                                                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${opt.color === color.value
                                                                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                                                                    : ''
                                                                    }`}
                                                                style={{ backgroundColor: color.value }}
                                                                title={color.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setEditingOptionId(opt.id);
                                            setEditingOptionName(opt.label);
                                            setColorPickerOptionId(null);
                                        }}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={12} className="text-gray-500" />
                                    </button>

                                    <button
                                        onClick={() => handleDeleteOption(opt.id)}
                                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={12} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add new option */}
                <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newOptionName}
                            onChange={(e) => setNewOptionName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOption();
                                }
                            }}
                            placeholder="New option name..."
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNewOptionColorPicker(!showNewOptionColorPicker);
                                    setColorPickerOptionId(null);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div
                                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: newOptionColor }}
                                />
                            </button>
                            {showNewOptionColorPicker && (
                                <div
                                    className="absolute right-0 bottom-full mb-1 z-20"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {COLOR_OPTIONS.map((color) => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => {
                                                        setNewOptionColor(color.value);
                                                        setShowNewOptionColorPicker(false);
                                                    }}
                                                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${newOptionColor === color.value
                                                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                                                        : ''
                                                        }`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {newOptionName.trim() && (
                        <button
                            onClick={handleAddOption}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                            <Plus size={14} />
                            Add option
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Type selection submenu
    if (showTypeMenu) {
        return (
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-72 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowTypeMenu(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} className="text-gray-500" />
                    </button>
                    <span className="text-sm font-medium dark:text-gray-200">Property type</span>
                </div>

                <div className="p-1 max-h-[320px] overflow-y-auto">
                    {columnTypes.map(({ type, label, description }) => {
                        const Icon = getColumnIcon(type);
                        const isActive = column.type === type;

                        return (
                            <button
                                key={type}
                                onClick={() => {
                                    onChangeType(type);
                                    setShowTypeMenu(false);
                                    onClose();
                                }}
                                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                                    ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <div className={`p-1.5 rounded-lg ${isActive
                                    ? 'bg-blue-100 dark:bg-blue-900/50'
                                    : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'dark:text-gray-200'}`}>
                                        {label}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Main menu
    return (
        <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-72 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Column name input */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => onRename(name)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onRename(name);
                            onClose();
                        }
                    }}
                    className="w-full text-sm font-medium outline-none bg-transparent
                       px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                       dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    autoFocus
                />
            </div>

            {/* Property type selector */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowTypeMenu(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                    {(() => {
                        const Icon = getColumnIcon(column.type);
                        return <Icon size={16} className="text-gray-500" />;
                    })()}
                    <div className="flex-1 text-left">
                        <div className="text-sm dark:text-gray-200">
                            {columnTypes.find(t => t.type === column.type)?.label || 'Text'}
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>

                {/* Edit options button for select types */}
                {isSelectType && (
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowOptionsEditor(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-1">
                            {(column.options || []).slice(0, 3).map((opt, i) => (
                                <div
                                    key={opt.id}
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: opt.color, marginLeft: i > 0 ? -4 : 0 }}
                                />
                            ))}
                            {(column.options?.length || 0) === 0 && (
                                <div className="w-3 h-3 rounded-full bg-gray-300" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm dark:text-gray-200">
                                {(column.options?.length || 0)} options
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                )}
            </div>

            {/* Sort actions */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSort(currentSort === 'asc' ? null : 'asc')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${currentSort === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ArrowUp size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Sort ascending</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSort(currentSort === 'desc' ? null : 'desc')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${currentSort === 'desc' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ArrowDown size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Sort descending</span>
                </button>
            </div>

            {/* Insert & duplicate actions */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onInsertLeft}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert left</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onInsertRight}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowRight size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert right</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Copy size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Duplicate column</span>
                </button>
            </div>

            {/* Display options */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onToggleWrap}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${column.wrap ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    {column.wrap ? <WrapText size={16} className="text-gray-500" /> : <AlignLeft size={16} className="text-gray-500" />}
                    <span className="dark:text-gray-300">{column.wrap ? 'Wrap text' : 'Truncate text'}</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onHide}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <EyeOff size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Hide column</span>
                </button>
            </div>

            {/* Delete */}
            <div className="p-1">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onDelete}
                    disabled={!canDelete}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                       text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Trash2 size={16} />
                    <span>Delete property</span>
                </button>
            </div>
        </div>
    );
}
