'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Code,
    Minus,
    Image as ImageIcon,
    ChevronRight,
    AlertCircle,
    Table,
} from 'lucide-react'

export interface SlashMenuProps {
    onClose: () => void
    onSelect: (type: string) => void
    position: { top: number; left: number } | null
}

export function SlashMenu({ onClose, onSelect, position }: SlashMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    const menuItems = [
        { label: 'Heading 1', type: 'h1', icon: Heading1 },
        { label: 'Heading 2', type: 'h2', icon: Heading2 },
        { label: 'Heading 3', type: 'h3', icon: Heading3 },
        { label: 'Bullet List', type: 'bullet-list', icon: List },
        { label: 'Numbered List', type: 'numbered-list', icon: ListOrdered },
        { label: 'To-do', type: 'todo', icon: CheckSquare },
        { label: 'Toggle', type: 'toggle', icon: ChevronRight },
        { label: 'Quote', type: 'quote', icon: Quote },
        { label: 'Callout', type: 'callout', icon: AlertCircle },
        { label: 'Code', type: 'code', icon: Code },
        { label: 'Table', type: 'table', icon: Table },
        { label: 'Image', type: 'image', icon: ImageIcon },
        { label: 'Divider', type: 'divider', icon: Minus },
    ]

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % menuItems.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                const item = menuItems[selectedIndex]
                onSelect(item.type)
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose, onSelect, menuItems, selectedIndex])

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded-lg shadow-xl z-50 w-56 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
        >
            <div className="px-2 py-1">
                {menuItems.map(({ label, type, icon: Icon }, index) => (
                    <button
                        key={type}
                        onClick={() => {
                            onSelect(type)
                            onClose()
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors
                           ${index === selectedIndex 
                               ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300' 
                               : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                           }`}
                    >
                        <Icon size={16} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default SlashMenu
