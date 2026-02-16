'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import supabase from "@/lib/supabase";


type AuthContextValue = {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        try {
            if (!supabase) {
                console.warn('Supabase not initialized. Auth features will be unavailable.')
                setLoading(false)
                return
            }
            const { data } = await supabase.auth.getUser()
            setUser(data?.user || null)
        } catch (error) {
            console.error('Auth check failed:', error)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        checkUser()
        // Subscribe to auth changes
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
                setUser(session?.user || null)
            })
            return () => subscription?.unsubscribe()
        }
        return undefined
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            loading,
            async signUp(email, password) {
                if (!supabase) throw new Error('Supabase not initialized')
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
            },
            async signIn(email, password) {
                if (!supabase) throw new Error('Supabase not initialized')
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            },
            async signOut() {
                if (!supabase) throw new Error('Supabase not initialized')
                const { error } = await supabase.auth.signOut()
                if (error) throw error
            },
        }),
        [user, loading]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
