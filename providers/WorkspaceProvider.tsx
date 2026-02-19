"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from "react"
import { WorkspaceData, AppData } from "@/lib/types"
import { useAuth } from "./AuthProvider"
import { loadAppData, saveAppData, createEmptyWorkspace } from "@/lib/storage"
import { fetchAppData, saveAppDataToCloud } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkspaceContextValue = {
    workspace: WorkspaceData | null
    workspaces: WorkspaceData[]
    loading: boolean
    syncing: boolean
    setWorkspace: (workspace: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => void
    switchWorkspace: (id: string) => void
    createWorkspace: (name: string) => string
    deleteWorkspace: (id: string) => void
    renameWorkspace: (id: string, name: string) => void
    syncNow: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

const SYNC_DEBOUNCE_MS = 2000

// ─── Provider ────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user, isGuest, loading: authLoading } = useAuth()
    const [appData, setAppDataState] = useState<AppData | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastSyncedRef = useRef<string | null>(null)

    useEffect(() => {
        if (authLoading) return

        const loadData = async () => {
            if (!appData) setLoading(true)
            try {
                if (user && !isGuest) {
                    const cloudData = await fetchAppData(user.id)
                    if (cloudData) {
                        setAppDataState(cloudData)
                        lastSyncedRef.current = JSON.stringify(cloudData)
                    } else {
                        const localData = loadAppData()
                        setAppDataState(localData)
                        await saveAppDataToCloud(user.id, localData)
                        lastSyncedRef.current = JSON.stringify(localData)
                    }
                } else {
                    setAppDataState(loadAppData())
                }
            } catch (error) {
                console.error('Failed to load workspace:', error)
                setAppDataState(loadAppData())
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, isGuest, authLoading])

    const syncToStorage = useCallback(async (ad: AppData) => {
        saveAppData(ad)

        if (user && !isGuest) {
            const currentData = JSON.stringify(ad)
            if (currentData === lastSyncedRef.current) return

            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)

            syncTimeoutRef.current = setTimeout(async () => {
                setSyncing(true)
                try {
                    const success = await saveAppDataToCloud(user.id, ad)
                    if (success) lastSyncedRef.current = currentData
                } finally {
                    setSyncing(false)
                }
            }, SYNC_DEBOUNCE_MS)
        }
    }, [user, isGuest])

    useEffect(() => {
        if (!appData || loading) return
        syncToStorage(appData)
    }, [appData, loading, syncToStorage])

    useEffect(() => {
        return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current) }
    }, [])

    const syncNow = useCallback(async () => {
        if (!appData || !user || isGuest) return
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        setSyncing(true)
        try {
            const success = await saveAppDataToCloud(user.id, appData)
            if (success) lastSyncedRef.current = JSON.stringify(appData)
        } finally {
            setSyncing(false)
        }
    }, [appData, user, isGuest])

    // ─── Derived state ───────────────────────────────────────

    const workspace = useMemo(() => {
        if (!appData) return null
        return appData.workspaces[appData.currentWorkspaceId] ?? null
    }, [appData])

    const workspaces = useMemo(() => {
        if (!appData) return []
        return Object.values(appData.workspaces)
    }, [appData])

    // ─── Workspace mutations ─────────────────────────────────

    const setWorkspace = useCallback(
        (updater: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => {
            setAppDataState((prev) => {
                if (!prev) return prev
                const currentWs = prev.workspaces[prev.currentWorkspaceId] ?? null
                const newWs = typeof updater === 'function' ? updater(currentWs) : updater
                if (!newWs) return prev
                return {
                    ...prev,
                    workspaces: { ...prev.workspaces, [prev.currentWorkspaceId]: newWs },
                }
            })
        },
        []
    )

    const switchWorkspace = useCallback((id: string) => {
        setAppDataState((prev) => {
            if (!prev || !prev.workspaces[id]) return prev
            return { ...prev, currentWorkspaceId: id }
        })
    }, [])

    const createWorkspace = useCallback((name: string): string => {
        const ws = createEmptyWorkspace(name)
        setAppDataState((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                currentWorkspaceId: ws.id,
                workspaces: { ...prev.workspaces, [ws.id]: ws },
            }
        })
        return ws.id
    }, [])

    const deleteWorkspace = useCallback((id: string) => {
        setAppDataState((prev) => {
            if (!prev) return prev
            const ids = Object.keys(prev.workspaces)
            if (ids.length <= 1) return prev // can't delete last workspace
            const newWorkspaces = { ...prev.workspaces }
            delete newWorkspaces[id]
            const newCurrentId = prev.currentWorkspaceId === id
                ? Object.keys(newWorkspaces)[0]!
                : prev.currentWorkspaceId
            return { ...prev, currentWorkspaceId: newCurrentId, workspaces: newWorkspaces }
        })
    }, [])

    const renameWorkspace = useCallback((id: string, name: string) => {
        setAppDataState((prev) => {
            if (!prev || !prev.workspaces[id]) return prev
            return {
                ...prev,
                workspaces: {
                    ...prev.workspaces,
                    [id]: { ...prev.workspaces[id], name },
                },
            }
        })
    }, [])

    const value = useMemo<WorkspaceContextValue>(
        () => ({ workspace, workspaces, loading, syncing, setWorkspace, switchWorkspace, createWorkspace, deleteWorkspace, renameWorkspace, syncNow }),
        [workspace, workspaces, loading, syncing, setWorkspace, switchWorkspace, createWorkspace, deleteWorkspace, renameWorkspace, syncNow]
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
