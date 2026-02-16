'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import supabase from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthMode = 'guest' | 'authenticated'

type AuthContextValue = {
    user: User | null
    mode: AuthMode
    loading: boolean
    isGuest: boolean
    signUp: (email: string, password: string) => Promise<void>
    signIn: (email: string, password: string) => Promise<void>
    signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
    signOut: () => Promise<void>
    continueAsGuest: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Storage Keys ────────────────────────────────────────────────────────────

const AUTH_MODE_KEY = 'onot-auth-mode'

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [mode, setMode] = useState<AuthMode>('guest')
    const [loading, setLoading] = useState(true)

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check saved auth mode
                const savedMode = localStorage.getItem(AUTH_MODE_KEY) as AuthMode | null

                if (supabase) {
                    const { data } = await supabase.auth.getUser()
                    if (data?.user) {
                        setUser(data.user)
                        setMode('authenticated')
                        localStorage.setItem(AUTH_MODE_KEY, 'authenticated')
                    } else if (savedMode === 'guest') {
                        setMode('guest')
                    }
                } else {
                    // No Supabase configured, default to guest mode
                    setMode('guest')
                }
            } catch (error) {
                console.error('Auth init failed:', error)
                setMode('guest')
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        // Subscribe to auth changes
        if (!supabase) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const newUser = session?.user || null
                setUser(newUser)
                if (newUser) {
                    setMode('authenticated')
                    localStorage.setItem(AUTH_MODE_KEY, 'authenticated')
                }
            }
        )
        return () => subscription?.unsubscribe()
    }, [])

    const continueAsGuest = useCallback(() => {
        setMode('guest')
        setUser(null)
        localStorage.setItem(AUTH_MODE_KEY, 'guest')
    }, [])

    const signUp = useCallback(async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
    }, [])

    const signIn = useCallback(async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }, [])

    const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: window.location.origin }
        })
        if (error) throw error
    }, [])

    const signOut = useCallback(async () => {
        if (!supabase) throw new Error('Supabase not configured')
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setMode('guest')
        localStorage.setItem(AUTH_MODE_KEY, 'guest')
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            mode,
            loading,
            isGuest: mode === 'guest',
            signUp,
            signIn,
            signInWithOAuth,
            signOut,
            continueAsGuest,
        }),
        [user, mode, loading, signUp, signIn, signInWithOAuth, signOut, continueAsGuest]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
    return ctx
}
