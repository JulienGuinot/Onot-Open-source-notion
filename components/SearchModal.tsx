'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, FileText, X, Clock, Star, ArrowRight } from 'lucide-react'
import { Page } from '@/lib/types'

interface SearchModalProps {
    pages: Record<string, Page>
    isOpen: boolean
    onClose: () => void
    onSelectPage: (pageId: string) => void
}

export default function SearchModal({ pages, isOpen, onClose, onSelectPage }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const resultsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
            setQuery('')
            setSelectedIndex(0)
        }
    }, [isOpen])

    const searchResults = useMemo(() => {
        const allPages = Object.values(pages)
        
        if (!query.trim()) {
            // Show recent pages when no query
            return allPages
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 8)
        }
        
        const searchTerm = query.toLowerCase().trim()
        
        return allPages
            .map(page => {
                let score = 0
                const titleMatch = page.title.toLowerCase().includes(searchTerm)
                const titleStartsWith = page.title.toLowerCase().startsWith(searchTerm)
                const contentMatches = page.blocks.filter(b => 
                    b.content.toLowerCase().includes(searchTerm)
                ).length
                
                if (titleStartsWith) score += 100
                if (titleMatch) score += 50
                score += contentMatches * 10
                
                return { page, score, titleMatch, contentMatches }
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(r => r.page)
    }, [pages, query])

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selectedEl = resultsRef.current.children[selectedIndex] as HTMLElement
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [selectedIndex])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
                e.preventDefault()
                onSelectPage(searchResults[selectedIndex].id)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, searchResults, selectedIndex, onClose, onSelectPage])

    if (!isOpen) return null

    const getMatchContext = (page: Page) => {
        if (!query) return null
        const searchTerm = query.toLowerCase()
        
        for (const block of page.blocks) {
            const lowerContent = block.content.toLowerCase()
            const matchIndex = lowerContent.indexOf(searchTerm)
            if (matchIndex !== -1) {
                const start = Math.max(0, matchIndex - 30)
                const end = Math.min(block.content.length, matchIndex + query.length + 50)
                let excerpt = block.content.slice(start, end)
                if (start > 0) excerpt = '...' + excerpt
                if (end < block.content.length) excerpt = excerpt + '...'
                return excerpt
            }
        }
        return null
    }

    const formatDate = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        
        if (days === 0) return 'Today'
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days} days ago`
        return new Date(timestamp).toLocaleDateString('fr-FR', { 
            month: 'short', 
            day: 'numeric' 
        })
    }

    return (
        <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-start justify-center pt-[15vh] z-50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div 
                className="bg-white dark:bg-[#252525] rounded-2xl shadow-2xl w-full max-w-xl 
                           border border-gray-200/50 dark:border-gray-700/50 overflow-hidden 
                           animate-in fade-in zoom-in-95 duration-150"
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)'
                }}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200/80 dark:border-gray-700/50">
                    <Search size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages..."
                        className="flex-1 outline-none text-base bg-transparent dark:text-gray-200 
                                   placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    {query && (
                        <button 
                            onClick={() => setQuery('')} 
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    )}
                </div>

                {/* Section label */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {query ? (
                            <>
                                <Search size={12} />
                                <span>Results</span>
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <span>{searchResults.length} found</span>
                            </>
                        ) : (
                            <>
                                <Clock size={12} />
                                <span>Recent pages</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Results */}
                <div ref={resultsRef} className="max-h-[360px] overflow-y-auto">
                    {searchResults.length === 0 && (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Search size={20} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                {query ? 'No pages found' : 'No pages yet'}
                            </p>
                            {query && (
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    Try a different search term
                                </p>
                            )}
                        </div>
                    )}

                    {searchResults.map((page, index) => {
                        const matchContext = getMatchContext(page)
                        const isSelected = index === selectedIndex

                        return (
                            <button
                                key={page.id}
                                onClick={() => onSelectPage(page.id)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100
                                           ${isSelected 
                                               ? 'bg-blue-50 dark:bg-blue-900/20' 
                                               : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                           }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                                                ${isSelected 
                                                    ? 'bg-blue-100 dark:bg-blue-800/30' 
                                                    : 'bg-gray-100 dark:bg-gray-800'
                                                }`}>
                                    {page.icon ? (
                                        <span className="text-xl">{page.icon}</span>
                                    ) : (
                                        <FileText size={18} className={`transition-colors ${
                                            isSelected ? 'text-blue-500' : 'text-gray-400'
                                        }`} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate transition-colors ${
                                        isSelected 
                                            ? 'text-blue-700 dark:text-blue-300' 
                                            : 'text-gray-800 dark:text-gray-200'
                                    }`}>
                                        {page.title || 'Untitled'}
                                    </div>
                                    {matchContext ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {matchContext}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            <Clock size={10} />
                                            <span>{formatDate(page.updatedAt)}</span>
                                            {page.isFavorite && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <Star size={10} className="text-amber-400" />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                                        <ArrowRight size={14} />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-gray-200/80 dark:border-gray-700/50 
                                flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 
                                bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm">↓</kbd>
                            <span className="ml-1">navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm">↵</kbd>
                            <span className="ml-1">open</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600 shadow-sm">Esc</kbd>
                        <span className="ml-1">close</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
