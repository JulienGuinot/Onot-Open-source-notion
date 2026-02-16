'use client'

import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent, useCallback } from 'react'
import { Block, BlockType } from '@/lib/types'
import { GripVertical, Plus } from 'lucide-react'
import ContextMenu from '@/components/ContextMenu'
import ToggleBlock from '@/components/blocks/ToggleBlock'
import CalloutBlock from '@/components/blocks/CalloutBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import TableBlock from '@/components/table/TableBlock'

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
}

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
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                    // Place cursor at the end
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
        // Calculate position based on cursor
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

    // Reset selection when query changes
    useEffect(() => {
        setSlashSelectedIndex(0)
    }, [slashQuery])

    // Handle slash menu selection - defined before handleSlashMenuKeyDown
    const handleSlashSelect = useCallback((type: string) => {
        // Remove the slash and query from content
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
                // Will delete the slash, close menu
                closeSlashMenu()
            }
            // Let the event continue to update the content
            return false
        }

        return false
    }, [showSlashMenu, filteredSlashItems, slashSelectedIndex, slashQuery, closeSlashMenu, handleSlashSelect])

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        // Handle slash menu navigation first - it consumes the event
        if (handleSlashMenuKeyDown(e)) {
            return
        }

        // Escape key handling
        if (e.key === 'Escape') {
            // First, close context menu if open
            if (contextMenu) {
                setContextMenu(null)
                return
            }
            // For code/quote blocks, navigate to next block
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()
                onNavigateToNextBlock?.()
                return
            }
            return
        }

        // Ctrl/Cmd + D: Duplicate block
        if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !e.shiftKey) {
            e.preventDefault()
            onDuplicate?.()
            return
        }

        // Ctrl/Cmd + Shift + D: Delete block
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault()
            onDelete()
            return
        }

        // Ctrl/Cmd + Arrow Up: Move block up
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
            e.preventDefault()
            onMoveUp()
            return
        }

        // Ctrl/Cmd + Arrow Down: Move block down
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
            e.preventDefault()
            onMoveDown()
            return
        }

        // Arrow Up: Navigate to previous block when at beginning
        if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart

            // Check if cursor is on the first line
            const textBeforeCursor = textarea.value.substring(0, cursorPos)
            const isAtFirstLine = !textBeforeCursor.includes('\n')

            if (isAtFirstLine) {
                e.preventDefault()
                onNavigateToPreviousBlock?.()
                return
            }
        }

        // Arrow Down: Navigate to next block when at end
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const content = textarea.value

            // Check if cursor is on the last line
            const textAfterCursor = content.substring(cursorPos)
            const isAtLastLine = !textAfterCursor.includes('\n')

            if (isAtLastLine) {
                e.preventDefault()
                onNavigateToNextBlock?.()
                return
            }
        }

        // Arrow Left: Navigate to previous block at start
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
                e.preventDefault()
                onNavigateToPreviousBlock?.()
                return
            }
        }

        // Arrow Right: Navigate to next block at end
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const len = textarea.value.length
            if (textarea.selectionStart === len && textarea.selectionEnd === len) {
                e.preventDefault()
                onNavigateToNextBlock?.()
                return
            }
        }

        // F2: Rename
        if (e.key === 'F2' && onRename) {
            e.preventDefault()
            onRename()
            return
        }

        // Enter: Handle based on block type
        if (e.key === 'Enter' && !e.shiftKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const content = textarea.value

            // For multi-line blocks (code, quote): Enter adds new line
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) {
                // Let default behavior add newline, don't prevent
                return
            }

            // For list blocks (bullet-list, numbered-list, todo):
            // - Enter creates new list item of same type
            // - Enter on empty content converts to text block
            if (LIST_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()

                // If content is empty, convert to text block
                if (content.trim() === '') {
                    onConvertToText?.()
                    return
                }

                // If cursor is in the middle, split the content
                if (cursorPos < content.length && cursorPos > 0) {
                    const contentBefore = content.substring(0, cursorPos)
                    const contentAfter = content.substring(cursorPos)
                    onUpdate({ ...block, content: contentBefore })
                    onEnter(contentAfter, block.type) // Create new block of same type
                } else {
                    onEnter('', block.type) // Create new empty block of same type
                }
                return
            }

            // For regular text blocks: create new text block
            e.preventDefault()
            if (cursorPos < content.length && cursorPos > 0) {
                const contentBefore = content.substring(0, cursorPos)
                const contentAfter = content.substring(cursorPos)
                onUpdate({ ...block, content: contentBefore })
                onEnter(contentAfter)
            } else {
                onEnter()
            }
            return
        }

        // Shift+Enter for multi-line blocks: exits the block (creates new text block below)
        if (e.key === 'Enter' && e.shiftKey) {
            // For code/quote blocks, Shift+Enter exits and creates new text block
            if (MULTI_LINE_BLOCK_TYPES.includes(block.type)) {
                e.preventDefault()
                onEnter('', 'text')
                return
            }
            // For other blocks, let default behavior (or add newline within)
        }

        // Backspace handling
        if (e.key === 'Backspace') {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const selectionEnd = textarea.selectionEnd

            // If there's a selection, let default behavior handle it
            if (cursorPos !== selectionEnd) {
                return
            }

            // At the beginning of the block
            if (cursorPos === 0) {
                // For list blocks, convert to text first before deleting
                if (LIST_BLOCK_TYPES.includes(block.type)) {
                    e.preventDefault()
                    onConvertToText?.()
                    return
                }

                e.preventDefault()
                if (block.content === '') {
                    // Empty block - delete it
                    onBackspace()
                } else {
                    // Non-empty block - merge with previous
                    onMergeUp?.(block.content)
                }
                return
            }
        }

    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        const cursorPos = e.target.selectionStart

        // Check for markdown shortcuts when user types space
        if (block.type === 'text' && newContent.endsWith(' ') && !showSlashMenu) {
            const textBeforeSpace = newContent.slice(0, -1).trim()

            // Check each markdown shortcut
            for (const [shortcut, blockType] of Object.entries(MARKDOWN_SHORTCUTS)) {
                if (textBeforeSpace === shortcut) {
                    // Convert block type and clear content
                    const checked = shortcut === '[x]' ? true : undefined
                    onChangeType?.(blockType)
                    onUpdate({
                        ...block,
                        content: '',
                        type: blockType,
                        ...(checked !== undefined && { checked })
                    })
                    return
                }
            }
        }

        // Detect slash menu trigger
        if (!showSlashMenu) {
            // Check if we just typed '/'
            const charBefore = cursorPos > 1 ? newContent[cursorPos - 2] : ''
            const justTypedSlash = newContent[cursorPos - 1] === '/'
            const isValidTrigger = cursorPos === 1 || charBefore === '\n' || charBefore === ' ' || charBefore === ''

            if (justTypedSlash && isValidTrigger && block.type === 'text') {
                openSlashMenu(e.target, cursorPos - 1)
                onUpdate({ ...block, content: newContent })
                return
            }
        } else {
            // Slash menu is open - update the query
            if (slashStartIndex !== null) {
                const query = newContent.substring(slashStartIndex + 1, cursorPos)

                // Check if query is still valid (no spaces)
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

    const handleDragStart = (e: ReactDragEvent<HTMLDivElement>) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(e)
    }

    const handleDragEnd = (e: ReactDragEvent<HTMLDivElement>) => {
        onDragEnd?.(e)
    }

    const getPlaceholder = () => {
        switch (block.type) {
            case 'h1':
                return 'Heading 1'
            case 'h2':
                return 'Heading 2'
            case 'h3':
                return 'Heading 3'
            case 'bullet-list':
                return 'List item'
            case 'numbered-list':
                return 'List item'
            case 'todo':
                return 'To-do'
            case 'code':
                return 'Write some code...'
            case 'quote':
                return 'Quote...'
            case 'text':
                return "Type '/' for commands..."
            default:
                return ''
        }
    }

    const getBlockStyle = () => {
        switch (block.type) {
            case 'h1':
                return 'text-3xl font-bold tracking-tight'
            case 'h2':
                return 'text-2xl font-semibold tracking-tight'
            case 'h3':
                return 'text-xl font-semibold'
            case 'quote':
                return 'italic text-gray-600 dark:text-gray-400 border-l-4 border-gray-300 dark:border-gray-600 pl-4'
            case 'code':
                return 'font-mono text-sm bg-gray-200 dark:bg-gray-800 p-3 rounded-lg'
            case 'bullet-list':
                return 'pl-6 relative before:content-["•"] before:absolute before:left-2 before:text-gray-400'
            case 'numbered-list':
                return 'pl-6'
            default:
                return ''
        }
    }

    const handleAddBlockBelow = () => {
        onEnter()
    }

    return (
        <div
            ref={blockRef}
            className={`group flex items-start gap-1 relative transition-all duration-150 rounded-lg -mx-2 px-2 py-0.5
                ${isDragging ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${contextMenu ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                ${isFocused && !isDragging ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                ${isHovered && !isDragging && !isFocused ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
            `}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            draggable={false}
        >
            {/* Block actions - visible on hover */}
            <div className={`flex items-center gap-0.5 pt-1.5 flex-shrink-0 transition-opacity duration-150
                ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Add block button */}
                <button
                    onClick={handleAddBlockBelow}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Add block below"
                >
                    <Plus size={14} className="text-gray-400 dark:text-gray-500" />
                </button>

                {/* Drag handle */}
                <div
                    draggable={true}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
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
                    <ToggleBlock block={block} onUpdate={onUpdate} onKeyDown={handleKeyDown as any} />
                ) : block.type === 'callout' ? (
                    <CalloutBlock block={block} onUpdate={onUpdate} onKeyDown={handleKeyDown as any} />
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
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {slashQuery ? `Results for "${slashQuery}"` : 'Basic blocks'}
                        </div>
                    </div>

                    {/* Items list */}
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

                    {/* Footer hint */}
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
