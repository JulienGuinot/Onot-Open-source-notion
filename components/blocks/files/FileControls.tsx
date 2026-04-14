// ─── Hover controls ───────────────────────────────────────────

import { Download, X } from "lucide-react";

export function FileControls({ url, name, onRemove }: { url: string; name?: string; onRemove: () => void }) {
    return (
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover/file:opacity-100 transition-opacity z-10">
            <a href={url} download={name} onClick={e => e.stopPropagation()}
                className="p-2 sm:p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                title="Download">
                <Download size={14} className="text-gray-500 dark:text-gray-400" />
            </a>
            <button onClick={onRemove}
                className="p-2 sm:p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                title="Remove">
                <X size={14} className="text-gray-500 hover:text-red-500" />
            </button>
        </div>
    )
}
