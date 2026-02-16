'use client'

import {
    Plus,
    Search,
    Star,
    Moon,
    Sun,
    Keyboard
} from 'lucide-react'
import { Page } from '@/lib/types'
import { PageItem } from './pages/PageItem'

// ─── Props ────────────────────────────────────────────────────

interface SidebarProps {
    pages: Record<string, Page>
    pageOrder: string[]
    currentPageId: string | null
    darkMode: boolean
    onSelectPage: (pageId: string) => void
    onCreatePage: (parentId?: string | null) => void
    onDeletePage: (pageId: string) => void
    onToggleSearch: () => void
    onToggleDarkMode: () => void
    onShowShortcuts?: () => void
    expandedPages: Set<string>
    onToggleExpand: (pageId: string) => void
}

// ─── Main Sidebar ─────────────────────────────────────────────

export default function Sidebar({
    pages,
    pageOrder,
    currentPageId,
    darkMode,
    onSelectPage,
    onCreatePage,
    onDeletePage,
    onToggleSearch,
    onToggleDarkMode,
    onShowShortcuts,
    expandedPages,
    onToggleExpand,
}: SidebarProps) {
    const rootPages = pageOrder.filter((id) => pages[id]?.parentId === null)
    const favorites = pageOrder.filter((id) => pages[id]?.isFavorite)

    return (
        <div className="w-60 bg-gray-50 dark:bg-gray-900 border-r border-gray-200
                    dark:border-gray-800 flex flex-col h-screen select-none">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span className="text-lg">📓</span>
                        Onot
                    </h1>
                    <button
                        onClick={onToggleDarkMode}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md
                       transition-colors"
                        title={darkMode ? 'Light mode' : 'Dark mode'}
                    >
                        {darkMode ? (
                            <Sun size={14} className="text-gray-500 dark:text-gray-400" />
                        ) : (
                            <Moon size={14} className="text-gray-500" />
                        )}
                    </button>
                </div>

                <button
                    onClick={onToggleSearch}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm
                     text-gray-500 dark:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md
                     border border-gray-200 dark:border-gray-700 transition-colors"
                >
                    <Search size={14} />
                    <span className="flex-1 text-left">Search</span>
                    <kbd className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
                <div className="px-2 pt-3 pb-1">
                    <div className="flex items-center gap-1 px-2 mb-1">
                        <Star size={12} className="text-gray-400 dark:text-gray-500" />
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500
                             uppercase tracking-wider">
                            Favorites
                        </span>
                    </div>
                    {favorites.map((pageId) => {
                        const page = pages[pageId]
                        if (!page) return null
                        return (
                            <button
                                key={pageId}
                                onClick={() => onSelectPage(pageId)}
                                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left
                           transition-colors text-sm
                           ${currentPageId === pageId
                                        ? 'bg-gray-200/80 dark:bg-gray-700/60'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                            >
                                <span className="text-sm">{page.icon || '📄'}</span>
                                <span className="truncate text-gray-700 dark:text-gray-300">
                                    {page.title || 'Untitled'}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Pages */}
            <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2">
                <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500
                           uppercase tracking-wider">
                        Pages
                    </span>
                </div>
                {rootPages.map((pageId) => {
                    const page = pages[pageId]
                    if (!page) return null
                    return (
                        <PageItem
                            key={pageId}
                            page={page}
                            pageId={pageId}
                            pages={pages}
                            pageOrder={pageOrder}
                            depth={0}
                            isSelected={currentPageId === pageId}
                            expandedPages={expandedPages}
                            onSelectPage={onSelectPage}
                            onCreatePage={(parentId) => onCreatePage(parentId)}
                            onDeletePage={onDeletePage}
                            onToggleExpand={onToggleExpand}
                            currentPageId={currentPageId || undefined}
                        />
                    )
                })}

                {rootPages.length === 0 && (
                    <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
                        No pages yet
                    </div>
                )}
            </div>

            {/* Footer buttons */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <button
                    onClick={() => onCreatePage(null)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm
                     text-gray-600 dark:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md
                     transition-colors"
                >
                    <Plus size={16} />
                    <span>New Page</span>
                    <kbd className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        ⌘N
                    </kbd>
                </button>
                {onShowShortcuts && (
                    <button
                        onClick={onShowShortcuts}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm
                       text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md
                       transition-colors"
                    >
                        <Keyboard size={16} />
                        <span>Shortcuts</span>
                        <kbd className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                            ⌘?
                        </kbd>
                    </button>
                )}
            </div>
        </div>
    )
}

