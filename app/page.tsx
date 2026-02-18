'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchModal from '@/components/SearchModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import { Page } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { createBlock } from '@/lib/blockUtils'
import { PanelLeft, LogIn, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import PageEditor from '@/components/pages/PageEditor'
import { useAuth } from '@/providers/AuthProvider'

export default function Home() {
    const [currentPageId, setCurrentPageId] = useState<string | null>(null)
    const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
    const [emailClicked, setEmailClicked] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const { user, isGuest, signOut } = useAuth()
    const { workspace, loading: workspaceLoading, setWorkspace } = useWorkspace()

    // Set initial page
    useEffect(() => {
        if (workspace && !currentPageId) {
            setCurrentPageId(workspace.pageOrder[0] || null)
        }
    }, [workspace])

    const darkMode = workspace?.darkMode ?? false
    const pages = workspace?.pages ?? {}
    const pageOrder = workspace?.pageOrder ?? []

    // Apply dark mode class to html element
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + K: Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setShowSearch(true)
            }
            // Ctrl/Cmd + \: Toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
                e.preventDefault()
                setSidebarOpen((prev) => !prev)
            }
            // Ctrl/Cmd + ?: Show keyboard shortcuts
            if ((e.metaKey || e.ctrlKey) && e.key === '?') {
                e.preventDefault()
                setShowShortcuts(true)
            }
            // Ctrl/Cmd + D: Toggle dark mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !e.shiftKey && e.target === document.body) {
                e.preventDefault()
                toggleDarkMode()
            }
            // Ctrl/Cmd + N: New page
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault()
                createPage()
            }
            // Ctrl/Cmd + P: Quick page switcher (same as search for now)
            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault()
                setShowSearch(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    if (workspaceLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
                <div className="text-gray-600 dark:text-gray-400">Loading workspace...</div>
            </div>
        )
    }

    // ─── Page Operations ───────

    const createPage = (parentId: string | null = null) => {
        if (!workspace) return
        const newPage: Page = {
            id: generateId('page'),
            title: '',
            blocks: [createBlock('text', '')],
            parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        setWorkspace((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                pages: { ...prev.pages, [newPage.id]: newPage },
                pageOrder: [...prev.pageOrder, newPage.id],
            }
        })

        setCurrentPageId(newPage.id)

        if (parentId) {
            setExpandedPages((prev) => new Set([...prev, parentId]))
        }
    }

    const deletePage = (pageId: string) => {
        setWorkspace((prev) => {
            if (!prev) return prev
            const newPages = { ...prev.pages }
            let newOrder = [...prev.pageOrder]

            const deleteRecursive = (id: string) => {
                const children = newOrder.filter((pid) => newPages[pid]?.parentId === id)
                children.forEach(deleteRecursive)
                delete newPages[id]
                newOrder = newOrder.filter((pid) => pid !== id)
            }

            deleteRecursive(pageId)

            return { ...prev, pages: newPages, pageOrder: newOrder }
        })

        if (currentPageId === pageId) {
            setCurrentPageId(() => {
                const remainingPages = pageOrder.filter((id) => id !== pageId)
                return remainingPages[0] || null
            })
        }
    }

    const updatePage = (updatedPage: Page) => {
        setWorkspace((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                pages: { ...prev.pages, [updatedPage.id]: updatedPage },
            }
        })
    }

    const toggleExpand = (pageId: string) => {
        setExpandedPages((prev) => {
            const next = new Set(prev)
            if (next.has(pageId)) next.delete(pageId)
            else next.add(pageId)
            return next
        })
    }

    const toggleDarkMode = () => {
        setWorkspace((prev) => {
            if (!prev) return prev
            return { ...prev, darkMode: !prev.darkMode }
        })
    }

    const currentPage = currentPageId ? pages[currentPageId] : null

    if (!workspace) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-400">No workspace found</div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-white dark:bg-zinc-800 transition-colors">
            {/* Sidebar */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-60' : 'w-0'
                    }`}
            >
                <Sidebar
                    pages={pages}
                    pageOrder={pageOrder}
                    currentPageId={currentPageId}
                    darkMode={darkMode}
                    onSelectPage={setCurrentPageId}
                    onCreatePage={(parentId) => createPage(parentId ?? null)}
                    onDeletePage={deletePage}
                    onToggleSearch={() => setShowSearch(true)}
                    onToggleDarkMode={toggleDarkMode}
                    onShowShortcuts={() => setShowShortcuts(true)}
                    expandedPages={expandedPages}
                    onToggleExpand={toggleExpand}
                />
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="px-4 py-2.5 flex items-center gap-3  z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={sidebarOpen ? 'Close sidebar (⌘\\)' : 'Open sidebar (⌘\\)'}
                    >
                        {sidebarOpen ? (
                            <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
                        ) : (
                            <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
                        )}
                    </button>

                    {/* Page title in top bar */}
                    {currentPage && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                            {currentPage.icon && <span>{currentPage.icon}</span>}
                            <span className="truncate">{currentPage.title || 'Untitled'}</span>
                        </div>
                    )}

                    <div className="flex-1" />

                    {user ? (
                        <>
                            <div onClick={() => setEmailClicked(!emailClicked)} className="flex text-sm text-blue-600 bg-blue-500/10 dark:bg-zinc-700/30 cursor-pointer  dark:text-gray-400 rounded-lg px-2 py-0.5">
                                {user.email} {emailClicked ? <ChevronUp /> : ""}

                                {emailClicked &&
                                    <button
                                        onClick={() => signOut()}
                                        className="mt-2 absolute top-10 flex items-center gap-1.5  py-1.5 px-3 bg-zinc-700 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-red-500 rounded-lg transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Sign out
                                    </button>

                                }
                            </div>




                        </>
                    ) : (
                        <Link
                            href="/auth"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                            <LogIn size={14} />
                            Sign in
                        </Link>
                    )}

                    <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${user ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        {user ? 'Synced' : isGuest ? 'Guest' : 'Local'}
                    </div>
                </div>

                {/* Page editor */}
                {currentPage ? (
                    <PageEditor
                        page={currentPage}
                        onUpdatePage={updatePage}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
                        <div className="text-center">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
                                Select a page or create a new one
                            </p>
                            <button
                                onClick={() => createPage()}
                                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                            >
                                Create a page
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Search modal */}
            <SearchModal
                pages={pages}
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onSelectPage={(id) => {
                    setCurrentPageId(id)
                    setShowSearch(false)
                }}
            />

            {/* Keyboard shortcuts modal */}
            <KeyboardShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />
        </div>
    )
}
