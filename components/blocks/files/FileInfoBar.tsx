import { formatFileSize } from "@/hooks/useSupabaseUpload";
import { File } from "lucide-react"
// ─── File info bar ────────────────────────────────────────────

export function FileInfoBar({ name, size, mime, url }: { name?: string; size?: number; mime?: string; url: string }) {
    const ext = mime?.split('/').pop()?.toUpperCase()
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 no-underline hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <File size={16} className="text-gray-400 flex-shrink-0" />
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{name || 'File'}</span>
            <span className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {size != null && <span>{formatFileSize(size)}</span>}
                {ext && (
                    <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
                        <span>{ext}</span>
                    </>
                )}
            </span>
        </a>
    )
}