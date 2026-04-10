'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Page } from '@/lib/types'
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Plus } from 'lucide-react'
import { PageContextMenu } from './PageContextMenu'

type DropPosition = 'before' | 'after' | 'inside' | null

export function PageItem({
    page,
    pageId,
    pages,
    pageOrder,
    depth,
    isSelected,
    expandedPages,
    canEdit = true,
    onSelectPage,
    onCreatePage,
    onCreateFolder,
    onDeletePage,
    onRenamePage,
    onToggleExpand,
    onMovePage,
    currentPageId,
}: {
    page: Page
    pageId: string
    pages: Record<string, Page>
    pageOrder: string[]
    depth: number
    isSelected: boolean
    expandedPages: Set<string>
    canEdit?: boolean
    onSelectPage: (id: string) => void
    onCreatePage: (parentId: string) => void
    onCreateFolder?: (parentId: string) => void
    onDeletePage: (id: string) => void
    onRenamePage: (pageId: string, newTitle: string) => void
    onToggleExpand: (id: string) => void
    onMovePage?: (dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
    currentPageId?: string
}) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(page.title)
    const [dropPosition, setDropPosition] = useState<DropPosition>(null)
    const renameInputRef = useRef<HTMLInputElement>(null)
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null)
    const rowRef = useRef<HTMLDivElement>(null)

    const isFolder = page.type === 'folder'
    const children = pageOrder.filter((id) => pages[id]?.parentId === pageId)
    const hasChildren = children.length > 0
    const isExpanded = expandedPages.has(pageId)

    useEffect(() => {
        if (isRenaming) {
            renameInputRef.current?.focus()
            renameInputRef.current?.select()
        }
    }, [isRenaming])

    useEffect(() => {
        setRenameValue(page.title)
    }, [page.title])

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const startRename = useCallback(() => {
        if (!canEdit) return
        setRenameValue(page.title)
        setIsRenaming(true)
    }, [canEdit, page.title])

    const commitRename = useCallback(() => {
        const trimmed = renameValue.trim()
        if (trimmed !== page.title) {
            onRenamePage(pageId, trimmed || 'Untitled')
        }
        setIsRenaming(false)
    }, [renameValue, page.title, pageId, onRenamePage])

    const cancelRename = useCallback(() => {
        setRenameValue(page.title)
        setIsRenaming(false)
    }, [page.title])

    const handleClick = (e: React.MouseEvent) => {
        if (isRenaming) return

        if (isFolder) {
            if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current)
                clickTimerRef.current = null
                if (canEdit) startRename()
                return
            }
            clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null
                onToggleExpand(pageId)
            }, 250)
            return
        }

        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current)
            clickTimerRef.current = null
            if (canEdit) startRename()
            return
        }

        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null
            onSelectPage(pageId)
        }, 250)
    }

    useEffect(() => {
        return () => {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
        }
    }, [])

    // ─── Drag & Drop ──────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent) => {
        if (!canEdit || isRenaming) { e.preventDefault(); return }
        e.dataTransfer.setData('text/x-page-id', pageId)
        e.dataTransfer.effectAllowed = 'move'
        if (rowRef.current) {
            e.dataTransfer.setDragImage(rowRef.current, 16, 12)
        }
    }

    const computeDropPosition = (e: React.DragEvent): DropPosition => {
        const rect = rowRef.current?.getBoundingClientRect()
        if (!rect) return null
        const y = e.clientY - rect.top
        const ratio = y / rect.height
        if (isFolder) {
            if (ratio < 0.25) return 'before'
            if (ratio > 0.75) return 'after'
            return 'inside'
        }
        return ratio < 0.5 ? 'before' : 'after'
    }

    const handleDragOver = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('text/x-page-id')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const pos = computeDropPosition(e)
        setDropPosition(pos)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        if (rowRef.current?.contains(e.relatedTarget as Node)) return
        setDropPosition(null)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const dragId = e.dataTransfer.getData('text/x-page-id')
        const pos = computeDropPosition(e)
        setDropPosition(null)
        if (!dragId || dragId === pageId || !pos || !onMovePage) return
        onMovePage(dragId, pageId, pos)
        if (pos === 'inside') onToggleExpand(pageId)
    }

    const handleDragEnd = () => setDropPosition(null)

    // ─── Drop indicator classes ───────────────────────────────

    const dropIndicatorTop = dropPosition === 'before'
        ? 'before:absolute before:left-2 before:right-2 before:top-0 before:h-[2px] before:bg-blue-500 before:rounded-full'
        : ''
    const dropIndicatorBottom = dropPosition === 'after'
        ? 'after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[2px] after:bg-blue-500 after:rounded-full'
        : ''
    const dropIndicatorInside = dropPosition === 'inside'
        ? 'ring-2 ring-blue-500/50 ring-inset bg-blue-50/50 dark:bg-blue-900/20'
        : ''

    return (
        <div>
            <div
                ref={rowRef}
                draggable={canEdit && !isRenaming}
                className={`group relative flex items-center gap-1 pr-2 py-[3px] rounded-md cursor-pointer
              transition-colors duration-100
              ${isSelected && !dropIndicatorInside
                        ? 'bg-gray-200/80 dark:bg-gray-700/60'
                        : !dropIndicatorInside ? 'hover:bg-gray-100 dark:hover:bg-gray-800/50' : ''
                    }
              ${dropIndicatorInside}
              ${dropIndicatorTop}
              ${dropIndicatorBottom}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
            >
                {/* Expand toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        if (hasChildren || isFolder) onToggleExpand(pageId)
                    }}
                    className={`p-0.5 rounded transition-colors flex-shrink-0
                ${(hasChildren || isFolder) ? 'hover:bg-gray-200 dark:hover:bg-gray-600' : 'invisible'}`}
                >
                    {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                        <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />
                    )}
                </button>

                {/* Icon */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm flex-shrink-0">
                        {page.icon || (isFolder
                            ? (isExpanded
                                ? <FolderOpen size={14} className="text-blue-500 dark:text-blue-400" />
                                : <Folder size={14} className="text-blue-500 dark:text-blue-400" />)
                            : <FileText size={14} className="text-gray-400 dark:text-gray-500" />
                        )}
                    </span>

                    {isRenaming ? (
                        <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter') commitRename()
                                if (e.key === 'Escape') cancelRename()
                            }}
                            onBlur={commitRename}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm flex-1 min-w-0 bg-white dark:bg-gray-800 border border-blue-400
                                       dark:border-blue-500 rounded px-1 py-0 text-gray-800 dark:text-gray-200
                                       focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                            placeholder="Untitled"
                        />
                    ) : (
                        <span className="text-sm truncate flex-1 text-gray-700 dark:text-gray-300">
                            {page.title || 'Untitled'}
                        </span>
                    )}
                </div>

                {/* Quick add for folders */}
                {isFolder && canEdit && !isRenaming && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onCreatePage(pageId)
                            if (!isExpanded) onToggleExpand(pageId)
                        }}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600
                                   opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="New page inside"
                    >
                        <Plus size={12} className="text-gray-400" />
                    </button>
                )}

                {/* Context menu */}
                {contextMenu && (
                    <PageContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        onAddSubPage={() => {
                            onCreatePage(pageId)
                        }}
                        onAddSubFolder={onCreateFolder ? () => {
                            onCreateFolder(pageId)
                        } : undefined}
                        onDelete={() => {
                            if (typeof window !== 'undefined' && confirm(`Delete "${page.title || 'Untitled'}"?`)) {
                                onDeletePage(pageId)
                            }
                        }}
                        onRename={() => {
                            startRename()
                        }}
                        onDuplicate={() => { }}
                        onCopyLink={() => {
                            const link = `${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : ''}#${pageId}`
                            navigator.clipboard.writeText(link)
                        }}
                    />
                )}
            </div>

            {/* Children */}
            {isExpanded && (hasChildren || isFolder) && (
                <div>
                    {children.map((childId) => {
                        const childPage = pages[childId]
                        if (!childPage) return null
                        return (
                            <PageItem
                                key={childId}
                                page={childPage}
                                pageId={childId}
                                pages={pages}
                                pageOrder={pageOrder}
                                depth={depth + 1}
                                isSelected={childId === currentPageId}
                                expandedPages={expandedPages}
                                canEdit={canEdit}
                                onSelectPage={onSelectPage}
                                onCreatePage={onCreatePage}
                                onCreateFolder={onCreateFolder}
                                onDeletePage={onDeletePage}
                                onRenamePage={onRenamePage}
                                onToggleExpand={onToggleExpand}
                                onMovePage={onMovePage}
                                currentPageId={currentPageId}
                            />
                        )
                    })}
                    {isFolder && !hasChildren && (
                        <div
                            className="text-[11px] text-gray-400 dark:text-gray-600 italic py-1"
                            style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
                        >
                            Empty
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
