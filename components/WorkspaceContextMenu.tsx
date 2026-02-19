'use client'

import { useEffect, useRef, useState } from 'react'
import { Edit, Users, Share2, Trash2, Settings } from 'lucide-react'

interface WorkspaceContextMenuProps {
    x?: number
    y?: number
    workspaceName: string
    isOwner: boolean
    canDelete: boolean
    onClose: () => void
    onRename: (newName: string) => void
    onManageMembers: () => void
    onDelete: () => void
}

export function WorkspaceContextMenu({
    x,
    y,
    workspaceName,
    isOwner,
    canDelete,
    onClose,
    onRename,
    onManageMembers,
    onDelete,
}: WorkspaceContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(workspaceName)
    const inputRef = useRef<HTMLInputElement>(null)

    if (!x && !y) {
        y = 50
    }

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
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

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isRenaming])

    const handleRenameSubmit = () => {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== workspaceName) {
            onRename(trimmed)
        }
        onClose()
    }

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 50,
    }

    return (
        <div
            ref={menuRef}
            className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700
                       rounded-xl shadow-2xl py-1.5 w-64 animate-in fade-in zoom-in-95 duration-100"
            style={menuStyle}
        >
            {isRenaming ? (
                <div className="px-3 py-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Workspace name
                    </label>
                    <input
                        ref={inputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit()
                            if (e.key === 'Escape') onClose()
                        }}
                        onBlur={handleRenameSubmit}
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-300
                                   dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
                                   placeholder-gray-400 transition-all"
                        placeholder="Workspace name..."
                    />
                </div>
            ) : (
                <>
                    <div className="px-3 py-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            {workspaceName}
                        </span>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setIsRenaming(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-700/60 text-left transition-colors"
                        >
                            <Edit size={15} className="text-gray-400" />
                            <span>Rename workspace</span>
                        </button>
                    )}

                    {isOwner && (
                        <button
                            onClick={() => {
                                onManageMembers()
                                onClose()
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-700/60 text-left transition-colors"
                        >
                            <Users size={15} className="text-gray-400" />
                            <span>Members & permissions</span>
                        </button>
                    )}

                    {isOwner && (
                        <button
                            onClick={() => {
                                onManageMembers()
                                onClose()
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-700/60 text-left transition-colors"
                        >
                            <Share2 size={15} className="text-gray-400" />
                            <span>Share workspace</span>
                        </button>
                    )}

                    {!isOwner && (
                        <button
                            onClick={() => {
                                onManageMembers()
                                onClose()
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-700/60 text-left transition-colors"
                        >
                            <Settings size={15} className="text-gray-400" />
                            <span>Workspace info</span>
                        </button>
                    )}

                    {isOwner && canDelete && (
                        <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    if (confirm(`Delete workspace "${workspaceName}"? This cannot be undone.`)) {
                                        onDelete()
                                        onClose()
                                    }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400
                                           hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors"
                            >
                                <Trash2 size={15} />
                                <span>Delete workspace</span>
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
