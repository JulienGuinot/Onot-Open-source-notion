import { useState } from "react";
import { ColumnType, SelectOption, TableColumn } from "@/lib/types";
import { getColumnIcon } from "./utils";
import {
    Trash2, Copy, EyeOff, ArrowLeft, ArrowRight,
    ArrowUp, ArrowDown, WrapText, AlignLeft, ChevronRight
} from "lucide-react";
import { OptionsEditor } from "@/components/shared/OptionsEditor";

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

    // ─── Adapter: bridge OptionsEditor per-operation callbacks to onUpdateOptions ───

    const handleAddOption = (option: SelectOption) => {
        onUpdateOptions?.([...(column.options || []), option]);
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

    const handleReorderOptions = (options: SelectOption[]) => {
        onUpdateOptions?.(options);
    };

    // ─── Options Editor Panel ───
    if (showOptionsEditor && isSelectType) {
        return (
            <div
                className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl w-80 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with back button */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowOptionsEditor(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} className="text-gray-500" />
                    </button>
                    <span className="text-sm font-medium dark:text-gray-200">Edit options</span>
                </div>

                {/* Shared OptionsEditor component */}
                <OptionsEditor
                    options={column.options || []}
                    onAddOption={handleAddOption}
                    onUpdateOption={handleUpdateOption}
                    onDeleteOption={handleDeleteOption}
                    onReorderOptions={handleReorderOptions}
                />
            </div>
        );
    }

    // ─── Type selection submenu ───
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

    // ─── Main menu ───
    return (
        <div
            className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl w-72 overflow-hidden"
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
            <div className="p-1 border-b border-gray-100 dark:border-zinc-700">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSort(currentSort === 'asc' ? null : 'asc')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-zinc-700
                           ${currentSort === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ArrowUp size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Sort ascending</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSort(currentSort === 'desc' ? null : 'desc')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-zinc-700
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
                           hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <ArrowLeft size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert left</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onInsertRight}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <ArrowRight size={16} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert right</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
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
                           hover:bg-gray-100 dark:hover:bg-zinc-700
                           ${column.wrap ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    {column.wrap ? <WrapText size={16} className="text-gray-500" /> : <AlignLeft size={16} className="text-gray-500" />}
                    <span className="dark:text-gray-300">{column.wrap ? 'Wrap text' : 'Truncate text'}</span>
                </button>
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onHide}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
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
