'use client'

import { FolderPlus, Trash2, Copy, Link, Edit } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function PageContextMenu({
    x,
    y,
    onClose,
    onAddSubPage,
    onDelete,
    onDuplicate,
    onCopyLink,
    onRename,
}: {
    x: number
    y: number
    onClose: () => void
    onAddSubPage: () => void
    onDelete: () => void
    onDuplicate?: () => void
    onCopyLink?: () => void
    onRename?: () => void
}) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 0)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [onClose])

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 
                 rounded-lg shadow-xl z-50 py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
        >
            {onRename && (
                <button
                    onClick={() => {
                        onRename()
                        onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-zinc-700 text-left transition-colors"
                >
                    <Edit size={16} />
                    <span>Rename</span>
                </button>
            )}

            <button
                onClick={() => {
                    onAddSubPage()
                    onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-zinc-700 text-left transition-colors"
            >
                <FolderPlus size={16} />
                <span>Add sub-page</span>
            </button>

            {onDuplicate && (
                <button
                    onClick={() => {
                        onDuplicate()
                        onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-zinc-700 text-left transition-colors"
                >
                    <Copy size={16} />
                    <span>Duplicate</span>
                </button>
            )}

            {onCopyLink && (
                <button
                    onClick={() => {
                        onCopyLink()
                        onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-zinc-700 text-left transition-colors"
                >
                    <Link size={16} />
                    <span>Copy link</span>
                </button>
            )}

            <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />

            <button
                onClick={() => {
                    onDelete()
                    onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400
                   hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors"
            >
                <Trash2 size={16} />
                <span>Delete page</span>
            </button>
        </div>
    )
}

