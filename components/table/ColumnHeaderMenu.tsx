import { useState } from "react";
import { ColumnType, TableColumn } from "@/lib/types";
import { getColumnIcon } from "./utils";
import {
    Trash2, Copy, EyeOff, ArrowLeft, ArrowRight,
    ArrowUp, ArrowDown, WrapText, AlignLeft
} from "lucide-react";

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
}: {
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
}) {
    const [name, setName] = useState(column.name);

    const columnTypes: { type: ColumnType; label: string }[] = [
        { type: 'text', label: 'Text' },
        { type: 'number', label: 'Number' },
        { type: 'select', label: 'Select' },
        { type: 'multi-select', label: 'Multi-Select' },
        { type: 'date', label: 'Date' },
        { type: 'checkbox', label: 'Checkbox' },
        { type: 'url', label: 'URL' },
    ];

    return (
        <div
            className="bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-64 menu-animate"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Column name input */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => onRename(name)}
                    onKeyDown={(e) => e.key === 'Enter' && onRename(name)}
                    className="w-full text-sm font-medium outline-none bg-transparent
                       px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600
                       dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400"
                    autoFocus
                />
            </div>

            {/* Quick actions */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => onSort(currentSort === 'asc' ? null : 'asc')}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${currentSort === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ArrowUp size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Sort ascending</span>
                </button>
                <button
                    onClick={() => onSort(currentSort === 'desc' ? null : 'desc')}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${currentSort === 'desc' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ArrowDown size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Sort descending</span>
                </button>
            </div>

            {/* Insert & duplicate actions */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={onInsertLeft}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowLeft size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert left</span>
                </button>
                <button
                    onClick={onInsertRight}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowRight size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Insert right</span>
                </button>
                <button
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <Copy size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Duplicate column</span>
                </button>
            </div>

            {/* Property type */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wide">
                    Property Type
                </div>
                {columnTypes.map(({ type, label }) => {
                    const Icon = getColumnIcon(type);
                    return (
                        <button
                            key={type}
                            onClick={() => onChangeType(type)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${column.type === type ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        >
                            <Icon size={14} className="text-gray-500" />
                            <span className="dark:text-gray-300">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Display options */}
            <div className="p-1 border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={onToggleWrap}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700
                           ${column.wrap ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    {column.wrap ? <WrapText size={14} className="text-gray-500" /> : <AlignLeft size={14} className="text-gray-500" />}
                    <span className="dark:text-gray-300">{column.wrap ? 'Wrap text' : 'Truncate text'}</span>
                </button>
                <button
                    onClick={onHide}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <EyeOff size={14} className="text-gray-500" />
                    <span className="dark:text-gray-300">Hide column</span>
                </button>
            </div>

            {/* Delete */}
            <div className="p-1">
                <button
                    onClick={onDelete}
                    disabled={!canDelete}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                       text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                       disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Trash2 size={14} />
                    <span>Delete property</span>
                </button>
            </div>
        </div>
    );
}
