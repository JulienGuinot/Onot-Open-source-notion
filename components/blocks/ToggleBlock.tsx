'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { Block } from '@/lib/types'

interface ToggleBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    autoFocus?: boolean
}

export default function ToggleBlock({ block, onUpdate, onKeyDown, autoFocus }: ToggleBlockProps) {
    const isOpen = block.toggleOpen || false
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                    const len = inputRef.current.value.length
                    inputRef.current.setSelectionRange(len, len)
                }
            }, 0)
        }
    }, [autoFocus])

    const toggleOpen = () => {
        const newState = !isOpen
        onUpdate({ ...block, toggleOpen: newState })
    }

    const handleMainKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Tab: toggle open/close
        if (e.key === 'Tab' && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.value.length) {
            e.preventDefault()
            toggleOpen()
            return
        }
        // All other keys (including Enter) bubble up to BlockEditor
        onKeyDown?.(e)
    }

    return (
        <div className="flex items-start gap-1">
            <button
                onClick={toggleOpen}
                className="mt-0.5 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                tabIndex={-1}
            >
                <ChevronRight
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
            </button>
            <input
                ref={inputRef}
                type="text"
                value={block.content}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                onKeyDown={handleMainKeyDown}
                placeholder="Toggle title..."
                className="flex-1 outline-none bg-transparent font-medium text-gray-900 dark:text-gray-100
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    )
}
