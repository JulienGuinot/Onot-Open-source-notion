'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import type { UserProfile } from "@/lib/types"
import supabase from "@/lib/supabase"
import { fetchProfile, upsertProfile } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthMode = 'guest' | 'authenticated'

type AuthContextValue = {
    user: User | null
    profile: UserProfile | null
    mode: AuthMode
    loading: boolean
    isGuest: boolean
    needsProfileSetup: boolean
    signUp: (email: string, password: string) => Promise<void>
    signIn: (email: string, password: string) => Promise<void>
    signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
    signOut: () => Promise<void>
    continueAsGuest: () => void
    completeProfileSetup: (data: { first_name: string; last_name: string; avatar_url: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Storage Keys ────────────────────────────────────────────────────────────

const AUTH_MODE_KEY = 'onot-auth-mode'

function isProfileIncomplete(p: UserProfile | null): boolean {
    if (!p) return true
    return !p.first_name?.trim() || !p.last_name?.trim()
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [mode, setMode] = useState<AuthMode>('guest')
    const [loading, setLoading] = useState(true)

    const loadProfile = useCallback(async (userId: string) => {
        const p = await fetchProfile(userId)
        setProfile(p)
    }, [])

    useEffect(() => {
        const initAuth = async () => {
            try {
                const savedMode = localStorage.getItem(AUTH_MODE_KEY) as AuthMode | null

                if (supabase) {
                    const { data } = await supabase.auth.getUser()
                    if (data?.user) {
                        setUser(data.user)
                        setMode('authenticated')
                        localStorage.setItem(AUTH_MODE_KEY, 'authenticated')
                        await loadProfile(data.user.id)
                    } else if (savedMode === 'guest') {
                        setMode('guest')
                    }
                } else {
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

        if (!supabase) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const newUser = session?.user || null
                setUser(newUser)
                if (newUser) {
                    setMode('authenticated')
                    localStorage.setItem(AUTH_MODE_KEY, 'authenticated')
                    await loadProfile(newUser.id)
                } else {
                    setProfile(null)
                }
            }
        )
        return () => subscription?.unsubscribe()
    }, [loadProfile])

    const continueAsGuest = useCallback(() => {
        setMode('guest')
        setUser(null)
        setProfile(null)
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
        setProfile(null)
        setMode('guest')
        localStorage.setItem(AUTH_MODE_KEY, 'guest')
    }, [])

    const completeProfileSetup = useCallback(async (data: { first_name: string; last_name: string; avatar_url: string }) => {
        if (!user) throw new Error('Not authenticated')
        const updated = await upsertProfile({
            id: user.id,
            email: user.email ?? '',
            ...data,
        })
        if (!updated) throw new Error('Failed to save profile')
        setProfile(updated)
    }, [user])

    const needsProfileSetup = mode === 'authenticated' && !loading && isProfileIncomplete(profile)

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            profile,
            mode,
            loading,
            isGuest: mode === 'guest',
            needsProfileSetup,
            signUp,
            signIn,
            signInWithOAuth,
            signOut,
            continueAsGuest,
            completeProfileSetup,
        }),
        [user, profile, mode, loading, needsProfileSetup, signUp, signIn, signInWithOAuth, signOut, continueAsGuest, completeProfileSetup]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
    return ctx
}
