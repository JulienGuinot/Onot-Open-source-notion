'use client'

import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from 'react'
import { Block, BlockType } from '@/lib/types'
import { GripVertical, Plus } from 'lucide-react'
import { createBlock, deepDuplicateBlock } from '@/lib/blockUtils'
import ContextMenu from '@/components/ContextMenu'
import ToggleBlock from '@/components/blocks/ToggleBlock'
import CalloutBlock from '@/components/blocks/CalloutBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import YoutubeBlock from '@/components/blocks/YoutubeBlock'
import TodoBlock from '@/components/blocks/TodoBlock'
import DividerBlock from '@/components/blocks/DividerBlock'
import TextareaBlock from '@/components/blocks/TextareaBlock'
import TableBlock from '@/components/table/TableBlock'
import SlashMenu from '@/components/SlashMenu'
import { useSlashMenu } from '@/hooks/useSlashMenu'
import { useContainerChildren } from '@/hooks/useContainerChildren'

// ─── Constants ───────────────────────────────────────────────

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

const MULTI_LINE_BLOCK_TYPES: BlockType[] = ['code', 'quote']
const LIST_BLOCK_TYPES: BlockType[] = ['bullet-list', 'numbered-list', 'todo']
const CONTAINER_BLOCK_TYPES: BlockType[] = ['toggle', 'callout']

const BLOCK_STYLES: Partial<Record<BlockType, string>> = {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold tracking-tight',
    h3: 'text-xl font-semibold',
    quote: 'italic text-gray-600 dark:text-gray-400 border-l-4 border-gray-300 dark:border-gray-600 pl-4',
    code: 'font-mono text-sm bg-gray-200 dark:bg-gray-800 p-3 rounded-lg',
    'bullet-list': 'pl-6 relative before:content-["•"] before:absolute before:left-2 before:text-gray-400',
    'numbered-list': 'pl-6',
}

const BLOCK_PLACEHOLDERS: Partial<Record<BlockType, string>> = {
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    'bullet-list': 'List item',
    'numbered-list': 'List item',
    todo: 'To-do',
    code: 'Write some code...',
    quote: 'Quote...',
}

// ─── Props ───────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────

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
    // ─── Local state ─────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const blockRef = useRef<HTMLDivElement>(null)

    // ─── Hooks ───────────────────────────────────────────────
    const {
        showSlashMenu, slashMenuPos, slashQuery, slashStartIndex,
        setSlashQuery, openSlashMenu, closeSlashMenu, handleSlashSelect,
    } = useSlashMenu({ block, onUpdate, onChangeType })

    const {
        focusChildId, setFocusChildId, addChildBlock, updateChildBlock, deleteChildBlock,
    } = useContainerChildren({ block, onUpdate })

    // ─── Computed ────────────────────────────────────────────
    const blockStyle = BLOCK_STYLES[block.type] || ''
    const placeholder = BLOCK_PLACEHOLDERS[block.type] || ''

    // ─── Effects ─────────────────────────────────────────────

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

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
        }
    }, [block.content])

    // ─── Keyboard handler ────────────────────────────────────

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        // When slash menu is open, let the SlashMenu component handle navigation.
        // Only preventDefault here to stop the textarea from acting on these keys.
        if (showSlashMenu) {
            if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key)) {
                e.preventDefault()
                return
            }
            if (e.key === 'Backspace' && slashQuery.length === 0) {
                closeSlashMenu()
            }
            return
        }

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
                const newChild: Block = { ...createBlock('text', ''), autoFocus: true }
                const children = [...(block.children || []), newChild]
                onUpdate({ ...block, children, toggleOpen: true })
                return
            }

            // Callout: Enter creates child inside
            if (block.type === 'callout') {
                e.preventDefault()
                if (cursorPos < content.length && cursorPos > 0) {
                    const contentBefore = content.substring(0, cursorPos)
                    const contentAfter = content.substring(cursorPos)
                    const newChild: Block = { ...createBlock('text', contentAfter), autoFocus: true }
                    onUpdate({
                        ...block,
                        content: contentBefore,
                        children: [newChild, ...(block.children || [])],
                    })
                } else {
                    const newChild: Block = { ...createBlock('text', ''), autoFocus: true }
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

    // ─── Change handler ──────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        const cursorPos = e.target.selectionStart

        // Markdown shortcuts (space after shortcut text)
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

        // Slash menu trigger / query update
        if (!showSlashMenu) {
            const charBefore = cursorPos > 1 ? newContent[cursorPos - 2] : ''
            const justTypedSlash = newContent[cursorPos - 1] === '/'
            const isValidTrigger = cursorPos === 1 || charBefore === '\n' || charBefore === ' ' || charBefore === ''
            if (justTypedSlash && isValidTrigger && block.type === 'text') {
                openSlashMenu(e.target, cursorPos - 1)
                onUpdate({ ...block, content: newContent })
                return
            }
        } else if (slashStartIndex !== null) {
            const query = newContent.substring(slashStartIndex + 1, cursorPos)
            if (query.includes(' ') || query.includes('\n')) {
                closeSlashMenu()
            } else {
                setSlashQuery(query)
            }
        }

        onUpdate({ ...block, content: newContent })
    }

    // ─── Event handlers ──────────────────────────────────────

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

    // ─── Children rendering (for toggle/callout) ─────────────

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
                                const newChildren = currentChildren.filter(c => c.id !== child.id)
                                onUpdate({ ...block, children: newChildren, autoFocus: true })
                            }
                        }}
                        onMergeUp={(contentToMerge) => {
                            const currentChildren = block.children || []
                            if (childIndex === 0) {
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

    // ─── Render ──────────────────────────────────────────────

    return (
        <div
            ref={blockRef}
            className={`group flex items-start gap-1 relative transition-all duration-150 rounded-lg -mx-2 px-2 py-0.5
                ${isDragging ? 'opacity-50 bg-blue-50 dark:bg-zinc-900/30' : ''}
                ${isSelected ? 'bg-blue-100/60 dark:bg-zinc-900/30 ring-1 ' : ''}
                ${contextMenu && !isSelected ? 'bg-zinc-100 dark:bg-gray-800/50 border border-blue-200 dark:border-yellow-500 border-dashed' : ''}
                ${isFocused && !isDragging && !isSelected ? 'bg-zinc-200/30 dark:bg-zinc-900/20' : ''}
                ${isHovered && !isDragging && !isFocused && !isSelected ? 'bg-gray-50/50 dark:bg-zinc-700/10' : ''}
            `}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onBlockClick}
            draggable={false}
        >
            {/* Block actions - visible on hover */}
            <div className={`flex  gap-0.5 pt-1.5 flex-shrink-0 transition-opacity duration-150
                ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onEnter() }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Add block below"
                >
                    <Plus size={14} className="text-gray-400 dark:text-gray-500" />
                </button>
                <div
                    draggable={true}
                    onDragStart={handleDragStartEvent}
                    onDragEnd={handleDragEndEvent}
                    onClick={handleContextMenu}
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Drag to move block"
                >
                    <GripVertical size={14} className="text-gray-400 dark:text-gray-500" />
                </div>
            </div>

            {/* Block content */}
            <div className="flex-1 min-w-0 py-0.5">
                {block.type === 'todo' ? (
                    <TodoBlock
                        ref={inputRef}
                        block={block}
                        onUpdate={onUpdate}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        blockStyle={blockStyle}
                    />

                ) : block.type === 'divider' ? (
                    <DividerBlock />

                ) : block.type === 'toggle' ? (
                    <div className="group/container">
                        <ToggleBlock
                            block={block}
                            onUpdate={onUpdate}
                            onKeyDown={handleKeyDown as any}
                            autoFocus={autoFocus}
                        />
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

                ) : block.type === 'youtube' ? (
                    <YoutubeBlock block={block} onUpdate={onUpdate} onKeyDown={handleKeyDown as any} />

                ) : (
                    <TextareaBlock
                        ref={inputRef}
                        value={block.content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        blockStyle={blockStyle}
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

            {/* Slash menu - uses the existing SlashMenu component */}
            {showSlashMenu && slashMenuPos && (
                <SlashMenu
                    onClose={closeSlashMenu}
                    onSelect={handleSlashSelect}
                    position={slashMenuPos}
                    searchQuery={slashQuery}
                />
            )}
        </div>
    )
}
