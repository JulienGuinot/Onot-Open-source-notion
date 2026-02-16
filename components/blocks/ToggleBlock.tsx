'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Block } from '@/lib/types'

interface ToggleBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export default function ToggleBlock({ block, onUpdate, onKeyDown }: ToggleBlockProps) {
    const [isOpen, setIsOpen] = useState(block.toggleOpen || false)
    const [editingChildId, setEditingChildId] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current && block.autoFocus) {
            inputRef.current.focus()
        }
    }, [block.autoFocus])

    const toggleOpen = () => {
        const newState = !isOpen
        setIsOpen(newState)
        onUpdate({ ...block, toggleOpen: newState })
    }

    const addChild = () => {
        const newChild: Block = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'text',
            content: '',
        }
        const newChildren = [...(block.children || []), newChild]
        onUpdate({ ...block, children: newChildren, toggleOpen: true })
        setIsOpen(true)
        setEditingChildId(newChild.id)
    }

    const updateChild = (childId: string, content: string) => {
        const newChildren = (block.children || []).map(child =>
            child.id === childId ? { ...child, content } : child
        )
        onUpdate({ ...block, children: newChildren })
    }

    const deleteChild = (childId: string) => {
        const newChildren = (block.children || []).filter(child => child.id !== childId)
        onUpdate({ ...block, children: newChildren })
    }

    const handleMainKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Enter on main input opens toggle and adds child
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!isOpen) {
                setIsOpen(true)
                onUpdate({ ...block, toggleOpen: true })
            }
            addChild()
            return
        }
        // Tab to open/close toggle
        if (e.key === 'Tab' && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.value.length) {
            e.preventDefault()
            toggleOpen()
            return
        }
        // Pass other key events to parent
        onKeyDown?.(e)
    }

    const handleChildKeyDown = (e: KeyboardEvent<HTMLInputElement>, childId: string, index: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            addChild()
        } else if (e.key === 'Backspace') {
            const child = block.children?.find(c => c.id === childId)
            if (child?.content === '') {
                e.preventDefault()
                deleteChild(childId)
                // Focus previous child or main input
                const prevChild = index > 0 ? block.children?.[index - 1] : undefined
                if (prevChild) {
                    setEditingChildId(prevChild.id)
                } else {
                    setEditingChildId(null)
                    inputRef.current?.focus()
                }
            }
        } else if (e.key === 'ArrowUp' && index === 0) {
            // Navigate to main input from first child
            e.preventDefault()
            setEditingChildId(null)
            inputRef.current?.focus()
        } else if (e.key === 'ArrowDown' && index === (block.children?.length || 0) - 1) {
            // Last child arrow down - pass to parent for next block navigation
            onKeyDown?.(e)
        }
    }

    return (
        <div className="group/toggle">
            {/* Toggle header */}
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

            {/* Toggle content */}
            <div 
                className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="ml-7 mt-1 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                    {(block.children || []).map((child, index) => (
                        <div key={child.id} className="flex items-center gap-2 group/child">
                            <input
                                type="text"
                                value={child.content}
                                onChange={(e) => updateChild(child.id, e.target.value)}
                                onKeyDown={(e) => handleChildKeyDown(e, child.id, index)}
                                onFocus={() => setEditingChildId(child.id)}
                                autoFocus={editingChildId === child.id}
                                placeholder="Type something..."
                                className="flex-1 outline-none bg-transparent text-gray-700 dark:text-gray-300 py-1
                                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                    ))}
                    
                    {/* Add item button */}
                    {isOpen && (
                        <button
                            onClick={addChild}
                            className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm py-1
                                       hover:text-gray-600 dark:hover:text-gray-400 transition-colors
                                       opacity-0 group-hover/toggle:opacity-100"
                        >
                            <Plus size={14} />
                            <span>Add item</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
