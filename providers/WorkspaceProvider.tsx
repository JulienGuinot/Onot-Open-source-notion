"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from "react"
import { WorkspaceData } from "@/lib/types"
import { useAuth } from "./AuthProvider"
import { loadWorkspace, saveWorkspace } from "@/lib/storage"
import { fetchWorkspace, saveWorkspaceToCloud } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkspaceContextValue = {
    workspace: WorkspaceData | null
    loading: boolean
    syncing: boolean
    setWorkspace: (workspace: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => void
    syncNow: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

// ─── Constants ───────────────────────────────────────────────────────────────

const SYNC_DEBOUNCE_MS = 2000

// ─── Provider ────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user, isGuest, loading: authLoading } = useAuth()
    const [workspace, setWorkspaceState] = useState<WorkspaceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastSyncedRef = useRef<string | null>(null)

    // Load workspace based on auth state
    useEffect(() => {
        if (authLoading) return

        const loadData = async () => {
            setLoading(true)
            try {
                if (user && !isGuest) {
                    // Authenticated user: try cloud first, fallback to local
                    const cloudData = await fetchWorkspace(user.id)
                    if (cloudData) {
                        setWorkspaceState(cloudData)
                        lastSyncedRef.current = JSON.stringify(cloudData)
                    } else {
                        // First time user or no cloud data - use local and sync up
                        const localData = loadWorkspace()
                        setWorkspaceState(localData)
                        await saveWorkspaceToCloud(user.id, localData)
                        lastSyncedRef.current = JSON.stringify(localData)
                    }
                } else {
                    // Guest mode: local storage only
                    const localData = loadWorkspace()
                    setWorkspaceState(localData)
                }
            } catch (error) {
                console.error('Failed to load workspace:', error)
                setWorkspaceState(loadWorkspace())
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, isGuest, authLoading])

    // Sync workspace to storage
    const syncToStorage = useCallback(async (ws: WorkspaceData) => {
        // Always save to local storage (offline backup)
        saveWorkspace(ws)

        // If authenticated, also sync to cloud with debounce
        if (user && !isGuest) {
            const currentData = JSON.stringify(ws)
            
            // Skip if data hasn't changed
            if (currentData === lastSyncedRef.current) return

            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }

            syncTimeoutRef.current = setTimeout(async () => {
                setSyncing(true)
                try {
                    const success = await saveWorkspaceToCloud(user.id, ws)
                    if (success) {
                        lastSyncedRef.current = currentData
                    }
                } finally {
                    setSyncing(false)
                }
            }, SYNC_DEBOUNCE_MS)
        }
    }, [user, isGuest])

    // Save workspace on change
    useEffect(() => {
        if (!workspace || loading) return
        syncToStorage(workspace)
    }, [workspace, loading, syncToStorage])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [])

    // Manual sync trigger
    const syncNow = useCallback(async () => {
        if (!workspace || !user || isGuest) return
        
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        setSyncing(true)
        try {
            const success = await saveWorkspaceToCloud(user.id, workspace)
            if (success) {
                lastSyncedRef.current = JSON.stringify(workspace)
            }
        } finally {
            setSyncing(false)
        }
    }, [workspace, user, isGuest])

    // Wrapper for setWorkspace
    const setWorkspace = useCallback(
        (updater: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => {
            setWorkspaceState((prev) => {
                if (typeof updater === 'function') {
                    return updater(prev)
                }
                return updater
            })
        },
        []
    )

    const value = useMemo<WorkspaceContextValue>(
        () => ({ workspace, loading, syncing, setWorkspace, syncNow }),
        [workspace, loading, syncing, setWorkspace, syncNow]
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
