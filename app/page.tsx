'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchModal from '@/components/SearchModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import ShareModal from '@/components/ShareModal'
import AgentsModal from '@/components/AgentsModal'
import ProfileSetupModal from '@/components/ProfileSetupModal'
import PresenceAvatars from '@/components/PresenceAvatars'
import { Page } from '@/lib/types'
import { PanelLeft, LogIn, ChevronDown, Share2, Signal, PlugZap } from 'lucide-react'
import Link from 'next/link'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import PageEditor from '@/components/pages/PageEditor'
import { useAuth } from '@/providers/AuthProvider'
import { WorkspaceContextMenu } from '@/components/WorkspaceContextMenu'
import UserAvatar, { getUserDisplayName } from '@/components/UserAvatar'
import { UserModal } from '@/components/UserModal'
import { SyncModal } from '@/components/SyncModal'

const LAST_PAGE_STORAGE_KEY = 'onot-last-page-by-workspace'

function isEditablePage(page: Page | null | undefined): page is Page {
    return Boolean(page && page.type !== 'folder')
}

function findFirstEditablePageId(pageOrder: string[], pages: Record<string, Page>, parentId: string | null = null): string | null {
    for (const pageId of pageOrder) {
        const page = pages[pageId]
        if (!page || page.parentId !== parentId) continue
        if (page.type !== 'folder') return pageId

        const childPageId = findFirstEditablePageId(pageOrder, pages, pageId)
        if (childPageId) return childPageId
    }

    return null
}

function loadLastPageId(workspaceId: string): string | null {
    try {
        const raw = localStorage.getItem(LAST_PAGE_STORAGE_KEY)
        if (!raw) return null
        const byWorkspace = JSON.parse(raw) as Record<string, string>
        return byWorkspace[workspaceId] ?? null
    } catch {
        return null
    }
}

function saveLastPageId(workspaceId: string, pageId: string): void {
    try {
        const raw = localStorage.getItem(LAST_PAGE_STORAGE_KEY)
        const byWorkspace = raw ? JSON.parse(raw) as Record<string, string> : {}
        byWorkspace[workspaceId] = pageId
        localStorage.setItem(LAST_PAGE_STORAGE_KEY, JSON.stringify(byWorkspace))
    } catch { /* noop */ }
}

export default function Home() {
    const [currentPageId, setCurrentPageId] = useState<string | null>(null)
    const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
    const [emailClicked, setEmailClicked] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [showAgents, setShowAgents] = useState(false)
    const [wsContextMenu, setWsContextMenu] = useState<boolean>(false)
    const [mcpModalOpen, setMcpModalOpen] = useState(false)
    const [syncModalOpen, setSyncModalOpen] = useState(false)

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [isMobile, setIsMobile] = useState(false)
    const { user, isGuest, profile, needsProfileSetup, completeProfileSetup, signOut } = useAuth()
    const {
        workspace, workspaces, pages, onlineUsers, userRole, conflictPageId,
        loading: workspaceLoading, syncing, syncNow,
        setPage, createPage: providerCreatePage, createFolder: providerCreateFolder,
        deletePage: providerDeletePage, movePage,
        setWorkspaceSettings, switchWorkspace, createWorkspace,
        deleteWorkspace, renameWorkspace,
    } = useWorkspace()

    const pageOrder = workspace?.pageOrder ?? []

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)')
        const handleChange = () => {
            setIsMobile(mediaQuery.matches)
            setSidebarOpen(!mediaQuery.matches)
        }

        handleChange()
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const selectPage = useCallback((pageId: string | null) => {
        setCurrentPageId(pageId)
        if (workspace?.id && pageId && isEditablePage(pages[pageId])) {
            saveLastPageId(workspace.id, pageId)
        }
    }, [pages, workspace?.id])

    const handleSelectPage = useCallback((pageId: string) => {
        selectPage(pageId)
        if (isMobile) setSidebarOpen(false)
    }, [isMobile, selectPage])

    useEffect(() => {
        if (!workspace) return

        const currentPage = currentPageId ? pages[currentPageId] : null
        if (isEditablePage(currentPage)) return

        const savedPageId = loadLastPageId(workspace.id)
        if (savedPageId && isEditablePage(pages[savedPageId])) {
            setCurrentPageId(savedPageId)
            return
        }

        setCurrentPageId(findFirstEditablePageId(pageOrder, pages))
    }, [workspace?.id, currentPageId, pages, pageOrder])

    useEffect(() => {
        if (workspace?.id && currentPageId && isEditablePage(pages[currentPageId])) {
            saveLastPageId(workspace.id, currentPageId)
        }
    }, [workspace?.id, currentPageId, pages])

    const darkMode = workspace?.darkMode ?? false

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setShowSearch(true)
            }
            if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
                e.preventDefault()
                setSidebarOpen((prev) => !prev)
            }
            if ((e.metaKey || e.ctrlKey) && e.key === '?') {
                e.preventDefault()
                setShowShortcuts(true)
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !e.shiftKey && e.target === document.body) {
                e.preventDefault()
                toggleDarkMode()
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault()
                handleCreatePage()
            }
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

    const handleCreatePage = (parentId: string | null = null) => {
        const id = providerCreatePage(parentId)
        selectPage(id)
        if (parentId) {
            setExpandedPages((prev) => new Set([...prev, parentId]))
        }
    }

    const handleCreateFolder = (parentId: string | null = null) => {
        const id = providerCreateFolder(parentId)
        setExpandedPages((prev) => new Set([...prev, id, ...(parentId ? [parentId] : [])]))
    }

    const handleMovePage = (dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
        movePage(dragId, targetId, position)
        if (position === 'inside') {
            setExpandedPages((prev) => new Set([...prev, targetId]))
        }
    }

    const handleDeletePage = (pageId: string) => {
        providerDeletePage(pageId)
        if (currentPageId === pageId) {
            const remaining = pageOrder.filter((id) => id !== pageId)
            selectPage(findFirstEditablePageId(remaining, pages))
        }
    }

    const updatePage = (updatedPage: Page) => {
        if (userRole === 'viewer') return
        setPage(updatedPage)
    }

    const handleRenamePage = (pageId: string, newTitle: string) => {
        const page = pages[pageId]
        if (!page || userRole === 'viewer') return
        setPage({ ...page, title: newTitle, updatedAt: Date.now() })
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
        setWorkspaceSettings({ darkMode: !darkMode })
    }

    const currentPage = currentPageId && isEditablePage(pages[currentPageId]) ? pages[currentPageId] : null

    if (!workspace) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">📝</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No workspace found</p>
                    <button
                        onClick={() => createWorkspace("My Workspace")}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl
                                   shadow-lg shadow-blue-500/25 transition-all"
                    >
                        Create a workspace
                    </button>
                </div>
            </div>
        )
    }

    const isViewer = userRole === 'viewer'

    return (
        <div className="mobile-shell flex h-dvh overflow-hidden bg-white dark:bg-zinc-800 transition-colors">
            {/* Sidebar */}
            {isMobile && sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px] md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden
                    ${isMobile
                        ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[86vw] shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : `${sidebarOpen ? 'w-60' : 'w-0'}`
                    }`}
            >
                <Sidebar
                    pages={pages}
                    pageOrder={pageOrder}
                    currentPageId={currentPageId}
                    darkMode={darkMode}
                    workspaceName={workspace?.name ?? 'Workspace'}
                    workspaces={workspaces}
                    currentWorkspaceId={workspace?.id ?? ''}
                    userRole={userRole}
                    profile={profile}
                    userEmail={user?.email}
                    userId={user?.id}
                    onSelectPage={handleSelectPage}
                    onCreatePage={(parentId) => handleCreatePage(parentId ?? null)}
                    onCreateFolder={(parentId) => handleCreateFolder(parentId ?? null)}
                    onDeletePage={handleDeletePage}
                    onToggleSearch={() => setShowSearch(true)}
                    onToggleDarkMode={toggleDarkMode}
                    onShowShortcuts={() => setShowShortcuts(true)}
                    onShowShare={() => setShowShare(true)}
                    onShowAgents={() => setShowAgents(true)}
                    onSwitchWorkspace={switchWorkspace}
                    onCreateWorkspace={createWorkspace}
                    onDeleteWorkspace={deleteWorkspace}
                    onRenameWorkspace={renameWorkspace}
                    onRenamePage={handleRenamePage}
                    onMovePage={handleMovePage}
                    expandedPages={expandedPages}
                    onToggleExpand={toggleExpand}
                />
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="pwa-topbar px-2 sm:px-4 py-2.5 flex items-center gap-1.5 sm:gap-3 z-10 border-b border-gray-100/80 dark:border-zinc-700/50 md:border-b-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center p-2 sm:min-h-8 sm:min-w-8 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        title={sidebarOpen ? 'Close sidebar (⌘\\)' : 'Open sidebar (⌘\\)'}
                    >
                        <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>

                    {currentPage && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 truncate min-w-0 max-w-[44vw] sm:max-w-none">
                            {currentPage.icon && <span>{currentPage.icon}</span>}
                            <span className="truncate">{currentPage.title || 'Untitled'}</span>
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* Online collaborators */}
                    {onlineUsers.length > 1 && (
                        <PresenceAvatars users={onlineUsers} currentUserId={user?.id} />
                    )}

                    {/* Share button */}
                    {user && !isGuest && userRole === 'owner' && (
                        <button
                            onClick={() => setShowShare(true)}
                            className="flex min-h-10 sm:min-h-8 items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                    )}


                    {user && !isGuest && (
                        <>
                            <div
                                onClick={(e) => {
                                    e.preventDefault()
                                    setWsContextMenu(true)
                                }}
                                className="hidden sm:flex text-sm text-blue-600 bg-blue-500/10 dark:bg-zinc-700/30 cursor-pointer dark:text-gray-400 rounded-lg px-2 py-0.5 max-w-[180px] truncate">
                                <span className="truncate">{workspace.name}</span>
                                {wsContextMenu &&
                                    <WorkspaceContextMenu
                                        workspaceName={workspace.name}
                                        isOwner={workspace.role == "owner"}
                                        canDelete={workspaces.length > 1}
                                        onClose={() => setWsContextMenu(false)}
                                        onRename={(newName) => {
                                            renameWorkspace(workspace.id, newName)
                                        }}
                                        onManageMembers={() => {
                                            setShowShare(true)
                                        }}
                                        onDelete={() => {
                                            deleteWorkspace(workspace.id)
                                        }}
                                    />
                                }
                            </div>
                        </>
                    )}


                    {/*  MCP  */}
                    {/* {user && !isGuest && (
                        <div className="relative">
                            <button
                                onClick={() => setMcpModalOpen(!mcpModalOpen)}
                                className="flex min-h-10 sm:min-h-8 items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg
                                        hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                            >
                                <PlugZap className='h-4 w-4' />
                                <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate hidden sm:block">
                                    MCP
                                </span>
                                <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${mcpModalOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {mcpModalOpen && profile && (
                                <AgentsModal
                                    isOpen={true}
                                    onClose={() => setMcpModalOpen(false)}
                                />
                            )}
                        </div>
                    )} */}

                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setEmailClicked(!emailClicked)}
                                className="flex min-h-10 sm:min-h-8 items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg
                                           hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                            >
                                <UserAvatar
                                    avatarUrl={profile?.avatar_url}
                                    firstName={profile?.first_name}
                                    lastName={profile?.last_name}
                                    email={user.email}
                                    userId={user.id}
                                    size="sm"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate hidden sm:block">
                                    {getUserDisplayName(profile?.first_name, profile?.last_name, profile?.email)}
                                </span>
                                <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${emailClicked ? 'rotate-180' : ''}`} />
                            </button>

                            {emailClicked && profile && (
                                <UserModal
                                    profile={profile}
                                    onClose={() => setEmailClicked(false)}
                                    onSignOut={() => {
                                        setEmailClicked(false);   // on ferme quand même
                                        signOut();
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/auth"
                            className="flex min-h-10 sm:min-h-8 items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400
                                       hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20
                                       rounded-lg transition-colors"
                        >
                            <LogIn size={14} />
                            Sign in
                        </Link>
                    )}
                </div>

                {/* Read-only banner for viewers */}
                {isViewer && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                        You have view-only access to this workspace.
                    </div>
                )}

                {/* Page editor */}
                {currentPage ? (
                    <PageEditor
                        page={currentPage}
                        onUpdatePage={updatePage}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-900">
                        <div className="text-center">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
                                Select a page or create a new one
                            </p>
                            {!isViewer && (
                                <button
                                    onClick={() => handleCreatePage()}
                                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                                >
                                    Create a page
                                </button>
                            )}
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
                    selectPage(id)
                    setShowSearch(false)
                }}
            />

            {/* Keyboard shortcuts modal */}
            <KeyboardShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />

            {/* Share modal */}
            <ShareModal
                isOpen={showShare}
                onClose={() => setShowShare(false)}
            />

            {/* AI agents modal */}
            {/* <AgentsModal
                isOpen={showAgents}
                onClose={() => setShowAgents(false)}
            /> */}

            {/* Profile setup modal (post-signup) */}
            <ProfileSetupModal
                isOpen={needsProfileSetup}
                onComplete={completeProfileSetup}
                profile={profile}
            />

            {/* Conflict toast */}
            {conflictPageId && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg shadow-xl">
                        <span className="text-sm font-medium">
                            This page was edited by someone else. Your changes may overwrite theirs.
                        </span>
                    </div>
                </div>
            )}
        </div >
    )
}
