'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'

interface EmojiPickerProps {
    currentEmoji?: string
    onSelect: (emoji: string) => void
}

const EMOJI_LIST = [
    '📝', '📄', '📋', '📌', '📍', '📎', '📁', '📂', '📊', '📈',
    '💡', '🔥', '⚡', '⭐', '🎯', '🎨', '🎭', '🎪', '🎬', '🎮',
    '💻', '⌨️', '🖥️', '📱', '☎️', '📞', '📟', '📠', '🔋', '🔌',
    '💼', '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖋️', '📒', '📓',
    '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪',
    '🚀', '🛸', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈',
    '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💕',
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍',
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🎸', '🎹', '🎺', '🎻', '🥁', '🎷', '🎵', '🎶', '🎤', '🎧'
]

export default function EmojiPicker({ currentEmoji, onSelect }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [customEmoji, setCustomEmoji] = useState('')
    const pickerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleEmojiSelect = (emoji: string) => {
        onSelect(emoji)
        setIsOpen(false)
    }

    const handleCustomEmojiSubmit = () => {
        if (customEmoji.trim()) {
            onSelect(customEmoji.trim())
            setCustomEmoji('')
            setIsOpen(false)
        }
    }

    return (
        <div className="relative" ref={pickerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                title="Change icon"
            >
                {currentEmoji ? (
                    <span className="text-5xl">{currentEmoji}</span>
                ) : (
                    <Smile size={48} className="text-gray-300 dark:text-gray-600" />
                )}

            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <input
                            type="text"
                            value={customEmoji}
                            onChange={(e) => setCustomEmoji(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleCustomEmojiSubmit()
                                }
                            }}
                            placeholder="Type or paste emoji..."
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                        />
                    </div>

                    <div className="p-3 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-1">
                            {EMOJI_LIST.map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    title={emoji}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <button
                            onClick={() => {
                                onSelect('')
                                setIsOpen(false)
                            }}
                            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                            Remove icon
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
