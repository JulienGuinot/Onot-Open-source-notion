import { useState, useCallback, useRef, useEffect } from 'react'

interface HistoryState<T> {
    past: T[]
    present: T
    future: T[]
}

interface UseHistoryOptions {
    maxHistory?: number
    debounceMs?: number
}

export function useHistory<T>(
    initialState: T,
    options: UseHistoryOptions = {}
) {
    const { maxHistory = 50, debounceMs = 300 } = options
    
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: [],
    })

    const lastUpdateTime = useRef<number>(0)
    const pendingState = useRef<T | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Sync present with external state changes
    const syncState = useCallback((newState: T) => {
        setHistory(prev => ({
            ...prev,
            present: newState,
        }))
    }, [])

    // Push a new state to history (with debouncing)
    const pushState = useCallback((newState: T, immediate = false) => {
        const now = Date.now()
        
        if (immediate || now - lastUpdateTime.current > debounceMs) {
            // Immediate push
            lastUpdateTime.current = now
            
            setHistory(prev => {
                // Don't add duplicate states
                if (JSON.stringify(prev.present) === JSON.stringify(newState)) {
                    return prev
                }
                
                const newPast = [...prev.past, prev.present]
                // Limit history size
                if (newPast.length > maxHistory) {
                    newPast.shift()
                }
                
                return {
                    past: newPast,
                    present: newState,
                    future: [], // Clear future on new action
                }
            })
        } else {
            // Debounce - update pending state
            pendingState.current = newState
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            
            timeoutRef.current = setTimeout(() => {
                if (pendingState.current) {
                    pushState(pendingState.current, true)
                    pendingState.current = null
                }
            }, debounceMs)
            
            // Still update present for immediate feedback
            setHistory(prev => ({
                ...prev,
                present: newState,
            }))
        }
    }, [debounceMs, maxHistory])

    // Undo - go back in history
    const undo = useCallback((): T | null => {
        let result: T | null = null
        
        setHistory(prev => {
            if (prev.past.length === 0) {
                return prev
            }
            
            const newPast = [...prev.past]
            const previousState = newPast.pop()!
            
            result = previousState
            
            return {
                past: newPast,
                present: previousState,
                future: [prev.present, ...prev.future],
            }
        })
        
        return result
    }, [])

    // Redo - go forward in history
    const redo = useCallback((): T | null => {
        let result: T | null = null
        
        setHistory(prev => {
            if (prev.future.length === 0) {
                return prev
            }
            
            const newFuture = [...prev.future]
            const nextState = newFuture.shift()!
            
            result = nextState
            
            return {
                past: [...prev.past, prev.present],
                present: nextState,
                future: newFuture,
            }
        })
        
        return result
    }, [])

    // Clear history
    const clearHistory = useCallback(() => {
        setHistory(prev => ({
            past: [],
            present: prev.present,
            future: [],
        }))
    }, [])

    // Check if can undo/redo
    const canUndo = history.past.length > 0
    const canRedo = history.future.length > 0

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return {
        state: history.present,
        pushState,
        syncState,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
        historyLength: history.past.length,
        futureLength: history.future.length,
    }
}

