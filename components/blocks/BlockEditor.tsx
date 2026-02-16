'use client'

import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from 'react'
import { Block } from '@/lib/types'
import { GripVertical } from 'lucide-react'
import ContextMenu from '@/components/ContextMenu'
import { SlashMenu } from '@/components/SlashMenu'

export interface BlockEditorProps {
    block: Block
    onUpdate: (block: Block) => void
    onDelete: () => void
    onEnter: () => void
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
    onMergeUp?: () => void
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
    autoFocus,
    canMoveUp = true,
    canMoveDown = true,
    isDragging = false,
}: BlockEditorProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const blockRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus()
        }
    }, [autoFocus])

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        // Escape key handling - close slash menu and context menu first
        if (e.key === 'Escape') {
            if (showSlashMenu) {
                setShowSlashMenu(false)
                return
            }
            setContextMenu(null)
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

        // Ctrl/Cmd + Arrow Up: Move up
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
            e.preventDefault()
            onMoveUp()
            return
        }

        // Ctrl/Cmd + Arrow Down: Move down
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
            e.preventDefault()
            onMoveDown()
            return
        }

        // Arrow Up at beginning of block: navigate to previous block
        if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const textBeforeCursor = textarea.value.substring(0, cursorPos)
            const isAtFirstLine = !textBeforeCursor.includes('\n')
            
            if (isAtFirstLine && cursorPos === 0) {
                e.preventDefault()
                onNavigateToPreviousBlock?.()
                return
            }
        }

        // Arrow Down at end of block: navigate to next block
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget
            const cursorPos = textarea.selectionStart
            const content = textarea.value
            const textAfterCursor = content.substring(cursorPos)
            const isAtLastLine = !textAfterCursor.includes('\n')

            if (isAtLastLine && cursorPos === content.length) {
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

        // Enter creates new block (unless shift is pressed for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnter()
            return
        }

        // Backspace on empty content deletes block
        if (e.key === 'Backspace' && block.content === '') {
            e.preventDefault()
            onBackspace()
            return
        }

        // Slash menu trigger - check if we just typed '/' at the beginning
        if (e.key === '/') {
            const textarea = e.currentTarget
            const beforeSlash = textarea.value.substring(0, textarea.selectionStart)
            // Check if the slash is at the beginning or after whitespace/newline
            const isSlashTrigger = beforeSlash === '' || beforeSlash.endsWith('\n') || beforeSlash.match(/^\s*$/)
            
            if (isSlashTrigger) {
                // Prevent default to avoid the slash being typed
                // We'll handle this in onChange by detecting the slash trigger
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        
        // Check for slash menu trigger - only trigger if we just typed '/' at the beginning
        if (block.type === 'text' && newContent === '/') {
            const textarea = e.currentTarget
            const rect = textarea.getBoundingClientRect()
            setSlashMenuPos({
                top: rect.bottom + 5,
                left: rect.left,
            })
            setShowSlashMenu(true)
            // Update content with the slash
            onUpdate({ ...block, content: newContent })
            return
        }
        
        // Check if slash was removed (user backspaced)
        if (block.type === 'text' && block.content === '/' && newContent === '') {
            setShowSlashMenu(false)
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
            default:
                return ''
        }
    }

    const getBlockStyle = () => {
        switch (block.type) {
            case 'h1':
                return 'text-3xl font-bold'
            case 'h2':
                return 'text-2xl font-bold'
            case 'h3':
                return 'text-xl font-bold'
            case 'quote':
                return 'italic text-gray-600 dark:text-gray-400 border-l-4 border-gray-300 dark:border-gray-600 pl-4'
            case 'code':
                return 'font-mono text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded'
            default:
                return ''
        }
    }

    return (
        <div
            ref={blockRef}
            className={`group flex items-start gap-2 relative transition-all duration-150
                ${isDragging ? 'opacity-50 bg-gray-100 dark:bg-gray-700/50' : ''}
                ${contextMenu ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
            `}
            onContextMenu={handleContextMenu}
            draggable={false}
        >
            {/* Grip handle - interactive drag area */}
            <div
                className="group-hover:flex items-center justify-center w-6 pt-2.5 flex-shrink-0"
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                title="Drag to move block"
            >
                <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <GripVertical
                        size={16}
                        className="text-transparent group-hover:text-gray-600 dark:group-hover:text-gray-500 transition-colors"
                    />
                </div>
            </div>

            {/* Block content */}
            <div className="flex-1 min-w-0">
                {block.type === 'todo' ? (
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={block.checked || false}
                            onChange={(e) => onUpdate({ ...block, checked: e.target.checked })}
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                        />
                        <textarea
                            ref={inputRef}
                            value={block.content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder={getPlaceholder()}
                            className={`outline-none w-full bg-transparent resize-none
                         dark:text-gray-100 text-gray-900
                         ${block.checked ? 'line-through text-gray-400' : ''}
                         ${getBlockStyle()}`}
                            rows={1}
                            style={{ minHeight: 'auto' }}
                        />
                    </label>
                ) : block.type === 'divider' ? (
                    <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
                ) : (
                    <textarea
                        ref={inputRef}
                        value={block.content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={getPlaceholder()}
                        className={`outline-none w-full bg-transparent resize-none
                       dark:text-gray-100 text-gray-900 transition-colors
                       ${getBlockStyle()}`}
                        rows={1}
                        style={{ minHeight: 'auto' }}
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
                    onMergeUp={onMergeUp}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                />
            )}

            {/* Slash menu */}
            {showSlashMenu && (
                <SlashMenu
                    position={slashMenuPos}
                    onClose={() => {
                        setShowSlashMenu(false)
                        // Restore the slash if menu was closed without selection
                        if (inputRef.current && block.content === '/') {
                            // Keep the slash visible if they closed the menu
                        }
                    }}
                    onSelect={(type) => {
                        // Change block type and clear content (removing the slash)
                        setShowSlashMenu(false)
                        onChangeType?.(type)
                        onUpdate({ ...block, content: '', type })
                    }}
                />
            )}
        </div>
    )
}

