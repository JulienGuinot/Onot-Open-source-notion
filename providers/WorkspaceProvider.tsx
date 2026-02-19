"use client"

import React, {
    createContext, useContext, useEffect, useState,
    useMemo, useRef, useCallback,
} from "react"
import type {
    WorkspaceData, Page, WorkspaceMember,
    WorkspaceInvite, MemberRole, PresenceUser,
} from "@/lib/types"
import { useAuth } from "./AuthProvider"
import {
    loadAppData, saveAppData, createEmptyWorkspace,
    loadCurrentWorkspaceId, saveCurrentWorkspaceId,
} from "@/lib/storage"
import {
    fetchUserWorkspaces, fetchWorkspacePages, savePageToCloud,
    deletePageFromCloud, createWorkspaceInCloud, updateWorkspaceInCloud,
    deleteWorkspaceFromCloud, migrateOldCloudData,
    fetchWorkspaceMembers as fetchMembers, fetchWorkspaceInvites,
    createInvite as createInviteApi, revokeInvite as revokeInviteApi,
    removeMember as removeMemberApi, updateMemberRole as updateMemberRoleApi,
    addMember,
    subscribeToPagesChanges, subscribeToWorkspaceChanges,
    subscribeToPresence, unsubscribeChannel,
} from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkspaceContextValue = {
    workspace: WorkspaceData | null
    workspaces: WorkspaceData[]
    pages: Record<string, Page>
    members: WorkspaceMember[]
    invites: WorkspaceInvite[]
    onlineUsers: PresenceUser[]
    loading: boolean
    syncing: boolean
    userRole: MemberRole | null
    conflictPageId: string | null

    // Page mutations
    setPage: (page: Page) => void
    createPage: (parentId?: string | null) => string
    deletePage: (pageId: string) => void

    // Workspace mutations
    setWorkspaceSettings: (settings: Partial<Pick<WorkspaceData, 'name' | 'darkMode' | 'pageOrder'>>) => void
    switchWorkspace: (id: string) => void
    createWorkspace: (name: string) => string
    deleteWorkspace: (id: string) => void
    renameWorkspace: (id: string, name: string) => void

    // Sharing
    createInviteLink: (role: Exclude<MemberRole, 'owner'>) => Promise<string | null>
    revokeInviteLink: (inviteId: string) => Promise<void>
    removeMemberFromWorkspace: (userId: string) => Promise<void>
    updateMemberRoleInWorkspace: (userId: string, role: MemberRole) => Promise<void>

    syncNow: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

const SYNC_DEBOUNCE_MS = 1500

// ─── Provider ────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user, isGuest, profile, loading: authLoading } = useAuth()

    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([])
    const [currentWsId, setCurrentWsId] = useState<string | null>(null)
    const [pages, setPages] = useState<Record<string, Page>>({})
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [invites, setInvites] = useState<WorkspaceInvite[]>([])
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pagesChannelRef = useRef<RealtimeChannel | null>(null)
    const wsChannelRef = useRef<RealtimeChannel | null>(null)
    const presenceChannelRef = useRef<RealtimeChannel | null>(null)
    const currentUserIdRef = useRef<string | null>(null)
    const hasLoadedOnceRef = useRef(false)

    currentUserIdRef.current = user?.id ?? null

    // ─── Derived state ───────────────────────────────────────

    const workspace = useMemo(() => {
        if (!currentWsId) return null
        return workspaces.find((w) => w.id === currentWsId) ?? null
    }, [workspaces, currentWsId])

    const userRole = workspace?.role ?? null

    // ─── Realtime cleanup ────────────────────────────────────

    const cleanupRealtimeChannels = useCallback(() => {
        unsubscribeChannel(pagesChannelRef.current)
        unsubscribeChannel(wsChannelRef.current)
        unsubscribeChannel(presenceChannelRef.current)
        pagesChannelRef.current = null
        wsChannelRef.current = null
        presenceChannelRef.current = null
    }, [])

    // ─── Realtime setup ──────────────────────────────────────

    const setupRealtime = useCallback((wsId: string) => {
        cleanupRealtimeChannels()

        if (!user || isGuest) return

        pagesChannelRef.current = subscribeToPagesChanges(
            wsId,
            (page) => {
                setPages((prev) => ({ ...prev, [page.id]: page }))
            },
            (page) => {
                setPages((prev) => ({ ...prev, [page.id]: page }))
            },
            (pageId) => {
                setPages((prev) => {
                    const next = { ...prev }
                    delete next[pageId]
                    return next
                })
            },
            user.id
        )

        wsChannelRef.current = subscribeToWorkspaceChanges(wsId, (updates) => {
            setWorkspaces((prev) =>
                prev.map((w) => (w.id === wsId ? { ...w, ...updates } : w))
            )
        })

        presenceChannelRef.current = subscribeToPresence(
            wsId,
            user.id,
            {
                email: user.email ?? 'unknown',
                first_name: profile?.first_name,
                last_name: profile?.last_name,
                avatar_url: profile?.avatar_url,
            },
            (users) => setOnlineUsers(users)
        )
    }, [user, isGuest, profile, cleanupRealtimeChannels])

    // ─── Initial load ────────────────────────────────────────



    useEffect(() => {
        if (authLoading) return
        let cancelled = false
        const loadData = async () => {
            if (!hasLoadedOnceRef.current) {
                setLoading(true)
            }

            try {
                if (user && !isGuest) {

                    // Try migration first
                    const migrated = await migrateOldCloudData(user.id)
                    let wsList = migrated ?? await fetchUserWorkspaces(user.id)

                    if (!wsList.length) {
                        const local = loadAppData()
                        for (const [, lws] of Object.entries(local.workspaces)) {
                            const created = await createWorkspaceInCloud(
                                user.id, lws.name, lws.darkMode
                            )
                            if (!created) continue
                            for (const page of Object.values(lws.pages ?? {})) {
                                await savePageToCloud(created.id, page, user.id)
                            }
                            await updateWorkspaceInCloud(created.id, { pageOrder: lws.pageOrder })
                            wsList.push({ ...created, pageOrder: lws.pageOrder })
                        }
                    }

                    if (cancelled) return
                    setWorkspaces(wsList)

                    const savedId = loadCurrentWorkspaceId()
                    const startId = wsList.find((w) => w.id === savedId)?.id ?? wsList[0]?.id ?? null
                    setCurrentWsId(startId)

                    if (startId) {
                        const pgs = await fetchWorkspacePages(startId)
                        if (!cancelled) setPages(pgs)

                        const mems = await fetchMembers(startId)
                        if (!cancelled) setMembers(mems)

                        const invs = await fetchWorkspaceInvites(startId)
                        if (!cancelled) setInvites(invs)
                    }
                } else {

                    const local = loadAppData()
                    const wsList = Object.values(local.workspaces).map((w) => ({
                        id: w.id,
                        name: w.name,
                        pageOrder: w.pageOrder,
                        darkMode: w.darkMode,
                    }))
                    setWorkspaces(wsList)

                    const savedId = loadCurrentWorkspaceId()
                    const startId = wsList.find((w) => w.id === savedId)?.id
                        ?? local.currentWorkspaceId
                        ?? wsList[0]?.id ?? null
                    setCurrentWsId(startId)

                    if (startId && local.workspaces[startId]) {
                        setPages(local.workspaces[startId].pages ?? {})
                    }
                }
            } catch (error) {
                console.error('Failed to load workspace:', error)
                const local = loadAppData()
                const wsList = Object.values(local.workspaces).map((w) => ({
                    id: w.id, name: w.name, pageOrder: w.pageOrder, darkMode: w.darkMode,
                }))
                setWorkspaces(wsList)
                setCurrentWsId(local.currentWorkspaceId)
                const fallbackWs = local.workspaces[local.currentWorkspaceId]
                if (fallbackWs) {
                    setPages(fallbackWs.pages ?? {})
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    hasLoadedOnceRef.current = true
                }
            }
        }


        loadData()
        return () => { cancelled = true }
    }, [user, isGuest, authLoading])

    // Set up realtime when workspace changes
    useEffect(() => {
        if (currentWsId && user && !isGuest) {
            setupRealtime(currentWsId)
        }
        return cleanupRealtimeChannels
    }, [currentWsId, user, isGuest, setupRealtime, cleanupRealtimeChannels])

    // Persist currentWsId preference
    useEffect(() => {
        if (currentWsId) saveCurrentWorkspaceId(currentWsId)
    }, [currentWsId])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupRealtimeChannels()
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        }
    }, [cleanupRealtimeChannels])

    // ─── Sync helpers ────────────────────────────────────────

    const [conflictPageId, setConflictPageId] = useState<string | null>(null)

    const syncPageToCloud = useCallback((page: Page) => {
        if (!user || isGuest || !currentWsId) return

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = setTimeout(async () => {
            setSyncing(true)
            try {
                const result = await savePageToCloud(currentWsId, page, user.id)
                if (result === 'conflict') {
                    setConflictPageId(page.id)
                    setTimeout(() => setConflictPageId(null), 5000)
                }
            } finally {
                setSyncing(false)
            }
        }, SYNC_DEBOUNCE_MS)
    }, [user, isGuest, currentWsId])

    const syncWorkspaceSettingsToCloud = useCallback((updates: Partial<WorkspaceData>) => {
        if (!user || isGuest || !currentWsId) return
        setSyncing(true)
        updateWorkspaceInCloud(currentWsId, updates).finally(() => setSyncing(false))
    }, [user, isGuest, currentWsId])

    const syncNow = useCallback(async () => {
        if (!user || isGuest || !currentWsId) return
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        setSyncing(true)
        try {
            for (const page of Object.values(pages)) {
                await savePageToCloud(currentWsId, page, user.id)
            }
            if (workspace) {
                await updateWorkspaceInCloud(currentWsId, {
                    name: workspace.name,
                    darkMode: workspace.darkMode,
                    pageOrder: workspace.pageOrder,
                })
            }
        } finally {
            setSyncing(false)
        }
    }, [user, isGuest, currentWsId, pages, workspace])

    // Save to local storage for guest mode
    const saveLocalState = useCallback(() => {
        if (user && !isGuest) return
        if (!currentWsId) return

        const appData = loadAppData()
        const ws = workspaces.find((w) => w.id === currentWsId)
        if (ws) {
            appData.workspaces[currentWsId] = {
                ...ws,
                pages,
            }
            appData.currentWorkspaceId = currentWsId
            saveAppData(appData)
        }
    }, [user, isGuest, currentWsId, workspaces, pages])

    // ─── Page mutations ──────────────────────────────────────

    const setPage = useCallback((page: Page) => {
        setPages((prev) => ({ ...prev, [page.id]: page }))
        syncPageToCloud(page)
        saveLocalState()
    }, [syncPageToCloud, saveLocalState])

    const createPage = useCallback((parentId: string | null = null): string => {
        const newPage: Page = {
            id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title: '',
            blocks: [{ id: `block-${Date.now()}`, type: 'text', content: '' }],
            parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        setPages((prev) => ({ ...prev, [newPage.id]: newPage }))

        setWorkspaces((prev) =>
            prev.map((w) =>
                w.id === currentWsId
                    ? { ...w, pageOrder: [...w.pageOrder, newPage.id] }
                    : w
            )
        )

        if (user && !isGuest && currentWsId) {
            savePageToCloud(currentWsId, newPage, user.id)
            const ws = workspaces.find((w) => w.id === currentWsId)
            if (ws) {
                updateWorkspaceInCloud(currentWsId, {
                    pageOrder: [...ws.pageOrder, newPage.id],
                })
            }
        } else {
            saveLocalState()
        }

        return newPage.id
    }, [currentWsId, user, isGuest, workspaces, saveLocalState])

    const deletePage = useCallback((pageId: string) => {
        const collectIds = (id: string, all: Record<string, Page>): string[] => {
            const children = Object.values(all).filter((p) => p.parentId === id)
            return [id, ...children.flatMap((c) => collectIds(c.id, all))]
        }

        setPages((prev) => {
            const toDelete = collectIds(pageId, prev)
            const next = { ...prev }
            for (const id of toDelete) delete next[id]

            if (user && !isGuest && currentWsId) {
                for (const id of toDelete) deletePageFromCloud(currentWsId, id)
            }

            return next
        })

        setWorkspaces((prev) =>
            prev.map((w) => {
                if (w.id !== currentWsId) return w
                const newOrder = w.pageOrder.filter((id) => id !== pageId)
                if (user && !isGuest && currentWsId) {
                    updateWorkspaceInCloud(currentWsId, { pageOrder: newOrder })
                }
                return { ...w, pageOrder: newOrder }
            })
        )

        saveLocalState()
    }, [currentWsId, user, isGuest, saveLocalState])

    // ─── Workspace mutations ─────────────────────────────────

    const setWorkspaceSettings = useCallback(
        (settings: Partial<Pick<WorkspaceData, 'name' | 'darkMode' | 'pageOrder'>>) => {
            setWorkspaces((prev) =>
                prev.map((w) => (w.id === currentWsId ? { ...w, ...settings } : w))
            )
            syncWorkspaceSettingsToCloud(settings)
            saveLocalState()
        },
        [currentWsId, syncWorkspaceSettingsToCloud, saveLocalState]
    )

    const switchWorkspace = useCallback(async (id: string) => {
        setCurrentWsId(id)
        setPages({})
        setMembers([])
        setInvites([])
        setOnlineUsers([])

        if (user && !isGuest) {
            setLoading(true)
            try {
                const [pgs, mems, invs] = await Promise.all([
                    fetchWorkspacePages(id),
                    fetchMembers(id),
                    fetchWorkspaceInvites(id),
                ])
                setPages(pgs)
                setMembers(mems)
                setInvites(invs)
            } finally {
                setLoading(false)
            }
        } else {
            const appData = loadAppData()
            setPages(appData.workspaces[id]?.pages ?? {})
        }
    }, [user, isGuest])

    const createWorkspaceAction = useCallback((name: string): string => {
        if (user && !isGuest) {
            const tempId = `ws-${Date.now()}`
            const tempWs: WorkspaceData = { id: tempId, name, pageOrder: [], darkMode: false, role: 'owner' }
            setWorkspaces((prev) => [...prev, tempWs])
            setCurrentWsId(tempId)
            setPages({})

            createWorkspaceInCloud(user.id, name).then((ws) => {
                if (!ws) return
                setWorkspaces((prev) =>
                    prev.map((w) => (w.id === tempId ? ws : w))
                )
                setCurrentWsId(ws.id)
            })

            return tempId
        } else {
            const ws = createEmptyWorkspace(name)
            setWorkspaces((prev) => [...prev, ws])
            setCurrentWsId(ws.id)
            setPages({})

            const appData = loadAppData()
            appData.workspaces[ws.id] = { ...ws, pages: {} }
            appData.currentWorkspaceId = ws.id
            saveAppData(appData)

            return ws.id
        }
    }, [user, isGuest])

    const deleteWorkspaceAction = useCallback((id: string) => {
        setWorkspaces((prev) => {
            if (prev.length <= 1) return prev
            const remaining = prev.filter((w) => w.id !== id)
            if (currentWsId === id) {
                const newId = remaining[0]?.id ?? null
                setCurrentWsId(newId)
                if (newId && user && !isGuest) {
                    fetchWorkspacePages(newId).then(setPages)
                } else if (newId) {
                    const appData = loadAppData()
                    setPages(appData.workspaces[newId]?.pages ?? {})
                }
            }
            return remaining
        })

        if (user && !isGuest) {
            deleteWorkspaceFromCloud(id)
        } else {
            const appData = loadAppData()
            delete appData.workspaces[id]
            saveAppData(appData)
        }
    }, [currentWsId, user, isGuest])

    const renameWorkspaceAction = useCallback((id: string, name: string) => {
        setWorkspaces((prev) =>
            prev.map((w) => (w.id === id ? { ...w, name } : w))
        )
        if (user && !isGuest) {
            updateWorkspaceInCloud(id, { name })
        } else {
            const appData = loadAppData()
            if (appData.workspaces[id]) {
                appData.workspaces[id].name = name
                saveAppData(appData)
            }
        }
    }, [user, isGuest])

    // ─── Sharing ─────────────────────────────────────────────

    const createInviteLink = useCallback(async (role: Exclude<MemberRole, 'owner'>): Promise<string | null> => {
        if (!user || isGuest || !currentWsId) return null
        const invite = await createInviteApi(currentWsId, role, user.id, 72)
        if (!invite) return null
        setInvites((prev) => [...prev, invite])
        return `${window.location.origin}/invite/${invite.token}`
    }, [user, isGuest, currentWsId])

    const revokeInviteLinkAction = useCallback(async (inviteId: string) => {
        await revokeInviteApi(inviteId)
        setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    }, [])

    const removeMemberAction = useCallback(async (userId: string) => {
        if (!currentWsId) return
        await removeMemberApi(currentWsId, userId)
        setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    }, [currentWsId])

    const updateMemberRoleAction = useCallback(async (userId: string, role: MemberRole) => {
        if (!currentWsId) return
        await updateMemberRoleApi(currentWsId, userId, role)
        setMembers((prev) =>
            prev.map((m) => (m.user_id === userId ? { ...m, role } : m))
        )
    }, [currentWsId])

    // ─── Context value ───────────────────────────────────────

    const value = useMemo<WorkspaceContextValue>(
        () => ({
            workspace,
            workspaces,
            pages,
            members,
            invites,
            onlineUsers,
            loading,
            syncing,
            userRole,
            conflictPageId,
            setPage,
            createPage,
            deletePage,
            setWorkspaceSettings,
            switchWorkspace,
            createWorkspace: createWorkspaceAction,
            deleteWorkspace: deleteWorkspaceAction,
            renameWorkspace: renameWorkspaceAction,
            createInviteLink,
            revokeInviteLink: revokeInviteLinkAction,
            removeMemberFromWorkspace: removeMemberAction,
            updateMemberRoleInWorkspace: updateMemberRoleAction,
            syncNow,
        }),
        [
            workspace, workspaces, pages, members, invites, onlineUsers,
            loading, syncing, userRole, conflictPageId,
            setPage, createPage, deletePage, setWorkspaceSettings,
            switchWorkspace, createWorkspaceAction, deleteWorkspaceAction,
            renameWorkspaceAction, createInviteLink, revokeInviteLinkAction,
            removeMemberAction, updateMemberRoleAction, syncNow,
        ]
    )

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>")
    return ctx
}
