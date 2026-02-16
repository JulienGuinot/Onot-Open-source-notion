'use client'

import { useState } from 'react'
import {
    Plus,
    Search,
    Star,
    Moon,
    Sun,
    Keyboard,
    Sparkles,
    ChevronDown,
} from 'lucide-react'
import { Page } from '@/lib/types'
import { PageItem } from './pages/PageItem'

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
    const [favoritesExpanded, setFavoritesExpanded] = useState(true)
    const [pagesExpanded, setPagesExpanded] = useState(true)

    return (
        <div className="w-60 bg-[#fbfbfa] dark:bg-[#191919] border-r border-gray-200/80
                    dark:border-gray-800 flex flex-col h-screen select-none">
            {/* Header */}
            <div className="p-3 border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">

                        <h1 className="font-semibold text-xl text-gray-800 dark:text-gray-200">
                            Onot
                        </h1>
                    </div>
                    <button
                        onClick={onToggleDarkMode}
                        className="p-1.5 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 rounded-md
                                   transition-all duration-150 group"
                        title={darkMode ? 'Light mode' : 'Dark mode'}
                    >
                        {darkMode ? (
                            <Sun size={14} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                        ) : (
                            <Moon size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        )}
                    </button>
                </div>

                <button
                    onClick={onToggleSearch}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm
                             text-gray-500 dark:text-gray-400
                             hover:bg-gray-100/80 dark:hover:bg-gray-800/50 rounded-lg
                             border border-gray-200/80 dark:border-gray-700/60 
                             transition-all duration-150 group"
                >
                    <Search size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    <span className="flex-1 text-left text-gray-500 dark:text-gray-400">Search...</span>
                    <kbd className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-gray-700/50">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
                <div className="px-2 pt-3 pb-1">
                    <button
                        onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                        className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 rounded-md
                                   hover:bg-gray-100/70 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                        <ChevronDown
                            size={12}
                            className={`text-gray-400 transition-transform duration-200 ${favoritesExpanded ? '' : '-rotate-90'}`}
                        />
                        <Star size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400
                                         uppercase tracking-wider flex-1 text-left">
                            Favorites
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            {favorites.length}
                        </span>
                    </button>

                    <div className={`overflow-hidden transition-all duration-200 ${favoritesExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        {favorites.map((pageId) => {
                            const page = pages[pageId]
                            if (!page) return null
                            return (
                                <button
                                    key={pageId}
                                    onClick={() => onSelectPage(pageId)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                                               transition-all duration-150 text-sm group
                                               ${currentPageId === pageId
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-gray-100/70 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'}`}
                                >
                                    <span className="text-sm group-hover:scale-110 transition-transform">{page.icon || '📄'}</span>
                                    <span className="truncate flex-1">
                                        {page.title || 'Untitled'}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Pages */}
            <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2">
                <button
                    onClick={() => setPagesExpanded(!pagesExpanded)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 rounded-md
                               hover:bg-gray-100/70 dark:hover:bg-gray-800/40 transition-colors group"
                >
                    <ChevronDown
                        size={12}
                        className={`text-gray-400 transition-transform duration-200 ${pagesExpanded ? '' : '-rotate-90'}`}
                    />
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400
                                     uppercase tracking-wider flex-1 text-left">
                        Pages
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onCreatePage(null)
                        }}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 
                                   opacity-0 group-hover:opacity-100 transition-all"
                        title="New page"
                    >
                        <Plus size={12} className="text-gray-400" />
                    </button>
                </button>

                <div className={`overflow-hidden transition-all duration-200 ${pagesExpanded ? 'max-h-[9999px]' : 'max-h-0'}`}>
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
                        <div className="flex flex-col items-center py-8 px-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <Plus size={20} className="text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3">
                                No pages yet
                            </p>
                            <button
                                onClick={() => onCreatePage(null)}
                                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 
                                           dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                Create your first page
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer buttons */}
            <div className="p-2 border-t border-gray-200/60 dark:border-gray-800/60 space-y-0.5">
                <button
                    onClick={() => onCreatePage(null)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm
                             text-gray-600 dark:text-gray-400
                             hover:bg-gray-100/80 dark:hover:bg-gray-800/50 rounded-lg
                             transition-all duration-150 group"
                >
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center
                                    group-hover:bg-blue-500 transition-colors">
                        <Plus size={14} className="text-blue-500 group-hover:text-white transition-colors" />
                    </div>
                    <span className="flex-1 text-left">New Page</span>
                    <kbd className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-gray-700/50">
                        ⌘N
                    </kbd>
                </button>

                {onShowShortcuts && (
                    <button
                        onClick={onShowShortcuts}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm
                                 text-gray-600 dark:text-gray-400
                                 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 rounded-lg
                                 transition-all duration-150 group"
                    >
                        <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                                        group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                            <Keyboard size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                        </div>
                        <span className="flex-1 text-left">Shortcuts</span>
                        <kbd className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-gray-700/50">
                            ⌘?
                        </kbd>
                    </button>
                )}
            </div>
        </div>
    )
}
