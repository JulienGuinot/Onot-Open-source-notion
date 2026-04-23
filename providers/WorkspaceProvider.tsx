"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import type { WorkspaceData, Page, WorkspaceMember, WorkspaceInvite, MemberRole, PresenceUser } from "@/lib/types"
import { useAuth } from "./AuthProvider"
import { loadAppData, saveAppData, createEmptyWorkspace, loadCurrentWorkspaceId, saveCurrentWorkspaceId, getDefaultPages, loadCloudAppData, saveCloudWorkspaceSnapshot, clearCloudWorkspaceDirty, isCloudWorkspaceDirty } from "@/lib/storage"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { subscribeToPagesChanges, subscribeToPresence, subscribeToWorkspaceChanges, unsubscribeChannel } from "@/lib/operations/realtime"
import { deletePageFromCloud, fetchWorkspacePages, savePageToCloud } from "@/lib/operations/pages"
import { createWorkspaceInCloud, deleteWorkspaceFromCloud, fetchUserWorkspaces, updateWorkspaceInCloud } from "@/lib/operations/workspaces"
import { createInvite, fetchWorkspaceInvites, fetchWorkspaceMembers, removeMember, revokeInvite, updateMemberRole } from "@/lib/operations/collaboration"
import { migrateOldCloudData } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

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
    hasUnsavedChanges: boolean

    setPage: (page: Page) => void
    createPage: (parentId?: string | null) => string
    createFolder: (parentId?: string | null) => string
    deletePage: (pageId: string) => void
    movePage: (dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => void

    setWorkspaceSettings: (settings: Partial<Pick<WorkspaceData, "name" | "darkMode" | "pageOrder">>) => void
    switchWorkspace: (id: string) => Promise<void>
    createWorkspace: (name: string) => string
    deleteWorkspace: (id: string) => void
    renameWorkspace: (id: string, name: string) => void

    createInviteLink: (role: Exclude<MemberRole, "owner">) => Promise<string | null>
    revokeInviteLink: (inviteId: string) => Promise<void>
    removeMemberFromWorkspace: (userId: string) => Promise<void>
    updateMemberRoleInWorkspace: (userId: string, role: MemberRole) => Promise<void>

    syncNow: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [conflictPageId, setConflictPageId] = useState<string | null>(null)

    const syncTimer = useRef<NodeJS.Timeout | null>(null)
    const pagesChannel = useRef<RealtimeChannel | null>(null)
    const wsChannel = useRef<RealtimeChannel | null>(null)
    const presenceChannel = useRef<RealtimeChannel | null>(null)
    const skipNextCloudDirtySnapshot = useRef(false)

    // Refs miroirs — toujours à jour, utilisés dans syncNow pour éviter les closures stale
    const pagesRef = useRef(pages)
    const workspacesRef = useRef(workspaces)
    const currentWsIdRef = useRef(currentWsId)
    useEffect(() => { pagesRef.current = pages }, [pages])
    useEffect(() => { workspacesRef.current = workspaces }, [workspaces])
    useEffect(() => { currentWsIdRef.current = currentWsId }, [currentWsId])


    useEffect(() => {
        setHasUnsavedChanges(true)
    }, [pages, workspaces])


    const isCloud = Boolean(user && !isGuest)

    // ─── Helpers ──────────────────────────────────────────────

    const workspace = workspaces.find(w => w.id === currentWsId) ?? null
    const userRole = workspace?.role ?? null

    function cleanupRealtime() {
        unsubscribeChannel(pagesChannel.current)
        unsubscribeChannel(wsChannel.current)
        unsubscribeChannel(presenceChannel.current)
        pagesChannel.current = wsChannel.current = presenceChannel.current = null
    }

    function saveLocal(nextPages = pages, nextWorkspaces = workspaces) {
        if (isCloud || !currentWsId) return
        const app = loadAppData()
        const ws = nextWorkspaces.find(w => w.id === currentWsId)
        if (ws) {
            app.workspaces[currentWsId] = { ...ws, pages: nextPages }
            app.currentWorkspaceId = currentWsId
            saveAppData(app)
        }
    }

    function loadCachedCloudWorkspace(userId: string) {
        const cached = loadCloudAppData(userId)
        if (!cached) return false

        const wsList = Object.values(cached.workspaces).map(({ id, name, pageOrder, darkMode, role }) => ({
            id,
            name,
            pageOrder,
            darkMode,
            role,
        }))
        const savedId = loadCurrentWorkspaceId()
        const startId = wsList.find(w => w.id === savedId)?.id ?? cached.currentWorkspaceId ?? wsList[0]?.id ?? null

        setWorkspaces(wsList)
        setCurrentWsId(startId)
        setPages(startId ? cached.workspaces[startId]?.pages ?? {} : {})
        setMembers([])
        setInvites([])
        setOnlineUsers([])
        skipNextCloudDirtySnapshot.current = true
        return true
    }

    async function syncCachedCloudWorkspace(userId: string, cached: WorkspaceData) {
        if (!cached.pages) return

        try {
            const results = await Promise.all([
                ...Object.values(cached.pages).map((page) => savePageToCloud(cached.id, page, userId)),
                updateWorkspaceInCloud(cached.id, {
                    name: cached.name,
                    darkMode: cached.darkMode,
                    pageOrder: cached.pageOrder,
                }),
            ])

            if (results.every((result) => result === true)) {
                clearCloudWorkspaceDirty(userId, cached.id)
            }
        } catch (error) {
            console.error("Failed to sync cached workspace:", error)
        }
    }

    // ─── Initial load ─────────────────────────────────────────

    useEffect(() => {
        if (authLoading) return
        let cancelled = false

        async function load() {
            setLoading(true)
            try {
                if (isCloud) {
                    const migrated = await migrateOldCloudData(user!.id)
                    let wsList = migrated ?? await fetchUserWorkspaces(user!.id)

                    if (cancelled) return

                    if (wsList.length === 0) {
                        try {
                            const created = await createWorkspaceInCloud(user!.id, "My Workspace")
                            if (created) {
                                const defaultPages = getDefaultPages()
                                const pageOrder: string[] = []
                                for (const page of Object.values(defaultPages)) {
                                    await savePageToCloud(created.id, page, user!.id)
                                    pageOrder.push(page.id)
                                }
                                await updateWorkspaceInCloud(created.id, { pageOrder })
                                created.pageOrder = pageOrder
                                wsList = [created]
                            }
                        } catch (e) {
                            console.error("Failed to auto-create default workspace:", e)
                        }
                        if (cancelled) return
                    }

                    setWorkspaces(wsList)

                    const savedId = loadCurrentWorkspaceId()
                    const startId = wsList.find(w => w.id === savedId)?.id ?? wsList[0]?.id ?? null
                    setCurrentWsId(startId)

                    if (startId) {
                        const [pgs, mems, invs] = await Promise.all([
                            fetchWorkspacePages(startId),
                            fetchWorkspaceMembers(startId),
                            fetchWorkspaceInvites(startId),
                        ])
                        if (!cancelled) {
                            const cached = loadCloudAppData(user!.id)
                            const cachedWorkspace = cached?.workspaces[startId]
                            const hasDirtyCache = Boolean(cachedWorkspace?.pages && isCloudWorkspaceDirty(user!.id, startId))
                            const pagesToUse = hasDirtyCache ? cachedWorkspace!.pages! : pgs
                            const workspacesToUse = hasDirtyCache
                                ? wsList.map(w => w.id === startId ? { ...w, ...cachedWorkspace, pages: undefined } : w)
                                : wsList

                            skipNextCloudDirtySnapshot.current = true
                            setWorkspaces(workspacesToUse)
                            setPages(pagesToUse); setMembers(mems); setInvites(invs)
                            saveCloudWorkspaceSnapshot(user!.id, startId, workspacesToUse, pagesToUse)
                            if (hasDirtyCache) void syncCachedCloudWorkspace(user!.id, cachedWorkspace!)
                        }
                    }
                } else {
                    const app = loadAppData()
                    const wsList = Object.values(app.workspaces).map(({ id, name, pageOrder, darkMode }) => ({ id, name, pageOrder, darkMode }))
                    const savedId = loadCurrentWorkspaceId()
                    const startId = wsList.find(w => w.id === savedId)?.id ?? app.currentWorkspaceId ?? wsList[0]?.id ?? null

                    setWorkspaces(wsList)
                    setCurrentWsId(startId)
                    if (startId) setPages(app.workspaces[startId]?.pages ?? {})
                }
            } catch (err) {
                console.error("Workspace load failed:", err)
                if (isCloud && user?.id && loadCachedCloudWorkspace(user.id)) return

                // Fallback to local
                const app = loadAppData()
                const wsList = Object.values(app.workspaces).map(({ id, name, pageOrder, darkMode }) => ({ id, name, pageOrder, darkMode }))
                setWorkspaces(wsList)
                setCurrentWsId(app.currentWorkspaceId)
                const fallback = app.workspaces[app.currentWorkspaceId]
                if (fallback) setPages(fallback.pages ?? {})
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, isGuest, authLoading])

    // Persist current workspace id
    useEffect(() => {
        if (currentWsId) saveCurrentWorkspaceId(currentWsId)
    }, [currentWsId])

    useEffect(() => {
        if (isCloud && user?.id && currentWsId && !loading) {
            if (skipNextCloudDirtySnapshot.current) {
                skipNextCloudDirtySnapshot.current = false
                saveCloudWorkspaceSnapshot(user.id, currentWsId, workspaces, pages)
                return
            }
            saveCloudWorkspaceSnapshot(user.id, currentWsId, workspaces, pages, { dirty: true })
        }
    }, [isCloud, user?.id, currentWsId, loading, workspaces, pages])

    // Realtime subscription when workspace changes
    useEffect(() => {
        if (!currentWsId || !isCloud) return
        cleanupRealtime()

        pagesChannel.current = subscribeToPagesChanges(
            currentWsId,
            page => setPages(prev => ({ ...prev, [page.id]: page })),
            page => setPages(prev => ({ ...prev, [page.id]: page })),
            id => setPages(prev => { const next = { ...prev }; delete next[id]; return next }),
            user!.id
        )
        wsChannel.current = subscribeToWorkspaceChanges(currentWsId, updates =>
            setWorkspaces(prev => prev.map(w => w.id === currentWsId ? { ...w, ...updates } : w))
        )
        presenceChannel.current = subscribeToPresence(
            currentWsId, user!.id,
            { email: user!.email ?? "", first_name: profile?.first_name, last_name: profile?.last_name, avatar_url: profile?.avatar_url },
            setOnlineUsers
        )

        return cleanupRealtime
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWsId, user?.id])

    // Cleanup on unmount
    useEffect(() => () => {
        cleanupRealtime()
        if (syncTimer.current) clearTimeout(syncTimer.current)
    }, [])

    // ─── Cloud sync (debounced) ───────────────────────────────

    function scheduleSyncPage(page: Page) {
        if (!isCloud || !currentWsId) return
        if (syncTimer.current) clearTimeout(syncTimer.current)
        syncTimer.current = setTimeout(async () => {
            setSyncing(true)
            try {
                const result = await savePageToCloud(currentWsId!, page, user!.id)
                if (result === "conflict") {
                    setConflictPageId(page.id)
                    setTimeout(() => setConflictPageId(null), 5000)
                }
            } finally {
                setSyncing(false)
            }
        }, 1500)
    }

    // ─── Page mutations ───────────────────────────────────────

    const setPage = useCallback((page: Page) => {
        setPages(prev => {
            const next = { ...prev, [page.id]: page }
            saveLocal(next)
            return next
        })
        scheduleSyncPage(page)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const createPage = useCallback((parentId: string | null = null): string => {
        const page: Page = {
            id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title: "",
            blocks: [{ id: `block-${Date.now()}`, type: "text", content: "" }],
            parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        setPages(prev => ({ ...prev, [page.id]: page }))

        setWorkspaces(prev => prev.map(w => {
            if (w.id !== currentWsId) return w
            const newOrder = [...w.pageOrder, page.id]
            if (isCloud && currentWsId) {
                savePageToCloud(currentWsId, page, user!.id)
                updateWorkspaceInCloud(currentWsId, { pageOrder: newOrder })
            }
            return { ...w, pageOrder: newOrder }
        }))

        if (!isCloud) saveLocal()
        return page.id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const createFolder = useCallback((parentId: string | null = null): string => {
        const folder: Page = {
            id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title: "",
            type: "folder",
            blocks: [],
            parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        setPages(prev => ({ ...prev, [folder.id]: folder }))

        setWorkspaces(prev => prev.map(w => {
            if (w.id !== currentWsId) return w
            const newOrder = [...w.pageOrder, folder.id]
            if (isCloud && currentWsId) {
                savePageToCloud(currentWsId, folder, user!.id)
                updateWorkspaceInCloud(currentWsId, { pageOrder: newOrder })
            }
            return { ...w, pageOrder: newOrder }
        }))

        if (!isCloud) saveLocal()
        return folder.id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const deletePage = useCallback((pageId: string) => {
        function collectIds(id: string, all: Record<string, Page>): string[] {
            return [id, ...Object.values(all).filter(p => p.parentId === id).flatMap(p => collectIds(p.id, all))]
        }

        setPages(prev => {
            const toDelete = collectIds(pageId, prev)
            const next = { ...prev }
            for (const id of toDelete) {
                delete next[id]
                if (isCloud && currentWsId) deletePageFromCloud(currentWsId, id)
            }
            return next
        })

        setWorkspaces(prev => prev.map(w => {
            if (w.id !== currentWsId) return w
            const newOrder = w.pageOrder.filter(id => id !== pageId)
            if (isCloud && currentWsId) updateWorkspaceInCloud(currentWsId, { pageOrder: newOrder })
            return { ...w, pageOrder: newOrder }
        }))

        if (!isCloud) saveLocal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const movePage = useCallback((dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
        if (dragId === targetId) return

        const allPages = pagesRef.current
        const dragPage = allPages[dragId]
        if (!dragPage) return

        // Prevent dropping into own descendants
        let cursor = allPages[targetId]
        while (cursor?.parentId) {
            if (cursor.parentId === dragId) return
            cursor = allPages[cursor.parentId]
        }

        const newParentId = position === 'inside' ? targetId : (allPages[targetId]?.parentId ?? null)
        const updatedDrag = { ...dragPage, parentId: newParentId, updatedAt: Date.now() }

        setPages(prev => ({ ...prev, [dragId]: updatedDrag }))

        setWorkspaces(prev => prev.map(w => {
            if (w.id !== currentWsId) return w
            const order = w.pageOrder.filter(id => id !== dragId)

            if (position === 'inside') {
                const lastChildIdx = order.reduce((acc, id, i) =>
                    allPages[id]?.parentId === targetId ? i : acc, -1)
                order.splice(lastChildIdx >= 0 ? lastChildIdx + 1 : order.indexOf(targetId) + 1, 0, dragId)
            } else {
                const targetIdx = order.indexOf(targetId)
                order.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, dragId)
            }

            if (isCloud && currentWsId) {
                updateWorkspaceInCloud(currentWsId, { pageOrder: order })
                savePageToCloud(currentWsId, updatedDrag, user!.id)
            }
            return { ...w, pageOrder: order }
        }))

        if (!isCloud) saveLocal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    // ─── Workspace mutations ──────────────────────────────────

    const setWorkspaceSettings = useCallback((settings: Partial<Pick<WorkspaceData, "name" | "darkMode" | "pageOrder">>) => {
        setWorkspaces(prev => prev.map(w => w.id === currentWsId ? { ...w, ...settings } : w))
        if (isCloud && currentWsId) updateWorkspaceInCloud(currentWsId, settings)
        else saveLocal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const switchWorkspace = useCallback(async (id: string) => {
        cleanupRealtime()
        setCurrentWsId(id)
        setPages({})
        setMembers([])
        setInvites([])
        setOnlineUsers([])

        if (isCloud) {
            setLoading(true)
            try {
                const [pgs, mems, invs] = await Promise.all([
                    fetchWorkspacePages(id),
                    fetchWorkspaceMembers(id),
                    fetchWorkspaceInvites(id),
                ])
                skipNextCloudDirtySnapshot.current = true
                setPages(pgs); setMembers(mems); setInvites(invs)
                saveCloudWorkspaceSnapshot(user!.id, id, workspacesRef.current, pgs)
            } finally {
                setLoading(false)
            }
        } else {
            setPages(loadAppData().workspaces[id]?.pages ?? {})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    const createWorkspace = useCallback((name: string): string => {
        if (isCloud) {
            const tempId = `ws-temp-${Date.now()}`
            const temp: WorkspaceData = { id: tempId, name, pageOrder: [], darkMode: false, role: "owner" }
            setWorkspaces(prev => [...prev, temp])
            setCurrentWsId(tempId)
            setPages({})
            createWorkspaceInCloud(user!.id, name).then(ws => {
                if (!ws) return
                setWorkspaces(prev => prev.map(w => w.id === tempId ? ws : w))
                setCurrentWsId(ws.id)
            })
            return tempId
        } else {
            const ws = createEmptyWorkspace(name)
            setWorkspaces(prev => [...prev, ws])
            setCurrentWsId(ws.id)
            setPages({})
            const app = loadAppData()
            app.workspaces[ws.id] = { ...ws, pages: {} }
            app.currentWorkspaceId = ws.id
            saveAppData(app)
            return ws.id
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    const deleteWorkspace = useCallback((id: string) => {
        setWorkspaces(prev => {
            if (prev.length <= 1) return prev
            const remaining = prev.filter(w => w.id !== id)
            if (currentWsId === id) {
                const newId = remaining[0]?.id ?? null
                setCurrentWsId(newId)
                if (newId) {
                    if (isCloud) fetchWorkspacePages(newId).then(setPages)
                    else setPages(loadAppData().workspaces[newId]?.pages ?? {})
                }
            }
            return remaining
        })
        if (isCloud) deleteWorkspaceFromCloud(id)
        else {
            const app = loadAppData()
            delete app.workspaces[id]
            saveAppData(app)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const renameWorkspace = useCallback((id: string, name: string) => {
        setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w))
        if (isCloud) updateWorkspaceInCloud(id, { name })
        else {
            const app = loadAppData()
            if (app.workspaces[id]) { app.workspaces[id].name = name; saveAppData(app) }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    // ─── Sync forcé (Ctrl+S) ─────────────────────────────────

    const syncNow = useCallback(async () => {

        if (!isCloud) {
            return
        }

        const wsId = currentWsIdRef.current
        if (!wsId) {
            return
        }


        // Annule le debounce en cours — on prend la main
        if (syncTimer.current) {
            clearTimeout(syncTimer.current)
        }

        setSyncing(true)

        try {
            const currentPages = pagesRef.current



            const currentWs = workspacesRef.current.find((w) => w.id === wsId)


            // On construit les promesses explicitement
            const promises = [
                ...Object.values(currentPages).map((page) => {
                    return savePageToCloud(wsId, page, user!.id)
                }),
            ]

            if (currentWs) {
                promises.push(
                    updateWorkspaceInCloud(wsId, {
                        name: currentWs.name,
                        darkMode: currentWs.darkMode,
                        pageOrder: currentWs.pageOrder,
                    })
                )
            }

            const results = await Promise.all(promises)
            if (results.every((result) => result === true)) {
                clearCloudWorkspaceDirty(user!.id, wsId)
            }
        } catch (err: any) {
            console.error("🟥 SYNC NOW → ERREUR DANS syncNow:", err)
            console.error("🟥 SYNC NOW → Type d'erreur:", err?.constructor?.name)
            console.error("🟥 SYNC NOW → Message:", err?.message)
        } finally {
            setSyncing(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])


    // ─── Sharing ──────────────────────────────────────────────

    const createInviteLink = useCallback(async (role: Exclude<MemberRole, "owner">): Promise<string | null> => {
        if (!isCloud || !currentWsId) return null
        const invite = await createInvite(currentWsId, role, user!.id, 72)
        if (!invite) return null
        setInvites(prev => [...prev, invite])
        return `${window.location.origin}/invite/${invite.token}`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud, currentWsId])

    const revokeInviteLink = useCallback(async (inviteId: string) => {
        await revokeInvite(inviteId)
        setInvites(prev => prev.filter(i => i.id !== inviteId))
    }, [])

    const removeMemberFromWorkspace = useCallback(async (userId: string) => {
        if (!currentWsId) return
        await removeMember(currentWsId, userId)
        setMembers(prev => prev.filter(m => m.user_id !== userId))
    }, [currentWsId])

    const updateMemberRoleInWorkspace = useCallback(async (userId: string, role: MemberRole) => {
        if (!currentWsId) return
        await updateMemberRole(currentWsId, userId, role)
        setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m))
    }, [currentWsId])


    return (
        <WorkspaceContext.Provider value={{
            workspace, workspaces, pages, members, invites, onlineUsers,
            loading, syncing, userRole, conflictPageId,
            setPage, createPage, createFolder, deletePage, movePage,
            setWorkspaceSettings, switchWorkspace, hasUnsavedChanges, createWorkspace, deleteWorkspace, renameWorkspace,
            createInviteLink, revokeInviteLink, removeMemberFromWorkspace, updateMemberRoleInWorkspace,
            syncNow,
        }}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>")
    return ctx
}
