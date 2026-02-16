'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'

interface CalloutBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

const CALLOUT_COLORS = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', icon: '💡' },
    { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', icon: '⚠️' },
    { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800/50', icon: '✅' },
    { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', icon: '🚫' },
    { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/50', icon: '💜' },
    { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', icon: '📝' },
]

export default function CalloutBlock({ block, onUpdate, onKeyDown }: CalloutBlockProps) {
    const [showIconPicker, setShowIconPicker] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const iconRef = useRef<HTMLButtonElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [block.content])

    const currentIcon = block.calloutIcon || '💡'
    
    // Determine color scheme based on icon
    const getColorScheme = () => {
        const icon = currentIcon
        if (['⚠️', '⚡', '🔔', '📢'].includes(icon)) return CALLOUT_COLORS[1]
        if (['✅', '✔️', '🎉', '👍'].includes(icon)) return CALLOUT_COLORS[2]
        if (['🚫', '❌', '⛔', '🔴'].includes(icon)) return CALLOUT_COLORS[3]
        if (['💜', '💗', '🦄', '✨'].includes(icon)) return CALLOUT_COLORS[4]
        if (['📝', '📋', '📎', '🗒️'].includes(icon)) return CALLOUT_COLORS[5]
        return CALLOUT_COLORS[0]
    }

    const colorScheme = getColorScheme() ?? CALLOUT_COLORS[0]!
    const bgClass = colorScheme.bg
    const borderClass = colorScheme.border

    const commonEmojis = ['💡', '⚠️', '✅', '❌', '📝', '🔥', '⭐', '💜', '🎯', '🚀', '💪', '📌', '🔔', '✨', '💬', '❓']

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${bgClass} border ${borderClass} 
                        transition-all duration-200 hover:shadow-sm group`}>
            {/* Icon button */}
            <div className="relative">
                <button
                    ref={iconRef}
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 
                               transition-colors cursor-pointer text-xl"
                    title="Change icon"
                >
                    {currentIcon}
                </button>

                {/* Icon picker dropdown */}
                {showIconPicker && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowIconPicker(false)} 
                        />
                        <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl 
                                        border border-gray-200 dark:border-gray-700 p-3 w-64 menu-animate">
                            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
                                Choose icon
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                                {commonEmojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onUpdate({ ...block, calloutIcon: emoji })
                                            setShowIconPicker(false)
                                        }}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-lg
                                                   hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                                                   ${currentIcon === emoji ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <input
                                    type="text"
                                    placeholder="Custom emoji..."
                                    maxLength={2}
                                    className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 rounded-lg 
                                               border border-gray-200 dark:border-gray-700 outline-none
                                               focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                                    onChange={(e) => {
                                        if (e.target.value.trim()) {
                                            onUpdate({ ...block, calloutIcon: e.target.value.trim() })
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Content */}
            <textarea
                ref={textareaRef}
                value={block.content}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                onKeyDown={onKeyDown}
                placeholder="Type a note..."
                className="flex-1 outline-none bg-transparent text-gray-700 dark:text-gray-300 resize-none 
                           leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[24px]"
                rows={1}
            />
        </div>
    )
}
