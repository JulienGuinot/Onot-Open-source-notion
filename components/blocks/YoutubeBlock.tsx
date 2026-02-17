'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'
import { Youtube, Link, X } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────

interface YoutubeBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

// ─── YouTube URL Parser ──────────────────────────────────────

function extractYoutubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match?.[1]) return match[1]
    }
    return null
}

// ─── Component ───────────────────────────────────────────────

export default function YoutubeBlock({ block, onUpdate, onKeyDown }: YoutubeBlockProps) {
    const [urlValue, setUrlValue] = useState(block.youtubeUrl || '')
    const [showUrlInput, setShowUrlInput] = useState(!block.youtubeUrl)
    const [urlError, setUrlError] = useState(false)
    const urlInputRef = useRef<HTMLInputElement>(null)

    const videoId = block.youtubeUrl ? extractYoutubeId(block.youtubeUrl) : null

    // ─── Handlers ────────────────────────────────────────────

    const handleUrlSubmit = useCallback(() => {
        const trimmed = urlValue.trim()
        if (!trimmed) return

        const id = extractYoutubeId(trimmed)
        if (id) {
            onUpdate({ ...block, youtubeUrl: trimmed, content: trimmed })
            setShowUrlInput(false)
            setUrlError(false)
        } else {
            setUrlError(true)
        }
    }, [urlValue, block, onUpdate])

    const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleUrlSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            if (block.youtubeUrl) {
                setShowUrlInput(false)
                setUrlValue(block.youtubeUrl)
                setUrlError(false)
            }
        } else {
            onKeyDown?.(e)
        }
    }

    const handleRemove = () => {
        onUpdate({ ...block, youtubeUrl: '', content: '' })
        setShowUrlInput(true)
        setUrlValue('')
        setUrlError(false)
    }

    // ─── Render: Embedded Video ──────────────────────────────

    if (videoId && !showUrlInput) {
        return (
            <div className="relative group">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                    />

                    {/* Overlay controls */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => { setShowUrlInput(true); setUrlValue(block.youtubeUrl || '') }}
                            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            title="Change video"
                        >
                            <Link size={14} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                            onClick={handleRemove}
                            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove video"
                        >
                            <X size={14} className="text-gray-600 dark:text-gray-300 hover:text-red-500" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Render: URL Input ───────────────────────────────────

    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200
                ${urlError
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
        >
            <div className="p-8 flex flex-col items-center justify-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center
                    ${urlError ? 'bg-red-100 dark:bg-red-900/30' : 'bg-red-50 dark:bg-red-900/20'}`}
                >
                    <Youtube size={24} className="text-red-500" />
                </div>

                <div className="text-center">
                    <div className={`text-sm font-medium
                        ${urlError
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        {urlError ? 'Invalid YouTube URL' : 'Embed a YouTube video'}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {urlError
                            ? 'Please paste a valid YouTube link'
                            : 'Paste a YouTube URL to embed the video'}
                    </div>
                </div>

                <div className="w-full max-w-md flex gap-2">
                    <input
                        ref={urlInputRef}
                        type="text"
                        value={urlValue}
                        onChange={(e) => { setUrlValue(e.target.value); setUrlError(false) }}
                        onKeyDown={handleUrlKeyDown}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className={`flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900
                            border rounded-lg outline-none transition-colors
                            ${urlError
                                ? 'border-red-300 dark:border-red-700 focus:border-red-400'
                                : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500'
                            }`}
                        autoFocus
                    />
                    <button
                        onClick={handleUrlSubmit}
                        disabled={!urlValue.trim()}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium
                                   hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors"
                    >
                        Embed
                    </button>
                </div>
            </div>
        </div>
    )
}
