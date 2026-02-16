'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Trash2,
    Copy,
    Type,
    Palette,
    ChevronUp,
    ChevronDown,
    Link2,
    Edit2,
    ChevronRight,
    Share2,
    Archive,
    Combine,
} from 'lucide-react'

interface ContextMenuProps {
    x: number
    y: number
    onClose: () => void
    onDelete?: () => void
    onDuplicate?: () => void
    onChangeType?: (type: string) => void
    onChangeColor?: () => void
    onMoveUp?: () => void
    onMoveDown?: () => void
    onRename?: () => void
    onCopyLink?: () => void
    onMergeUp?: () => void
    canMoveUp?: boolean
    canMoveDown?: boolean
}

// Menu item configuration for better maintainability
interface MenuItem {
    id: string
    label: string
    icon: React.ReactNode
    action: () => void
    shortcut?: string
    destructive?: boolean
    disabled?: boolean
    dividerBefore?: boolean
    submenu?: MenuSubmenu
}

interface MenuSubmenu {
    items: SubMenuItem[]
}

interface SubMenuItem {
    id: string
    label: string
    icon?: React.ReactNode
    action: () => void
}

export default function ContextMenu({
    x,
    y,
    onClose,
    onDelete,
    onDuplicate,
    onChangeType,
    onChangeColor,
    onMoveUp,
    onMoveDown,
    onRename,
    onCopyLink,
    onMergeUp,
    canMoveUp = true,
    canMoveDown = true,
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (activeSubmenu) {
                    setActiveSubmenu(null)
                } else {
                    onClose()
                }
            }
        }

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 0)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
            if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current)
            }
        }
    }, [onClose, activeSubmenu])

    // Adjust position if menu would go off screen
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            let adjustedX = x
            let adjustedY = y

            if (rect.right > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10
            }

            if (rect.bottom > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10
            }

            menuRef.current.style.left = `${adjustedX}px`
            menuRef.current.style.top = `${adjustedY}px`
        }
    }, [x, y])

    const blockTypeOptions: SubMenuItem[] = [
        { id: 'text', label: 'Text', action: () => { onChangeType?.('text'); onClose() } },
        { id: 'h1', label: 'Heading 1', action: () => { onChangeType?.('h1'); onClose() } },
        { id: 'h2', label: 'Heading 2', action: () => { onChangeType?.('h2'); onClose() } },
        { id: 'h3', label: 'Heading 3', action: () => { onChangeType?.('h3'); onClose() } },
        { id: 'bullet-list', label: 'Bullet List', action: () => { onChangeType?.('bullet-list'); onClose() } },
        { id: 'numbered-list', label: 'Numbered List', action: () => { onChangeType?.('numbered-list'); onClose() } },
        { id: 'todo', label: 'To-do', action: () => { onChangeType?.('todo'); onClose() } },
        { id: 'quote', label: 'Quote', action: () => { onChangeType?.('quote'); onClose() } },
        { id: 'code', label: 'Code', action: () => { onChangeType?.('code'); onClose() } },
        { id: 'callout', label: 'Callout', action: () => { onChangeType?.('callout'); onClose() } },
        { id: 'toggle', label: 'Toggle List', action: () => { onChangeType?.('toggle'); onClose() } },
        { id: 'divider', label: 'Divider', action: () => { onChangeType?.('divider'); onClose() } },
    ]

    const handleMenuAction = (action: () => void) => {
        action()
        setActiveSubmenu(null)
    }

    const MenuItem = ({ item }: { item: MenuItem }) => (
        <div
            key={item.id}
            className="relative"
            onMouseEnter={() => {
                if (submenuTimeoutRef.current) {
                    clearTimeout(submenuTimeoutRef.current)
                }
                if (item.submenu) {
                    setActiveSubmenu(item.id)
                }
            }}
            onMouseLeave={() => {
                submenuTimeoutRef.current = setTimeout(() => {
                    setActiveSubmenu(null)
                }, 100)
            }}
        >
            <button
                onClick={() => handleMenuAction(item.action)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors duration-150
                    ${item.dividerBefore ? 'border-t border-gray-200 dark:border-gray-700 mt-1 pt-2' : ''}
                    ${item.destructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                    <span className={`ml-auto text-xs font-mono
                        ${item.destructive ? 'text-red-400' : 'text-gray-400'}
                    `}>
                        {item.shortcut}
                    </span>
                )}
                {item.submenu && (
                    <ChevronRight size={14} className="ml-1 flex-shrink-0" />
                )}
            </button>

            {/* Submenu */}
            {item.submenu && activeSubmenu === item.id && (
                <div 
                    className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                        rounded-lg shadow-xl z-50 py-1 min-w-40 animate-in fade-in slide-in-from-left-2 duration-100"
                    onMouseEnter={() => {
                        if (submenuTimeoutRef.current) {
                            clearTimeout(submenuTimeoutRef.current)
                        }
                        setActiveSubmenu(item.id)
                    }}
                    onMouseLeave={() => {
                        submenuTimeoutRef.current = setTimeout(() => {
                            setActiveSubmenu(null)
                        }, 100)
                    }}
                >
                    {item.submenu.items.map((subitem) => (
                        <button
                            key={subitem.id}
                            onClick={() => handleMenuAction(subitem.action)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                        >
                            {subitem.icon && <span className="flex-shrink-0">{subitem.icon}</span>}
                            <span>{subitem.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )

    const menuItems: MenuItem[] = [
        // Editing section
        onRename ? {
            id: 'rename',
            label: 'Rename',
            icon: <Edit2 size={16} />,
            action: () => { handleMenuAction(() => { onRename(); onClose() }) },
            shortcut: 'F2',
        } : undefined,
        onDuplicate ? {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy size={16} />,
            action: () => { handleMenuAction(() => { onDuplicate(); onClose() }) },
            shortcut: 'Ctrl+D',
        } : undefined,

        // Convert section
        onChangeType ? {
            id: 'convert',
            label: 'Turn into',
            icon: <Type size={16} />,
            action: () => { },
            dividerBefore: !!(onRename || onDuplicate),
            submenu: {
                items: blockTypeOptions,
            },
        } : undefined,

        // Styling section
        onChangeColor ? {
            id: 'color',
            label: 'Color',
            icon: <Palette size={16} />,
            action: () => { handleMenuAction(() => { onChangeColor(); onClose() }) },
            dividerBefore: true,
        } : undefined,

        // Organization section
        (onMoveUp || onMoveDown) ? {
            id: 'move-up',
            label: 'Move up',
            icon: <ChevronUp size={16} />,
            action: () => { handleMenuAction(() => { onMoveUp?.(); onClose() }) },
            disabled: !canMoveUp,
            dividerBefore: !!onChangeColor,
        } : undefined,
        (onMoveUp || onMoveDown) ? {
            id: 'move-down',
            label: 'Move down',
            icon: <ChevronDown size={16} />,
            action: () => { handleMenuAction(() => { onMoveDown?.(); onClose() }) },
            disabled: !canMoveDown,
        } : undefined,
        onMergeUp ? {
            id: 'merge-up',
            label: 'Merge up',
            icon: <Combine size={16} />,
            action: () => { handleMenuAction(() => { onMergeUp(); onClose() }) },
        } : undefined,

        // Link section
        onCopyLink ? {
            id: 'copy-link',
            label: 'Copy link',
            icon: <Link2 size={16} />,
            action: () => { handleMenuAction(() => { onCopyLink(); onClose() }) },
            dividerBefore: true,
        } : undefined,

        // Dangerous section
        onDelete ? {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 size={16} />,
            action: () => { handleMenuAction(() => { onDelete(); onClose() }) },
            shortcut: 'Ctrl+Shift+D',
            destructive: true,
            dividerBefore: true,
        } : undefined,
    ].filter(Boolean) as MenuItem[]

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                 rounded-lg shadow-2xl z-50 py-1 min-w-56 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
        >
            {menuItems.map((item) => (
                <MenuItem key={item.id} item={item} />
            ))}
        </div>
    )
}

