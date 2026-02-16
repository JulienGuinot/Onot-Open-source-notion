'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, FileText, X } from 'lucide-react'
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

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
            setQuery('')
            setSelectedIndex(0)
        }
    }, [isOpen])

    const searchResults = Object.values(pages).filter((page) => {
        if (!query) return true
        const searchTerm = query.toLowerCase()
        return (
            page.title.toLowerCase().includes(searchTerm) ||
            page.blocks.some((block) => block.content.toLowerCase().includes(searchTerm))
        )
    })

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

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

    return (
        <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-start justify-center pt-[20vh] z-50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages..."
                        className="flex-1 outline-none text-base bg-transparent dark:text-gray-200 dark:placeholder-gray-500"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                            <X size={16} className="text-gray-400" />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {searchResults.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {query ? 'No pages found' : 'No pages yet'}
                        </div>
                    )}

                    {searchResults.map((page, index) => {
                        const matchingBlock = query
                            ? page.blocks.find((b) => b.content.toLowerCase().includes(query.toLowerCase()))
                            : null

                        return (
                            <button
                                key={page.id}
                                onClick={() => onSelectPage(page.id)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-700/50
                           ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {page.icon ? (
                                        <span className="text-xl">{page.icon}</span>
                                    ) : (
                                        <FileText size={20} className="text-gray-400 dark:text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {page.title || 'Untitled'}
                                    </div>
                                    {matchingBlock && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {matchingBlock.content}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {new Date(page.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-4 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
                        <span>navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
                        <span>select</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd>
                        <span>close</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

