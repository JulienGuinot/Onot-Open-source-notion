'use client'

import { useState } from 'react'
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
    onSelectPage,
    onCreatePage,
    onDeletePage,
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
    onSelectPage: (id: string) => void
    onCreatePage: (parentId: string) => void
    onDeletePage: (id: string) => void
    onToggleExpand: (id: string) => void
    currentPageId?: string
}) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const children = pageOrder.filter((id) => pages[id]?.parentId === pageId)
    const hasChildren = children.length > 0
    const isExpanded = expandedPages.has(pageId)

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

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
                onClick={() => onSelectPage(pageId)}
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
                    <span className="text-sm truncate flex-1 text-gray-700 dark:text-gray-300">
                        {page.title || 'Untitled'}
                    </span>
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
                            // Rename functionality would be implemented here
                            // For now, just close the menu
                        }}
                        onDuplicate={() => {
                            // Duplicate logic would go here
                            // This requires access to workspace state, so it should be handled in parent
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
                                onSelectPage={onSelectPage}
                                onCreatePage={onCreatePage}
                                onDeletePage={onDeletePage}
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
