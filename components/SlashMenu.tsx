'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
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
    Type,
    LucideIcon,
} from 'lucide-react'

export interface SlashMenuProps {
    onClose: () => void
    onSelect: (type: string) => void
    position: { top: number; left: number } | null
    searchQuery?: string // Ce qu'on tape après le /
}

interface MenuItem {
    label: string
    type: string
    icon: LucideIcon
    keywords: string[] // Mots-clés supplémentaires pour la recherche
    description: string
}

const menuItems: MenuItem[] = [
    { 
        label: 'Text', 
        type: 'text', 
        icon: Type, 
        keywords: ['paragraph', 'plain', 'texte', 'paragraphe'],
        description: 'Plain text block'
    },
    { 
        label: 'Heading 1', 
        type: 'h1', 
        icon: Heading1, 
        keywords: ['title', 'titre', 'h1', 'heading1', 'header'],
        description: 'Large heading'
    },
    { 
        label: 'Heading 2', 
        type: 'h2', 
        icon: Heading2, 
        keywords: ['subtitle', 'h2', 'heading2', 'sous-titre'],
        description: 'Medium heading'
    },
    { 
        label: 'Heading 3', 
        type: 'h3', 
        icon: Heading3, 
        keywords: ['h3', 'heading3', 'small heading'],
        description: 'Small heading'
    },
    { 
        label: 'Bullet List', 
        type: 'bullet-list', 
        icon: List, 
        keywords: ['ul', 'unordered', 'liste', 'puces', 'bullet', 'bullets'],
        description: 'Create a bulleted list'
    },
    { 
        label: 'Numbered List', 
        type: 'numbered-list', 
        icon: ListOrdered, 
        keywords: ['ol', 'ordered', 'numérotée', 'numbers', '1.'],
        description: 'Create a numbered list'
    },
    { 
        label: 'To-do', 
        type: 'todo', 
        icon: CheckSquare, 
        keywords: ['checkbox', 'task', 'tâche', 'check', 'done', 'todo'],
        description: 'Track tasks with checkboxes'
    },
    { 
        label: 'Toggle', 
        type: 'toggle', 
        icon: ChevronRight, 
        keywords: ['collapse', 'expand', 'dropdown', 'accordion', 'déroulant'],
        description: 'Collapsible content'
    },
    { 
        label: 'Quote', 
        type: 'quote', 
        icon: Quote, 
        keywords: ['blockquote', 'citation', 'cite'],
        description: 'Capture a quote'
    },
    { 
        label: 'Callout', 
        type: 'callout', 
        icon: AlertCircle, 
        keywords: ['alert', 'warning', 'info', 'note', 'tip', 'highlight'],
        description: 'Highlighted callout box'
    },
    { 
        label: 'Code', 
        type: 'code', 
        icon: Code, 
        keywords: ['snippet', 'programming', 'script', 'code block'],
        description: 'Code snippet'
    },
    { 
        label: 'Table', 
        type: 'table', 
        icon: Table, 
        keywords: ['database', 'grid', 'spreadsheet', 'tableau', 'db'],
        description: 'Add a table'
    },
    { 
        label: 'Image', 
        type: 'image', 
        icon: ImageIcon, 
        keywords: ['photo', 'picture', 'img', 'media', 'fichier'],
        description: 'Upload or embed an image'
    },
    { 
        label: 'Divider', 
        type: 'divider', 
        icon: Minus, 
        keywords: ['separator', 'line', 'hr', 'horizontal', 'séparateur'],
        description: 'Visual divider'
    },
]

export function SlashMenu({ onClose, onSelect, position, searchQuery = '' }: SlashMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

    // Filtrer les items basé sur la recherche
    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return menuItems

        return menuItems.filter(item => {
            const labelMatch = item.label.toLowerCase().includes(query)
            const typeMatch = item.type.toLowerCase().includes(query)
            const keywordsMatch = item.keywords.some(kw => kw.toLowerCase().includes(query))
            const descMatch = item.description.toLowerCase().includes(query)
            return labelMatch || typeMatch || keywordsMatch || descMatch
        })
    }, [searchQuery])

    // Reset selection quand le filtre change
    useEffect(() => {
        setSelectedIndex(0)
    }, [searchQuery])

    // Scroll l'item sélectionné dans la vue
    useEffect(() => {
        const currentItem = itemRefs.current[selectedIndex]
        if (currentItem) {
            currentItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
    }, [selectedIndex])

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
                return
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => 
                    filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
                )
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => 
                    filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
                )
            } else if (e.key === 'Enter') {
                e.preventDefault()
                const item = filteredItems[selectedIndex]
                if (item) {
                    onSelect(item.type)
                    onClose()
                }
            } else if (e.key === 'Tab') {
                e.preventDefault()
                if (e.shiftKey) {
                    setSelectedIndex((prev) => 
                        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
                    )
                } else {
                    setSelectedIndex((prev) => 
                        filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
                    )
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose, onSelect, filteredItems, selectedIndex])

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded-xl shadow-2xl z-50 w-72 max-h-[360px] overflow-hidden
                 animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ 
                left: `${position.left}px`, 
                top: `${position.top}px`,
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'
            }}
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {searchQuery ? `Résultats pour "${searchQuery}"` : 'Blocs de base'}
                </div>
            </div>

            {/* Items list */}
            <div className="overflow-y-auto max-h-[300px] py-1 px-1 scroll-smooth">
                {filteredItems.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                        <div className="text-gray-400 dark:text-gray-500 text-sm">
                            Aucun résultat pour "{searchQuery}"
                        </div>
                        <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">
                            Appuyez sur Échap pour fermer
                        </div>
                    </div>
                ) : (
                    filteredItems.map(({ label, type, icon: Icon, description }, index) => (
                        <button
                            key={type}
                            ref={(el) => { itemRefs.current[index] = el }}
                            onClick={() => {
                                onSelect(type)
                                onClose()
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-all duration-100
                               ${index === selectedIndex 
                                   ? 'bg-blue-50 dark:bg-blue-900/30' 
                                   : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                               }`}
                        >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                                ${index === selectedIndex 
                                    ? 'bg-blue-100 dark:bg-blue-800/50' 
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                <Icon 
                                    size={18} 
                                    className={`transition-colors ${
                                        index === selectedIndex 
                                            ? 'text-blue-600 dark:text-blue-400' 
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`} 
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium transition-colors ${
                                    index === selectedIndex 
                                        ? 'text-blue-900 dark:text-blue-200' 
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                    {label}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                    {description}
                                </div>
                            </div>
                            {index === selectedIndex && (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>

            {/* Footer hint */}
            {filteredItems.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↓</kbd>
                            naviguer
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                            sélectionner
                        </span>
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                        {filteredItems.length} bloc{filteredItems.length > 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SlashMenu
