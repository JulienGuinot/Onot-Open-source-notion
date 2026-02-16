"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { WorkspaceData } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";

type WorkspaceContextValue = {
    workspace: WorkspaceData | null;
    loading: boolean;
    setWorkspace: (workspace: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspace, setWorkspaceState] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);

    // Load workspace from local storage
    useEffect(() => {
        try {
            setLoading(true);
            const ws = loadWorkspace();
            setWorkspaceState(ws);
        } catch (error) {
            console.error('Failed to load workspace:', error);
            setWorkspaceState(loadWorkspace());
        } finally {
            setLoading(false);
        }
    }, []);

    // Save workspace (local storage)
    useEffect(() => {
        if (!workspace) return;
        saveWorkspace(workspace);
    }, [workspace]);

    // Wrapper for setWorkspace that handles updates
    const setWorkspace = (updater: WorkspaceData | ((prev: WorkspaceData | null) => WorkspaceData | null)) => {
        setWorkspaceState((prev) => {
            if (typeof updater === 'function') {
                return updater(prev);
            }
            return updater;
        });
    };

    const value = useMemo<WorkspaceContextValue>(
        () => ({ workspace, loading, setWorkspace }),
        [workspace, loading]
    );

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>");
    return ctx;
}
