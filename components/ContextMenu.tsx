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
    Combine,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Code,
    AlertCircle,
    Minus,
    Table,
    LucideIcon,
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
    icon?: LucideIcon
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
    const [selectedIndex, setSelectedIndex] = useState(0)

    const [submenuSelectedIndex, setSubmenuSelectedIndex] = useState(0)

    // Build menu items first so we can reference them in the effect
    const blockTypeOptions: SubMenuItem[] = [
        { id: 'text', label: 'Text', icon: Type, action: () => { onChangeType?.('text'); onClose() } },
        { id: 'h1', label: 'Heading 1', icon: Heading1, action: () => { onChangeType?.('h1'); onClose() } },
        { id: 'h2', label: 'Heading 2', icon: Heading2, action: () => { onChangeType?.('h2'); onClose() } },
        { id: 'h3', label: 'Heading 3', icon: Heading3, action: () => { onChangeType?.('h3'); onClose() } },
        { id: 'bullet-list', label: 'Bullet List', icon: List, action: () => { onChangeType?.('bullet-list'); onClose() } },
        { id: 'numbered-list', label: 'Numbered List', icon: ListOrdered, action: () => { onChangeType?.('numbered-list'); onClose() } },
        { id: 'todo', label: 'To-do', icon: CheckSquare, action: () => { onChangeType?.('todo'); onClose() } },
        { id: 'quote', label: 'Quote', icon: Quote, action: () => { onChangeType?.('quote'); onClose() } },
        { id: 'code', label: 'Code', icon: Code, action: () => { onChangeType?.('code'); onClose() } },
        { id: 'callout', label: 'Callout', icon: AlertCircle, action: () => { onChangeType?.('callout'); onClose() } },
        { id: 'table', label: 'Table', icon: Table, action: () => { onChangeType?.('table'); onClose() } },
        { id: 'divider', label: 'Divider', icon: Minus, action: () => { onChangeType?.('divider'); onClose() } },
    ]

    const menuItems: MenuItem[] = [
        onDuplicate ? {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy size={16} />,
            action: () => { onDuplicate(); onClose() },
            shortcut: '⌘D',
        } : undefined,
        onChangeType ? {
            id: 'convert',
            label: 'Turn into',
            icon: <Type size={16} />,
            action: () => { },
            dividerBefore: !!onDuplicate,
            submenu: {
                items: blockTypeOptions,
            },
        } : undefined,
        (onMoveUp || onMoveDown) ? {
            id: 'move-up',
            label: 'Move up',
            icon: <ChevronUp size={16} />,
            action: () => { onMoveUp?.(); onClose() },
            disabled: !canMoveUp,
            shortcut: '⌘↑',
            dividerBefore: !!onChangeType,
        } : undefined,
        (onMoveUp || onMoveDown) ? {
            id: 'move-down',
            label: 'Move down',
            icon: <ChevronDown size={16} />,
            action: () => { onMoveDown?.(); onClose() },
            disabled: !canMoveDown,
            shortcut: '⌘↓',
        } : undefined,
        onCopyLink ? {
            id: 'copy-link',
            label: 'Copy link',
            icon: <Link2 size={16} />,
            action: () => { onCopyLink(); onClose() },
            dividerBefore: true,
        } : undefined,
        onDelete ? {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 size={16} />,
            action: () => { onDelete(); onClose() },
            shortcut: '⌘⇧D',
            destructive: true,
            dividerBefore: true,
        } : undefined,
    ].filter(Boolean) as MenuItem[]

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()

            if (e.key === 'Escape') {
                if (activeSubmenu) {
                    setActiveSubmenu(null)
                    setSubmenuSelectedIndex(0)
                } else {
                    onClose()
                }
                return
            }

            // When submenu is open
            if (activeSubmenu) {
                const activeItem = menuItems.find(item => item.id === activeSubmenu)
                const submenuItems = activeItem?.submenu?.items || []

                if (e.key === 'ArrowDown') {
                    setSubmenuSelectedIndex(prev => (prev + 1) % submenuItems.length)
                } else if (e.key === 'ArrowUp') {
                    setSubmenuSelectedIndex(prev => (prev - 1 + submenuItems.length) % submenuItems.length)
                } else if (e.key === 'Enter') {
                    const subitem = submenuItems[submenuSelectedIndex]
                    if (subitem) {
                        subitem.action()
                    }
                } else if (e.key === 'ArrowLeft') {
                    setActiveSubmenu(null)
                    setSubmenuSelectedIndex(0)
                }
                return
            }

            // Main menu navigation
            if (e.key === 'ArrowDown') {
                setSelectedIndex(prev => {
                    let next = (prev + 1) % menuItems.length
                    // Skip disabled items
                    while (menuItems[next]?.disabled && next !== prev) {
                        next = (next + 1) % menuItems.length
                    }
                    return next
                })
            } else if (e.key === 'ArrowUp') {
                setSelectedIndex(prev => {
                    let next = (prev - 1 + menuItems.length) % menuItems.length
                    // Skip disabled items
                    while (menuItems[next]?.disabled && next !== prev) {
                        next = (next - 1 + menuItems.length) % menuItems.length
                    }
                    return next
                })
            } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
                const item = menuItems[selectedIndex]
                if (item && !item.disabled) {
                    if (item.submenu) {
                        setActiveSubmenu(item.id)
                        setSubmenuSelectedIndex(0)
                    } else if (e.key === 'Enter') {
                        item.action()
                    }
                }
            }
        }

        // Add listeners with a small delay to prevent immediate triggering
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleKeyDown, true)
        }, 10)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown, true)
            if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current)
            }
        }
    }, [onClose, activeSubmenu, selectedIndex, submenuSelectedIndex, menuItems])

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

    const handleMenuAction = (action: () => void) => {
        action()
        setActiveSubmenu(null)
    }

    const MenuItemComponent = ({ item, index }: { item: MenuItem; index: number }) => {
        const Icon = item.icon as React.ReactNode
        
        return (
            <div
                className="relative"
                onMouseEnter={() => {
                    setSelectedIndex(index)
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
                {item.dividerBefore && (
                    <div className="my-1 mx-2 h-px bg-gray-200 dark:bg-gray-700" />
                )}
                <button
                    onClick={() => handleMenuAction(item.action)}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 mx-1 text-sm text-left rounded-md transition-all duration-100
                        ${selectedIndex === index && !item.disabled
                            ? item.destructive
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : item.destructive
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-700 dark:text-gray-300'
                        }
                        ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={{ width: 'calc(100% - 8px)' }}
                >
                    <span className={`flex-shrink-0 transition-colors ${
                        selectedIndex === index && !item.disabled
                            ? item.destructive ? 'text-red-500' : 'text-blue-500'
                            : 'text-gray-400'
                    }`}>
                        {Icon}
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.shortcut && (
                        <kbd className={`ml-auto text-[10px] px-1.5 py-0.5 rounded
                            ${item.destructive 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-500' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                            }
                        `}>
                            {item.shortcut}
                        </kbd>
                    )}
                    {item.submenu && (
                        <ChevronRight size={14} className="ml-1 flex-shrink-0 text-gray-400" />
                    )}
                </button>

                {/* Submenu */}
                {item.submenu && activeSubmenu === item.id && (
                    <div 
                        className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                            rounded-xl shadow-2xl z-50 py-2 min-w-48 max-h-80 overflow-y-auto menu-animate"
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
                        {item.submenu.items.map((subitem, subIndex) => {
                            const SubIcon = subitem.icon
                            const isSelected = activeSubmenu === item.id && submenuSelectedIndex === subIndex
                            return (
                                <button
                                    key={subitem.id}
                                    onClick={() => handleMenuAction(subitem.action)}
                                    onMouseEnter={() => setSubmenuSelectedIndex(subIndex)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 mx-1 text-sm text-left transition-colors rounded-md
                                        ${isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    style={{ width: 'calc(100% - 8px)' }}
                                >
                                    {SubIcon && (
                                        <SubIcon size={16} className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                                    )}
                                    <span className="font-medium">{subitem.label}</span>
                                    {isSelected && (
                                        <kbd className="ml-auto px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-500">↵</kbd>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                 rounded-xl shadow-2xl z-50 py-2 min-w-56 menu-animate"
            style={{ 
                left: x, 
                top: y,
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'
            }}
        >
            {menuItems.map((item, index) => (
                <MenuItemComponent key={item.id} item={item} index={index} />
            ))}
        </div>
    )
}
