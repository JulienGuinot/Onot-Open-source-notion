'use client'

import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent, useCallback } from 'react'
import { Block, BlockType } from '@/lib/types'
import { GripVertical, Plus } from 'lucide-react'
import ContextMenu from '@/components/ContextMenu'
import ToggleBlock from '@/components/blocks/ToggleBlock'
import CalloutBlock from '@/components/blocks/CalloutBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import TableBlock from '@/components/table/TableBlock'
import { deepDuplicateBlock } from '@/lib/blockUtils'

// Markdown shortcuts mapping
const MARKDOWN_SHORTCUTS: Record<string, BlockType> = {
    '#': 'h1',
    '##': 'h2',
    '###': 'h3',
    '*': 'bullet-list',
    '-': 'bullet-list',
    '+': 'bullet-list',
    '1.': 'numbered-list',
    '[]': 'todo',
    '[ ]': 'todo',
    '[x]': 'todo',
    '>': 'quote',
    '```': 'code',
    '---': 'divider',
    '***': 'divider',
    '>!': 'callout',
}

// Block types that support multi-line content (Enter adds new line instead of new block)
const MULTI_LINE_BLOCK_TYPES: BlockType[] = ['code', 'quote']

// Block types that are list items (Enter creates new item of same type)
const LIST_BLOCK_TYPES: BlockType[] = ['bullet-list', 'numbered-list', 'todo']

// Block types that act as containers (can hold children)
const CONTAINER_BLOCK_TYPES: BlockType[] = ['toggle', 'callout']

export interface BlockEditorProps {
    block: Block
    onUpdate: (block: Block) => void
    onDelete: () => void
    onEnter: (splitContent?: string, blockType?: BlockType) => void
    onBackspace: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    onNavigateToPreviousBlock?: () => void
    onNavigateToNextBlock?: () => void
    onDuplicate?: () => void
    onDragStart?: (e: ReactDragEvent<HTMLDivElement>) => void
    onDragEnd?: (e: ReactDragEvent<HTMLDivElement>) => void
    onRename?: () => void
    onCopyLink?: () => void
    onChangeType?: (type: string) => void
    onMergeUp?: (contentToMerge: string) => void
    onConvertToText?: () => void
    autoFocus?: boolean
    canMoveUp?: boolean
    canMoveDown?: boolean
    isDragging?: boolean
    isSelected?: boolean
    onBlockClick?: (e: ReactMouseEvent) => void
    depth?: number
}

const newBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export default function BlockEditor({
    block,
    onUpdate,
    onDelete,
    onEnter,
    onBackspace,
    onMoveUp,
    onMoveDown,
    onNavigateToPreviousBlock,
    onNavigateToNextBlock,
    onDuplicate,
    onDragStart,
    onDragEnd,
    onRename,
    onCopyLink,
    onChangeType,
    onMergeUp,
    onConvertToText,
    autoFocus,
    canMoveUp = true,
    canMoveDown = true,
    isDragging = false,
    isSelected = false,
    onBlockClick,
    depth = 0,
}: BlockEditorProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null)
    const [slashQuery, setSlashQuery] = useState('')
    const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null)
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const blockRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [focusChildId, setFocusChildId] = useState<string | null>(null)

    // Clear focusChildId after it's applied
    useEffect(() => {
        if (!focusChildId) return
        const timer = setTimeout(() => setFocusChildId(null), 100)
        return () => clearTimeout(timer)
    }, [focusChildId])

    // Slash menu items with search
    const slashMenuItems = [
        { label: 'Text', type: 'text', keywords: ['paragraph', 'plain'] },
        { label: 'Heading 1', type: 'h1', keywords: ['title', 'h1', 'header'] },
        { label: 'Heading 2', type: 'h2', keywords: ['subtitle', 'h2'] },
        { label: 'Heading 3', type: 'h3', keywords: ['h3', 'small'] },
        { label: 'Bullet List', type: 'bullet-list', keywords: ['ul', 'unordered', 'bullets'] },
        { label: 'Numbered List', type: 'numbered-list', keywords: ['ol', 'ordered', 'numbers'] },
        { label: 'To-do', type: 'todo', keywords: ['checkbox', 'task', 'check'] },
        { label: 'Toggle', type: 'toggle', keywords: ['collapse', 'expand', 'dropdown'] },
        { label: 'Quote', type: 'quote', keywords: ['blockquote', 'citation'] },
        { label: 'Callout', type: 'callout', keywords: ['alert', 'warning', 'info', 'note'] },
        { label: 'Code', type: 'code', keywords: ['snippet', 'programming'] },
        { label: 'Table', type: 'table', keywords: ['database', 'grid', 'spreadsheet'] },
        { label: 'Image', type: 'image', keywords: ['photo', 'picture', 'media'] },
        { label: 'Divider', type: 'divider', keywords: ['separator', 'line', 'hr'] },
    ]

    const filteredSlashItems = slashQuery
        ? slashMenuItems.filter(item => {
            const query = slashQuery.toLowerCase()
            return item.label.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query) ||
                item.keywords.some(kw => kw.includes(query))
        })
        : slashMenuItems

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
    }, [autoFocus, block.id])

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
        }
    }, [block.content])

    const openSlashMenu = useCallback((textarea: HTMLTextAreaElement, startIndex: number) => {
        const rect = textarea.getBoundingClientRect()
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24
        const lines = textarea.value.substring(0, startIndex).split('\n')
        const currentLine = lines.length - 1

        setSlashMenuPos({
            top: rect.top + (currentLine + 1) * lineHeight + 8,
            left: rect.left,
        })
        setSlashStartIndex(startIndex)
        setSlashQuery('')
        setShowSlashMenu(true)
    }, [])

    const closeSlashMenu = useCallback(() => {
        setShowSlashMenu(false)
        setSlashQuery('')
        setSlashStartIndex(null)
        setSlashSelectedIndex(0)
    }, [])

    useEffect(() => {
        setSlashSelectedIndex(0)
    }, [slashQuery])

    const handleSlashSelect = useCallback((type: string) => {
        if (slashStartIndex !== null) {
            const contentBefore = block.content.substring(0, slashStartIndex)
            const contentAfter = block.content.substring(slashStartIndex + 1 + slashQuery.length)
            const newContent = contentBefore + contentAfter

            closeSlashMenu()
            onChangeType?.(type)
            onUpdate({ ...block, content: newContent.trim(), type: type as Block['type'] })
        } else {
            closeSlashMenu()
            onChangeType?.(type)
            onUpdate({ ...block, content: '', type: type as Block['type'] })
        }
    }, [slashStartIndex, slashQuery, block, closeSlashMenu, onChangeType, onUpdate])

    const handleSlashMenuKeyDown = useCallback((e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSlashMenu) return false

        if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            closeSlashMenu()
            return true
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            e.stopPropagation()
            setSlashSelectedIndex(prev =>
                filteredSlashItems.length > 0 ? (prev - 1 + filteredSlashItems.length) % filteredSlashItems.length : 0
            )
            return true
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            e.stopPropagation()
            setSlashSelectedIndex(prev =>
                filteredSlashItems.length > 0 ? (prev + 1) % filteredSlashItems.length : 0
            )
            return true
        }

        if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
            if (e.shiftKey) {
                setSlashSelectedIndex(prev =>
                    filteredSlashItems.length > 0 ? (prev - 1 + filteredSlashItems.length) % filteredSlashItems.length : 0
                )
            } else {
                setSlashSelectedIndex(prev =>
                    filteredSlashItems.length > 0 ? (prev + 1) % filteredSlashItems.length : 0
                )
            }
            return true
        }

        if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            const item = filteredSlashItems[slashSelectedIndex]
            if (item) {
                handleSlashSelect(item.type)
            }
            return true
        }

        if (e.key === 'Backspace') {
            if (slashQuery.length === 0) {
                closeSlashMenu()
            }
            return false
        }

        return false
    }, [showSlashMenu, filteredSlashItems, slashSelectedIndex, slashQuery, closeSlashMenu, handleSlashSelect])

    // ─── Children management for container blocks ───────────────

    const addChildBlock = useCallback((afterIndex: number, content = '', type: BlockType = 'text') => {
        const newChild: Block = {
            id: newBlockId(),
            type,
            content,
            autoFocus: true,
            checked: type === 'todo' ? false : undefined,
        }
        const children = [...(block.children || [])]
        children.splice(afterIndex + 1, 0, newChild)
        onUpdate({ ...block, children, toggleOpen: block.type === 'toggle' ? true : undefined })
    }, [block, onUpdate])

    const updateChildBlock = useCallback((childId: string, updatedChild: Block) => {
        if (updatedChild.autoFocus) {
            updatedChild = { ...updatedChild, autoFocus: false }
        }
        const newChildren = (block.children || []).map(c =>
            c.id === childId ? updatedChild : c
        )
        onUpdate({ ...block, children: newChildren })
    }, [block, onUpdate])

    const deleteChildBlock = useCallback((childId: string, childIndex: number) => {
        const children = block.children || []
        const childBlock = children[childIndex]
        const promotedGrandchildren = childBlock?.children || []

        let newChildren: Block[]
        if (promotedGrandchildren.length > 0) {
            newChildren = [
                ...children.slice(0, childIndex),
                ...promotedGrandchildren,
                ...children.slice(childIndex + 1)
            ]
        } else {
            newChildren = children.filter(c => c.id !== childId)
        }

        if (childIndex > 0 && newChildren[childIndex - 1]) {
            setFocusChildId(newChildren[childIndex - 1]!.id)
        } else if (newChildren.length > 0) {
            setFocusChildId(newChildren[0]!.id)
        }

        onUpdate({ ...block, children: newChildren })
    }, [block, onUpdate])

    // ─── Main keyboard handler ──────────────────────────────────

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        // Handle slash menu first
        if (handleSlashMenuKeyDown(e)) return

        if (e.key === 'Escape') {
            if (contextMenu) { setContextMenu(null); return }
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()
                onNavigateToNextBlock?.()
                return
            }
            return
        }

        // Ctrl/Cmd + D: Duplicate
        if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !e.shiftKey) {
            e.preventDefault()
            onDuplicate?.()
            return
        }

        // Ctrl/Cmd + Shift + D: Delete
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault()
            onDelete()
            return
        }

        // Ctrl/Cmd + Arrow: Move block
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
            e.preventDefault(); onMoveUp(); return
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
            e.preventDefault(); onMoveDown(); return
        }

        // Arrow Up: Navigate to previous block from first line
        if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart)
            if (!textBeforeCursor.includes('\n')) {
                e.preventDefault()
                onNavigateToPreviousBlock?.()
                return
            }
        }

        // Arrow Down: Navigate to next block from last line
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const textAfterCursor = textarea.value.substring(textarea.selectionStart)
            if (!textAfterCursor.includes('\n')) {
                e.preventDefault()
                // For containers, navigate to first child if open
                if (CONTAINER_BLOCK_TYPES.includes(block.type)) {
                    const children = block.children || []
                    const isOpen = block.type === 'toggle' ? block.toggleOpen : true
                    if (isOpen && children.length > 0) {
                        setFocusChildId(children[0]!.id)
                        return
                    }
                }
                onNavigateToNextBlock?.()
                return
            }
        }

        // Arrow Left at start: previous block
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
                e.preventDefault()
                onNavigateToPreviousBlock?.()
                return
            }
        }

        // Arrow Right at end: next block
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const len = textarea.value.length
            if (textarea.selectionStart === len && textarea.selectionEnd === len) {
                e.preventDefault()
                // For containers, navigate to first child
                if (CONTAINER_BLOCK_TYPES.includes(block.type)) {
                    const children = block.children || []
                    const isOpen = block.type === 'toggle' ? block.toggleOpen : true
                    if (isOpen && children.length > 0) {
                        setFocusChildId(children[0]!.id)
                        return
                    }
                }
                onNavigateToNextBlock?.()
                return
            }
        }

        if (e.key === 'F2' && onRename) { e.preventDefault(); onRename(); return }

        // ─── Enter handling ──────────────────────────────────
        if (e.key === 'Enter' && !e.shiftKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const content = textarea.value

            // Toggle: Enter opens toggle and creates child inside
            if (block.type === 'toggle') {
                e.preventDefault()
                const newChild: Block = {
                    id: newBlockId(),
                    type: 'text',
                    content: '',
                    autoFocus: true,
                }
                const children = [...(block.children || []), newChild]
                onUpdate({ ...block, children, toggleOpen: true })
                return
            }

            // Callout: Enter creates child inside
            if (block.type === 'callout') {
                e.preventDefault()
                if (cursorPos < content.length && cursorPos > 0) {
                    // Split: keep before cursor, child gets after
                    const contentBefore = content.substring(0, cursorPos)
                    const contentAfter = content.substring(cursorPos)
                    const newChild: Block = {
                        id: newBlockId(),
                        type: 'text',
                        content: contentAfter,
                        autoFocus: true,
                    }
                    onUpdate({
                        ...block,
                        content: contentBefore,
                        children: [newChild, ...(block.children || [])],
                    })
                } else {
                    const newChild: Block = {
                        id: newBlockId(),
                        type: 'text',
                        content: '',
                        autoFocus: true,
                    }
                    onUpdate({
                        ...block,
                        children: [...(block.children || []), newChild],
                    })
                }
                return
            }

            // Multi-line blocks: let Enter add newline
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) return

            // List blocks: same type continuation or convert on empty
            if (LIST_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()
                if (content.trim() === '') { onConvertToText?.(); return }
                if (cursorPos < content.length && cursorPos > 0) {
                    onUpdate({ ...block, content: content.substring(0, cursorPos) })
                    onEnter(content.substring(cursorPos), block.type)
                } else {
                    onEnter('', block.type)
                }
                return
            }

            // Regular blocks: split or create new
            e.preventDefault()
            if (cursorPos < content.length && cursorPos > 0) {
                onUpdate({ ...block, content: content.substring(0, cursorPos) })
                onEnter(content.substring(cursorPos))
            } else {
                onEnter()
            }
            return
        }

        // Shift+Enter for multi-line blocks: exit
        if (e.key === 'Enter' && e.shiftKey) {
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()
                onEnter('', 'text')
                return
            }
        }

        // ─── Backspace handling ──────────────────────────────
        if (e.key === 'Backspace') {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const selectionEnd = textarea.selectionEnd

            if (cursorPos !== selectionEnd) return

            if (cursorPos === 0) {
                if (LIST_BLOCK_TYPES.includes(block.type)) {
                    e.preventDefault()
                    onConvertToText?.()
                    return
                }
                e.preventDefault()
                if (block.content === '') {
                    onBackspace()
                } else {
                    onMergeUp?.(block.content)
                }
                return
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        const cursorPos = e.target.selectionStart

        // Check for markdown shortcuts when space is typed
        if (block.type === 'text' && newContent.endsWith(' ') && !showSlashMenu) {
            const textBeforeSpace = newContent.slice(0, -1).trim()
            for (const [shortcut, blockType] of Object.entries(MARKDOWN_SHORTCUTS)) {
                if (textBeforeSpace === shortcut) {
                    const checked = shortcut === '[x]' ? true : undefined
                    onChangeType?.(blockType)
                    onUpdate({
                        ...block, content: '', type: blockType,
                        ...(checked !== undefined && { checked })
                    })
                    return
                }
            }
        }

        // Slash menu trigger
        if (!showSlashMenu) {
            const charBefore = cursorPos > 1 ? newContent[cursorPos - 2] : ''
            const justTypedSlash = newContent[cursorPos - 1] === '/'
            const isValidTrigger = cursorPos === 1 || charBefore === '\n' || charBefore === ' ' || charBefore === ''
            if (justTypedSlash && isValidTrigger && block.type === 'text') {
                openSlashMenu(e.target, cursorPos - 1)
                onUpdate({ ...block, content: newContent })
                return
            }
        } else {
            if (slashStartIndex !== null) {
                const query = newContent.substring(slashStartIndex + 1, cursorPos)
                if (query.includes(' ') || query.includes('\n')) {
                    closeSlashMenu()
                } else {
                    setSlashQuery(query)
                }
            }
        }

        onUpdate({ ...block, content: newContent })
    }

    const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleDragStartEvent = (e: ReactDragEvent<HTMLDivElement>) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(e)
    }

    const handleDragEndEvent = (e: ReactDragEvent<HTMLDivElement>) => {
        onDragEnd?.(e)
    }

    const getPlaceholder = () => {
        switch (block.type) {
            case 'h1': return 'Heading 1'
            case 'h2': return 'Heading 2'
            case 'h3': return 'Heading 3'
            case 'bullet-list': return 'List item'
            case 'numbered-list': return 'List item'
            case 'todo': return 'To-do'
            case 'code': return 'Write some code...'
            case 'quote': return 'Quote...'
            case 'text': return ""
            default: return ''
        }
    }

    const getBlockStyle = () => {
        switch (block.type) {
            case 'h1': return 'text-3xl font-bold tracking-tight'
            case 'h2': return 'text-2xl font-semibold tracking-tight'
            case 'h3': return 'text-xl font-semibold'
            case 'quote': return 'italic text-gray-600 dark:text-gray-400 border-l-4 border-gray-300 dark:border-gray-600 pl-4'
            case 'code': return 'font-mono text-sm bg-gray-200 dark:bg-gray-800 p-3 rounded-lg'
            case 'bullet-list': return 'pl-6 relative before:content-["•"] before:absolute before:left-2 before:text-gray-400'
            case 'numbered-list': return 'pl-6'
            default: return ''
        }
    }

    // ─── Children rendering (for toggle/callout) ────────────────

    const renderChildrenBlocks = (containerClass: string) => {
        const children = block.children || []

        return (
            <div className={containerClass}>
                {children.map((child, childIndex) => (
                    <BlockEditor
                        key={child.id}
                        block={child}
                        depth={depth + 1}
                        autoFocus={child.autoFocus || focusChildId === child.id}
                        isSelected={false}
                        onUpdate={(updated) => updateChildBlock(child.id, updated)}
                        onDelete={() => deleteChildBlock(child.id, childIndex)}
                        onEnter={(splitContent, blockType) => {
                            const currentChildren = block.children || []

                            // Empty last text child: exit the container
                            if (childIndex === currentChildren.length - 1 &&
                                child.content.trim() === '' &&
                                child.type === 'text' &&
                                (!splitContent || splitContent === '')) {
                                const newChildren = currentChildren.filter(c => c.id !== child.id)
                                onUpdate({ ...block, children: newChildren })
                                onEnter('', 'text')
                                return
                            }

                            // Normal: add new child
                            addChildBlock(childIndex, splitContent || '', blockType || 'text')
                        }}
                        onBackspace={() => {
                            const currentChildren = block.children || []
                            if (childIndex > 0) {
                                const newChildren = currentChildren.filter(c => c.id !== child.id)
                                if (newChildren[childIndex - 1]) {
                                    setFocusChildId(newChildren[childIndex - 1]!.id)
                                }
                                onUpdate({ ...block, children: newChildren })
                            } else {
                                // First child empty: delete and focus parent header
                                const newChildren = currentChildren.filter(c => c.id !== child.id)
                                onUpdate({ ...block, children: newChildren, autoFocus: true })
                            }
                        }}
                        onMergeUp={(contentToMerge) => {
                            const currentChildren = block.children || []
                            if (childIndex === 0) {
                                // Merge into parent content
                                const newChildren = currentChildren.filter(c => c.id !== child.id)
                                onUpdate({
                                    ...block,
                                    content: block.content + contentToMerge,
                                    children: newChildren,
                                    autoFocus: true
                                })
                            } else {
                                const prevChild = currentChildren[childIndex - 1]
                                if (prevChild) {
                                    const merged = prevChild.content + contentToMerge
                                    const newChildren = currentChildren
                                        .filter(c => c.id !== child.id)
                                        .map(c => c.id === prevChild.id
                                            ? { ...c, content: merged, autoFocus: true }
                                            : c
                                        )
                                    onUpdate({ ...block, children: newChildren })
                                    setFocusChildId(prevChild.id)
                                }
                            }
                        }}
                        onMoveUp={() => {
                            if (childIndex > 0) {
                                const newChildren = [...(block.children || [])]
                                const temp = newChildren[childIndex]!
                                newChildren[childIndex] = newChildren[childIndex - 1]!
                                newChildren[childIndex - 1] = temp
                                onUpdate({ ...block, children: newChildren })
                            }
                        }}
                        onMoveDown={() => {
                            const currentChildren = block.children || []
                            if (childIndex < currentChildren.length - 1) {
                                const newChildren = [...currentChildren]
                                const temp = newChildren[childIndex]!
                                newChildren[childIndex] = newChildren[childIndex + 1]!
                                newChildren[childIndex + 1] = temp
                                onUpdate({ ...block, children: newChildren })
                            }
                        }}
                        onNavigateToPreviousBlock={() => {
                            if (childIndex === 0) {
                                // Focus parent header
                                onUpdate({ ...block, autoFocus: true })
                            } else {
                                setFocusChildId((block.children || [])[childIndex - 1]?.id || null)
                            }
                        }}
                        onNavigateToNextBlock={() => {
                            const currentChildren = block.children || []
                            if (childIndex === currentChildren.length - 1) {
                                onNavigateToNextBlock?.()
                            } else {
                                setFocusChildId(currentChildren[childIndex + 1]?.id || null)
                            }
                        }}
                        canMoveUp={childIndex > 0}
                        canMoveDown={childIndex < (block.children || []).length - 1}
                        onDuplicate={() => {
                            const duplicated = deepDuplicateBlock(child)
                            duplicated.autoFocus = true
                            const newChildren = [...(block.children || [])]
                            newChildren.splice(childIndex + 1, 0, duplicated)
                            onUpdate({ ...block, children: newChildren })
                        }}
                        onChangeType={(newType) => {
                            const newChildren = (block.children || []).map(c =>
                                c.id === child.id ? { ...c, type: newType as BlockType } : c
                            )
                            onUpdate({ ...block, children: newChildren })
                        }}
                        onConvertToText={() => {
                            const newChildren = (block.children || []).map(c =>
                                c.id === child.id ? { ...c, type: 'text' as BlockType } : c
                            )
                            onUpdate({ ...block, children: newChildren })
                        }}
                        onCopyLink={onCopyLink}
                    />
                ))}

                {/* Add child button */}
                <button
                    onClick={() => addChildBlock((block.children || []).length - 1)}
                    className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm py-1 px-1
                               hover:text-gray-600 dark:hover:text-gray-400 transition-colors
                               opacity-0 group-hover/container:opacity-100"
                >
                    <Plus size={14} />
                    <span>Add item</span>
                </button>
            </div>
        )
    }

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div
            ref={blockRef}
            className={`group flex items-start gap-1 relative transition-all duration-150 rounded-lg -mx-2 px-2 py-0.5
                ${isDragging ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${isSelected ? 'bg-blue-100/60 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : ''}
                ${contextMenu && !isSelected ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                ${isFocused && !isDragging && !isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                ${isHovered && !isDragging && !isFocused && !isSelected ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
            `}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onBlockClick}
            draggable={false}
        >
            {/* Block actions - visible on hover */}
            <div className={`flex items-center gap-0.5 pt-1.5 flex-shrink-0 transition-opacity duration-150
                ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onEnter() }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Add block below"
                >
                    <Plus size={14} className="text-gray-400 dark:text-gray-500" />
                </button>
                <div
                    draggable={true}
                    onDragStart={handleDragStartEvent}
                    onDragEnd={handleDragEndEvent}
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Drag to move block"
                >
                    <GripVertical size={14} className="text-gray-400 dark:text-gray-500" />
                </div>
            </div>

            {/* Block content */}
            <div className="flex-1 min-w-0 py-0.5">
                {block.type === 'todo' ? (
                    <label className="flex items-start gap-3 cursor-pointer group/todo">
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                checked={block.checked || false}
                                onChange={(e) => onUpdate({ ...block, checked: e.target.checked })}
                                className="w-4 h-4 cursor-pointer rounded border-2 border-gray-300 dark:border-gray-600
                                         checked:bg-blue-500 checked:border-blue-500 transition-colors"
                            />
                        </div>
                        <textarea
                            ref={inputRef}
                            value={block.content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={getPlaceholder()}
                            className={`outline-none w-full bg-transparent resize-none leading-relaxed
                                dark:text-gray-100 text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                ${block.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}
                                ${getBlockStyle()}`}
                            rows={1}
                            style={{ minHeight: '1.5rem' }}
                        />
                    </label>

                ) : block.type === 'divider' ? (
                    <div className="my-4 flex items-center">
                        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                    </div>

                ) : block.type === 'toggle' ? (
                    <div className="group/container">
                        <ToggleBlock
                            block={block}
                            onUpdate={onUpdate}
                            onKeyDown={handleKeyDown as any}
                            autoFocus={autoFocus}
                        />
                        {/* Toggle children */}
                        <div className={`overflow-hidden transition-all duration-200 ${block.toggleOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {renderChildrenBlocks(
                                'ml-7 mt-1 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-0.5'
                            )}
                        </div>
                    </div>

                ) : block.type === 'callout' ? (
                    <div className="group/container">
                        <CalloutBlock
                            block={block}
                            onUpdate={onUpdate}
                            onKeyDown={handleKeyDown as any}
                            autoFocus={autoFocus}
                        />
                        {/* Callout children */}
                        {(block.children && block.children.length > 0) && (
                            <div className="mt-1">
                                {renderChildrenBlocks(
                                    'ml-12 pl-3 border-l-2 border-gray-200/50 dark:border-gray-700/50 space-y-0.5'
                                )}
                            </div>
                        )}
                    </div>

                ) : block.type === 'image' ? (
                    <ImageBlock block={block} onUpdate={onUpdate} onKeyDown={handleKeyDown as any} />

                ) : block.type === 'table' ? (
                    <TableBlock block={block} onUpdate={onUpdate} />

                ) : (
                    <textarea
                        ref={inputRef}
                        value={block.content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={getPlaceholder()}
                        className={`outline-none w-full bg-transparent resize-none leading-relaxed
                            dark:text-gray-100 text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500
                            transition-colors ${getBlockStyle()}`}
                        rows={1}
                        style={{ minHeight: '1.5rem' }}
                    />
                )}
            </div>

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onMoveUp={canMoveUp ? onMoveUp : undefined}
                    onMoveDown={canMoveDown ? onMoveDown : undefined}
                    onRename={onRename}
                    onCopyLink={onCopyLink}
                    onChangeType={onChangeType}
                    onMergeUp={onMergeUp ? () => onMergeUp(block.content) : undefined}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                />
            )}

            {/* Slash menu */}
            {showSlashMenu && slashMenuPos && (
                <div
                    className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded-xl shadow-2xl z-50 w-72 max-h-[360px] overflow-hidden
                         animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{
                        left: `${slashMenuPos.left}px`,
                        top: `${slashMenuPos.top}px`,
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'
                    }}
                >
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {slashQuery ? `Results for "${slashQuery}"` : 'Basic blocks'}
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-[300px] py-1 px-1 scroll-smooth">
                        {filteredSlashItems.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <div className="text-gray-400 dark:text-gray-500 text-sm">
                                    No results for &quot;{slashQuery}&quot;
                                </div>
                                <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">
                                    Press Escape to close
                                </div>
                            </div>
                        ) : (
                            filteredSlashItems.map((item, index) => (
                                <button
                                    key={item.type}
                                    onClick={() => handleSlashSelect(item.type)}
                                    onMouseEnter={() => setSlashSelectedIndex(index)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-all duration-100
                                       ${index === slashSelectedIndex
                                            ? 'bg-blue-50 dark:bg-blue-900/30'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-sm
                                        ${index === slashSelectedIndex
                                            ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {item.type === 'text' && 'Aa'}
                                        {item.type === 'h1' && 'H1'}
                                        {item.type === 'h2' && 'H2'}
                                        {item.type === 'h3' && 'H3'}
                                        {item.type === 'bullet-list' && '•'}
                                        {item.type === 'numbered-list' && '1.'}
                                        {item.type === 'todo' && '☐'}
                                        {item.type === 'toggle' && '▸'}
                                        {item.type === 'quote' && '"'}
                                        {item.type === 'callout' && '💡'}
                                        {item.type === 'code' && '</>'}
                                        {item.type === 'table' && '⊞'}
                                        {item.type === 'image' && '🖼'}
                                        {item.type === 'divider' && '—'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium transition-colors ${index === slashSelectedIndex
                                            ? 'text-blue-900 dark:text-blue-200'
                                            : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                            {item.label}
                                        </div>
                                    </div>
                                    {index === slashSelectedIndex && (
                                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-500">↵</kbd>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {filteredSlashItems.length > 0 && (
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↓</kbd>
                                    navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                                    select
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
