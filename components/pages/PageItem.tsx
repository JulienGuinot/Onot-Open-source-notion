'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Page } from '@/lib/types'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { PageContextMenu } from './PageContextMenu'

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
    onDeletePage,
    onRenamePage,
    onToggleExpand,
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
    onDeletePage: (id: string) => void
    onRenamePage: (pageId: string, newTitle: string) => void
    onToggleExpand: (id: string) => void
    currentPageId?: string
}) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(page.title)
    const renameInputRef = useRef<HTMLInputElement>(null)
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

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

    return (
        <div>
            <div
                className={`group flex items-center gap-1 pr-2 py-[3px] rounded-md cursor-pointer
              transition-colors duration-100
              ${isSelected
                        ? 'bg-gray-200/80 dark:bg-gray-700/60'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
            >
                {/* Expand toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        if (hasChildren) onToggleExpand(pageId)
                    }}
                    className={`p-0.5 rounded transition-colors flex-shrink-0
                ${hasChildren ? 'hover:bg-gray-200 dark:hover:bg-gray-600' : 'invisible'}`}
                >
                    {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                        <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />
                    )}
                </button>

                {/* Page info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm flex-shrink-0">
                        {page.icon || <FileText size={14} className="text-gray-400 dark:text-gray-500" />}
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

                {/* Right-click context menu */}
                {contextMenu && (
                    <PageContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        onAddSubPage={() => {
                            onCreatePage(pageId)
                        }}
                        onDelete={() => {
                            if (typeof window !== 'undefined' && confirm(`Delete "${page.title || 'Untitled'}"?`)) {
                                onDeletePage(pageId)
                            }
                        }}
                        onRename={() => {
                            startRename()
                        }}
                        onDuplicate={() => {
                            // Duplicate logic would go here
                        }}
                        onCopyLink={() => {
                            const link = `${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : ''}#${pageId}`
                            navigator.clipboard.writeText(link)
                        }}
                    />
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
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
                                onDeletePage={onDeletePage}
                                onRenamePage={onRenamePage}
                                onToggleExpand={onToggleExpand}
                                currentPageId={currentPageId}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}
