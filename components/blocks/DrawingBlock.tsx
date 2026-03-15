'use client'

import { useState, useCallback, useRef, KeyboardEvent, useEffect, useMemo } from 'react'
import { Block } from '@/lib/types'
import dynamic from 'next/dynamic'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { Maximize2, Minimize2, Save, Trash2, Pencil } from 'lucide-react'

const Excalidraw = dynamic(
    async () => (await import('@excalidraw/excalidraw')).Excalidraw,
    { ssr: false }
)

interface DrawingBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
}

// Debounce helper
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args)
        }, delay)
    }, [callback, delay])
}

export default function DrawingBlock({ block, onUpdate, onKeyDown }: DrawingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const apiRef = useRef<any>(null)
    const { workspace } = useWorkspace()
    const isDarkMode = workspace?.darkMode ?? false

    // Parse initial data
    const initialData = useMemo(() => {
        try {
            return block.content ? JSON.parse(block.content) : null
        } catch {
            return null
        }
    }, [block.content])

    // Save function
    const saveDrawing = useCallback(async (showToast = false) => {
        const api = apiRef.current
        if (!api) return

        const elements = api.getSceneElements()
        if (!elements || elements.length === 0) {
            // Save even if empty to preserve state
        }

        const appState = api.getAppState()
        const files = api.getFiles()

        const dataToSave = {
            elements,
            appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                zoom: appState.zoom,
                scrollX: appState.scrollX,
                scrollY: appState.scrollY,
            },
            files,
        }

        if (showToast) setIsSaving(true)

        onUpdate({
            ...block,
            content: JSON.stringify(dataToSave)
        })

        setHasChanges(false)

        if (showToast) {
            setTimeout(() => setIsSaving(false), 800)
        }
    }, [block, onUpdate])

    // Debounced autosave
    const debouncedSave = useDebounce(() => saveDrawing(false), 2000)

    // Handle changes
    const handleChange = useCallback(() => {
        setHasChanges(true)
        debouncedSave()
    }, [debouncedSave])

    // Save when collapsing
    useEffect(() => {
        if (!isExpanded && hasChanges) {
            saveDrawing(false)
        }
    }, [isExpanded, hasChanges, saveDrawing])

    // Handle keyboard
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && isExpanded) {
            e.preventDefault()
            setIsExpanded(false)
        } else {
            onKeyDown?.(e)
        }
    }

    // Clear canvas
    const handleClear = useCallback(() => {
        const api = apiRef.current
        if (!api) return

        if (confirm('Do you want to delete the whole drawing ?')) {
            api.updateScene({ elements: [] })
            handleChange()
        }
    }, [handleChange])

    // Expand/collapse handlers
    const handleExpand = useCallback(() => {
        if (!isExpanded) {
            setIsExpanded(true)
        }
    }, [isExpanded])

    const handleCollapse = useCallback(() => {
        setIsExpanded(false)
    }, [])

    // UIOptions for Excalidraw
    const uiOptions = useMemo(() => ({
        canvasActions: {
            export: { saveFileToDisk: true },
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: true,
            toggleTheme: false,
            changeViewBackgroundColor: true,
        },
        tools: {
            image: true,
        },
    }), [])

    // Calculate dimensions
    const containerHeight = isExpanded ? '90vh' : 280
    const canvasHeight = isExpanded ? 'calc(90vh - 60px)' : 240

    return (
        <div
            className={`relative border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded
                ? 'fixed inset-0 z-50 m-0 rounded-none border-0 shadow-2xl'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md'
                }`}
            style={{ height: isExpanded ? '100vh' : containerHeight }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Header / Toolbar */}
            <div className={`flex items-center rounded-t-md justify-between px-4 py-3 border-b ${isExpanded
                ? 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-700'
                : 'bg-gray-50/50 dark:bg-zinc-800/50 border-gray-200 dark:border-gray-700'
                }`}>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Pencil size={16} />
                        <span className="text-sm font-medium">
                            {isExpanded ? 'Edit mode' : 'Drawing'}
                        </span>
                    </div>
                    {hasChanges && !isExpanded && (
                        <span className="text-xs text-amber-500 font-medium">
                            • Updated
                        </span>
                    )}
                    {isSaving && (
                        <span className="text-xs text-green-500 font-medium animate-pulse">
                            saving...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <>
                            {/* Save button */}
                            <button
                                onClick={() => saveDrawing(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
                            >
                                <Save size={14} />
                                Save
                            </button>

                            {/* Clear button */}
                            <button
                                onClick={handleClear}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                                Erase
                            </button>

                            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

                            {/* Collapse button */}
                            <button
                                onClick={handleCollapse}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <Minimize2 size={14} />
                                Reduce
                            </button>
                        </>
                    ) : (
                        /* Expand button */
                        <button
                            onClick={handleExpand}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            style={{ opacity: 1 }}
                        >
                            <Maximize2 size={14} />
                            Zoom
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas Container */}
            <div
                className="relative w-full"
                style={{ height: isExpanded ? 'calc(100vh - 60px)' : canvasHeight }}
                onClick={() => !isExpanded && handleExpand()}
            >
                {/* Click overlay for collapsed mode */}
                {!isExpanded && (
                    <div className="absolute inset-0 z-10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" />
                )}

                <Excalidraw
                    key={block.id + (isExpanded ? '-edit' : '-view')}
                    initialData={initialData ?? {
                        appState: {
                            viewBackgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                        }
                    }}

                    excalidrawAPI={(api) => { apiRef.current = api }}
                    viewModeEnabled={!isExpanded}
                    theme={isDarkMode ? 'dark' : 'light'}
                    UIOptions={uiOptions}
                    onChange={isExpanded ? handleChange : undefined}
                    gridModeEnabled={false}
                    zenModeEnabled={false}


                />
            </div>

            {/* Hint for collapsed mode */}
            {!isExpanded && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                    Cliquez pour éditer
                </div>
            )}
        </div>
    )
}
