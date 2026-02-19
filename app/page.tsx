'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SearchModal from '@/components/SearchModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import ShareModal from '@/components/ShareModal'
import ProfileSetupModal from '@/components/ProfileSetupModal'
import PresenceAvatars from '@/components/PresenceAvatars'
import { Page } from '@/lib/types'
import { PanelLeft, LogIn, LogOut, ChevronDown, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import PageEditor from '@/components/pages/PageEditor'
import { useAuth } from '@/providers/AuthProvider'
import { WorkspaceContextMenu } from '@/components/WorkspaceContextMenu'
import UserAvatar, { getUserDisplayName } from '@/components/UserAvatar'

export default function Home() {
    const [currentPageId, setCurrentPageId] = useState<string | null>(null)
    const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
    const [emailClicked, setEmailClicked] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [wsContextMenu, setWsContextMenu] = useState<boolean>(false)

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const { user, isGuest, profile, needsProfileSetup, completeProfileSetup, signOut } = useAuth()
    const {
        workspace, workspaces, pages, onlineUsers, userRole, conflictPageId,
        loading: workspaceLoading,
        setPage, createPage: providerCreatePage, deletePage: providerDeletePage,
        setWorkspaceSettings, switchWorkspace, createWorkspace,
        deleteWorkspace, renameWorkspace,
    } = useWorkspace()

    const pageOrder = workspace?.pageOrder ?? []

    useEffect(() => {
        if (workspace) {
            const validPage = currentPageId && pages[currentPageId]
            if (!validPage) {
                setCurrentPageId(pageOrder[0] || null)
            }
        }
    }, [workspace?.id])

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
        setCurrentPageId(id)
        if (parentId) {
            setExpandedPages((prev) => new Set([...prev, parentId]))
        }
    }

    const handleDeletePage = (pageId: string) => {
        providerDeletePage(pageId)
        if (currentPageId === pageId) {
            const remaining = pageOrder.filter((id) => id !== pageId)
            setCurrentPageId(remaining[0] || null)
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

    const currentPage = currentPageId ? pages[currentPageId] : null

    if (!workspace) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
                <div className="text-gray-600 dark:text-gray-400">No workspace found</div>
            </div>
        )
    }

    const isViewer = userRole === 'viewer'

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
                    workspaceName={workspace?.name ?? 'Workspace'}
                    workspaces={workspaces}
                    currentWorkspaceId={workspace?.id ?? ''}
                    userRole={userRole}
                    profile={profile}
                    userEmail={user?.email}
                    userId={user?.id}
                    onSelectPage={setCurrentPageId}
                    onCreatePage={(parentId) => handleCreatePage(parentId ?? null)}
                    onDeletePage={handleDeletePage}
                    onToggleSearch={() => setShowSearch(true)}
                    onToggleDarkMode={toggleDarkMode}
                    onShowShortcuts={() => setShowShortcuts(true)}
                    onShowShare={() => setShowShare(true)}
                    onSwitchWorkspace={switchWorkspace}
                    onCreateWorkspace={createWorkspace}
                    onDeleteWorkspace={deleteWorkspace}
                    onRenameWorkspace={renameWorkspace}
                    onRenamePage={handleRenamePage}
                    expandedPages={expandedPages}
                    onToggleExpand={toggleExpand}
                />
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="px-4 py-2.5 flex items-center gap-3 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        title={sidebarOpen ? 'Close sidebar (⌘\\)' : 'Open sidebar (⌘\\)'}
                    >
                        <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>

                    {currentPage && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 truncate">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                            <Share2 size={14} />
                            Share
                        </button>
                    )}


                    {user && !isGuest && (
                        <div
                            onClick={(e) => {
                                e.preventDefault()
                                setWsContextMenu(true)
                            }}
                            className="flex text-sm text-blue-600 bg-blue-500/10 dark:bg-zinc-700/30 cursor-pointer dark:text-gray-400 rounded-lg px-2 py-0.5">
                            {workspace.name}
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

                    )}

                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setEmailClicked(!emailClicked)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg
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
                                    {getUserDisplayName(profile?.first_name, profile?.last_name, user.email)}
                                </span>
                                <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${emailClicked ? 'rotate-180' : ''}`} />
                            </button>

                            {emailClicked && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setEmailClicked(false)} />
                                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-[#252525]
                                                    border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50
                                                    py-2 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 pb-2 mb-1 border-b border-gray-100 dark:border-gray-700/60">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar
                                                    avatarUrl={profile?.avatar_url}
                                                    firstName={profile?.first_name}
                                                    lastName={profile?.last_name}
                                                    email={user.email}
                                                    userId={user.id}
                                                    size="lg"
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {getUserDisplayName(profile?.first_name, profile?.last_name, user.email)}
                                                    </div>
                                                    {profile?.first_name && (
                                                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                            {user.email}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                                        <span className="text-[10px] text-gray-400">Synced</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setEmailClicked(false)
                                                signOut()
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400
                                                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                                        >
                                            <LogOut size={15} />
                                            Sign out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/auth"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400
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
                    setCurrentPageId(id)
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
