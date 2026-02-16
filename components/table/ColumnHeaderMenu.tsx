import { useState } from "react";
import { ColumnType, TableColumn } from "@/lib/types";
import { getColumnIcon } from "./utils";
import { Trash2 } from "lucide-react";

export function ColumnHeaderMenu({
    column,
    onRename,
    onChangeType,
    onDelete,
    // onClose is handled by the parent/portal
}: {
    column: TableColumn;
    onRename: (name: string) => void;
    onChangeType: (type: ColumnType) => void;
    onDelete: () => void;
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
                   border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-60"
        >
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => onRename(name)}
                    onKeyDown={(e) => e.key === 'Enter' && onRename(name)}
                    className="w-full text-sm font-medium outline-none bg-transparent
                       px-2 py-1 rounded border border-gray-200 dark:border-gray-600
                       dark:text-gray-200"
                    autoFocus
                />
            </div>

            <div className="p-1">
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

            <div className="p-1 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                       text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <Trash2 size={14} />
                    <span>Delete property</span>
                </button>
            </div>
        </div>
    );
}
