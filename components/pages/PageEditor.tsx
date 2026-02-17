'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Block, BlockType } from '@/lib/types'
import BlockEditor from '@/components/blocks/BlockEditor'
import EmojiPicker from '@/components/EmojiPicker'
import { useHistory } from '@/lib/useHistory'
import { Undo2, Redo2, Copy, Scissors, ClipboardPaste } from 'lucide-react'
import {
    createBlock,
    deepDuplicateBlock,
    blocksToPlainText,
    plainTextToBlocks,
    serializeBlocksForClipboard,
    deserializeBlocksFromClipboard,
} from '@/lib/blockUtils'

// Module-level clipboard for internal block copy/paste
let internalClipboard: Block[] | null = null

interface PageEditorProps {
    page: Page
    onUpdatePage: (page: Page) => void
}

export default function PageEditor({
    page,
    onUpdatePage,
}: PageEditorProps) {
    const [showCoverPicker, setShowCoverPicker] = useState(false)
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
    const [showUndoToast, setShowUndoToast] = useState<'undo' | 'redo' | null>(null)
    const [showClipboardToast, setShowClipboardToast] = useState<'copy' | 'cut' | 'paste' | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // ─── Multi-block selection ──────────────────────────────────
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
    const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null)

    // Blur active element when blocks are selected (exit text editing mode)
    useEffect(() => {
        if (selectedBlockIds.size > 0) {
            const active = document.activeElement as HTMLElement | null
            if (active && (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) {
                active.blur()
            }
        }
    }, [selectedBlockIds.size])

    // Clear selection when page changes
    useEffect(() => {
        setSelectedBlockIds(new Set())
        setSelectionAnchor(null)
    }, [page.id])

    // ─── History system ─────────────────────────────────────────
    const {
        state: historyBlocks,
        pushState: pushBlocksHistory,
        undo: undoBlocks,
        redo: redoBlocks,
        canUndo,
        canRedo,
    } = useHistory<Block[]>(page.blocks, { maxHistory: 100, debounceMs: 500 })

    useEffect(() => {
        if (JSON.stringify(page.blocks) !== JSON.stringify(historyBlocks)) {
            pushBlocksHistory(page.blocks, true)
        }
    }, [page.id])

    useEffect(() => {
        if (!focusBlockId) return
        const timer = setTimeout(() => setFocusBlockId(null), 100)
        return () => clearTimeout(timer)
    }, [focusBlockId])

    // ─── Block operations ───────────────────────────────────────

    const updateBlocks = useCallback((newBlocks: Block[], immediate = false) => {
        pushBlocksHistory(newBlocks, immediate)
        onUpdatePage({ ...page, blocks: newBlocks, updatedAt: Date.now() })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleBlockUpdate = useCallback((blockId: string, updatedBlock: Block) => {
        const newBlocks = page.blocks.map((b) => (b.id === blockId ? updatedBlock : b))
        pushBlocksHistory(newBlocks)
        onUpdatePage({ ...page, blocks: newBlocks, updatedAt: Date.now() })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleAddBlock = useCallback((index: number, initialContent: string = '', blockType: BlockType = 'text') => {
        const newBlock: Block = {
            ...createBlock(blockType, initialContent),
            autoFocus: true,
        }
        const newBlocks = [...page.blocks]
        newBlocks.splice(index + 1, 0, newBlock)

        updateBlocks(newBlocks, true)
        setFocusBlockId(newBlock.id)
    }, [page, updateBlocks])

    const handleConvertToText = useCallback((blockId: string) => {
        const block = page.blocks.find((b) => b.id === blockId)
        if (!block) return
        handleBlockUpdate(blockId, { ...block, type: 'text' })
    }, [page.blocks, handleBlockUpdate])

    const handleDeleteBlock = useCallback((blockId: string) => {
        const index = page.blocks.findIndex(b => b.id === blockId)
        const block = page.blocks[index]
        if (!block) return

        // Promote children to siblings when deleting a container block
        const promotedChildren = block.children || []

        let newBlocks: Block[]
        if (promotedChildren.length > 0) {
            newBlocks = [
                ...page.blocks.slice(0, index),
                ...promotedChildren,
                ...page.blocks.slice(index + 1)
            ]
        } else {
            newBlocks = page.blocks.filter((b) => b.id !== blockId)
        }

        updateBlocks(newBlocks, true)

        // Focus logic: prefer promoted children, then previous, then next
        if (promotedChildren.length > 0) {
            setFocusBlockId(promotedChildren[0]!.id)
        } else if (index > 0) {
            const prevBlock = page.blocks[index - 1]
            if (prevBlock) setFocusBlockId(prevBlock.id)
        } else if (newBlocks.length > 0) {
            setFocusBlockId(newBlocks[0]!.id)
        }
    }, [page, updateBlocks])

    const handleMergeUp = useCallback((index: number, contentToMerge?: string) => {
        if (index === 0) return

        const currentBlock = page.blocks[index]
        const previousBlock = page.blocks[index - 1]
        if (!currentBlock || !previousBlock) return

        const content = contentToMerge !== undefined ? contentToMerge : currentBlock.content
        const mergedContent = content ? previousBlock.content + content : previousBlock.content

        // Promote children of the merged block to siblings
        const promotedChildren = currentBlock.children || []

        let newBlocks = page.blocks.filter((_, i) => i !== index)
        newBlocks = newBlocks.map((b) =>
            b.id === previousBlock.id ? { ...b, content: mergedContent, autoFocus: true } : b
        )

        // Insert promoted children after the previous block
        if (promotedChildren.length > 0) {
            const prevIndex = newBlocks.findIndex(b => b.id === previousBlock.id)
            newBlocks.splice(prevIndex + 1, 0, ...promotedChildren)
        }

        updateBlocks(newBlocks, true)
        setFocusBlockId(previousBlock.id)
    }, [page, updateBlocks])

    const handleMoveBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= page.blocks.length) return

        const newBlocks = [...page.blocks]
        const temp = newBlocks[index]!
        newBlocks[index] = newBlocks[targetIndex]!
        newBlocks[targetIndex] = temp

        updateBlocks(newBlocks, true)
    }, [page, updateBlocks])

    const handleDuplicateBlock = useCallback((index: number) => {
        const block = page.blocks[index]
        if (!block) return

        const duplicated = deepDuplicateBlock(block)
        duplicated.autoFocus = true

        const newBlocks = [...page.blocks]
        newBlocks.splice(index + 1, 0, duplicated)

        updateBlocks(newBlocks, true)
        setFocusBlockId(duplicated.id)
    }, [page, updateBlocks])

    const handleNavigateBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex >= 0 && targetIndex < page.blocks.length) {
            const targetBlock = page.blocks[targetIndex]
            if (targetBlock) setFocusBlockId(targetBlock.id)
        }
    }, [page.blocks])

    const handleChangeBlockType = useCallback((blockId: string, newType: string) => {
        const block = page.blocks.find((b) => b.id === blockId)
        if (!block) return
        handleBlockUpdate(blockId, {
            ...block,
            type: newType as BlockType,
            ...(newType === 'divider' && { content: '' }),
        })
    }, [page.blocks, handleBlockUpdate])

    const handleCopyLink = useCallback((blockId: string) => {
        const link = `${window.location.href}#${blockId}`
        navigator.clipboard.writeText(link)
    }, [])

    // ─── Undo / Redo ────────────────────────────────────────────

    const handleUndo = useCallback(() => {
        const previousBlocks = undoBlocks()
        if (previousBlocks) {
            onUpdatePage({ ...page, blocks: previousBlocks, updatedAt: Date.now() })
            setShowUndoToast('undo')
            setTimeout(() => setShowUndoToast(null), 1500)
        }
    }, [undoBlocks, page, onUpdatePage])

    const handleRedo = useCallback(() => {
        const nextBlocks = redoBlocks()
        if (nextBlocks) {
            onUpdatePage({ ...page, blocks: nextBlocks, updatedAt: Date.now() })
            setShowUndoToast('redo')
            setTimeout(() => setShowUndoToast(null), 1500)
        }
    }, [redoBlocks, page, onUpdatePage])

    // ─── Clipboard operations ───────────────────────────────────

    const handleCopy = useCallback(() => {
        if (selectedBlockIds.size === 0) return

        const blocks = page.blocks.filter(b => selectedBlockIds.has(b.id))
        if (blocks.length === 0) return

        // Store in internal clipboard (deep copies with original structure)
        internalClipboard = blocks.map(b => deepDuplicateBlock(b))

        // Write both serialized blocks and plain text to system clipboard
        const plainText = blocksToPlainText(blocks)
        const serialized = serializeBlocksForClipboard(blocks)

        // Use the Clipboard API with serialized format as primary
        navigator.clipboard.writeText(serialized).catch(() => {
            navigator.clipboard.writeText(plainText)
        })

        setShowClipboardToast('copy')
        setTimeout(() => setShowClipboardToast(null), 1500)
    }, [selectedBlockIds, page.blocks])

    const handleCut = useCallback(() => {
        if (selectedBlockIds.size === 0) return

        handleCopy()

        // Delete selected blocks
        const newBlocks = page.blocks.filter(b => !selectedBlockIds.has(b.id))
        updateBlocks(newBlocks, true)
        setSelectedBlockIds(new Set())

        if (newBlocks.length > 0) setFocusBlockId(newBlocks[0]!.id)

        setShowClipboardToast('cut')
        setTimeout(() => setShowClipboardToast(null), 1500)
    }, [handleCopy, selectedBlockIds, page, updateBlocks])

    const handlePaste = useCallback(async () => {
        let blocksToInsert: Block[] | null = null

        // Try internal clipboard first
        if (internalClipboard && internalClipboard.length > 0) {
            blocksToInsert = internalClipboard.map(b => deepDuplicateBlock(b))
        } else {
            // Try system clipboard
            try {
                const text = await navigator.clipboard.readText()
                if (text) {
                    // Check if it's our serialized format
                    const deserialized = deserializeBlocksFromClipboard(text)
                    if (deserialized) {
                        blocksToInsert = deserialized
                    } else {
                        blocksToInsert = plainTextToBlocks(text)
                    }
                }
            } catch {
                // Clipboard read failed
            }
        }

        if (!blocksToInsert || blocksToInsert.length === 0) return

        let newBlocks: Block[]
        let insertIndex: number

        if (selectedBlockIds.size > 0) {
            // Replace selected blocks with pasted blocks
            const selectedIndices = page.blocks
                .map((b, i) => selectedBlockIds.has(b.id) ? i : -1)
                .filter(i => i !== -1)
            const firstSelectedIndex = Math.min(...selectedIndices)

            newBlocks = page.blocks.filter(b => !selectedBlockIds.has(b.id))
            newBlocks.splice(firstSelectedIndex, 0, ...blocksToInsert)
            setSelectedBlockIds(new Set())
        } else {
            // Insert after focused block or at the end
            insertIndex = page.blocks.length - 1
            if (focusBlockId) {
                const idx = page.blocks.findIndex(b => b.id === focusBlockId)
                if (idx !== -1) insertIndex = idx
            }

            newBlocks = [...page.blocks]
            newBlocks.splice(insertIndex + 1, 0, ...blocksToInsert)
        }

        updateBlocks(newBlocks, true)
        setFocusBlockId(blocksToInsert[blocksToInsert.length - 1]?.id || null)

        setShowClipboardToast('paste')
        setTimeout(() => setShowClipboardToast(null), 1500)
    }, [selectedBlockIds, page, updateBlocks, focusBlockId])

    // ─── Selection handling ─────────────────────────────────────

    const handleBlockClick = useCallback((blockId: string, e: React.MouseEvent) => {
        if (e.shiftKey) {
            e.preventDefault()
            const anchor = selectionAnchor || page.blocks[0]?.id
            if (!anchor) return

            const anchorIndex = page.blocks.findIndex(b => b.id === anchor)
            const targetIndex = page.blocks.findIndex(b => b.id === blockId)
            if (anchorIndex === -1 || targetIndex === -1) return

            const start = Math.min(anchorIndex, targetIndex)
            const end = Math.max(anchorIndex, targetIndex)

            const newSelection = new Set<string>()
            for (let i = start; i <= end; i++) {
                const b = page.blocks[i]
                if (b) newSelection.add(b.id)
            }
            setSelectedBlockIds(newSelection)
        } else {
            // Normal click: clear selection, set anchor
            if (selectedBlockIds.size > 0) {
                setSelectedBlockIds(new Set())
            }
            setSelectionAnchor(blockId)
        }
    }, [page.blocks, selectionAnchor, selectedBlockIds])

    // ─── Drag & Drop ────────────────────────────────────────────

    const handleDragStart = useCallback((blockId: string) => {
        setDraggedBlockId(blockId)
    }, [])

    const handleDragEnd = useCallback(() => {
        setDraggedBlockId(null)
        setDragOverIndex(null)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault()
        if (!draggedBlockId) return

        const sourceIndex = page.blocks.findIndex((b) => b.id === draggedBlockId)
        if (sourceIndex === -1 || sourceIndex === targetIndex) {
            setDraggedBlockId(null)
            setDragOverIndex(null)
            return
        }

        const newBlocks = [...page.blocks]
        const [draggedBlock] = newBlocks.splice(sourceIndex, 1)
        newBlocks.splice(targetIndex, 0, draggedBlock!)

        updateBlocks(newBlocks, true)
        setDraggedBlockId(null)
        setDragOverIndex(null)
    }, [draggedBlockId, page, updateBlocks])

    // ─── Global keyboard shortcuts ──────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement
            const isInInput = activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement

            // Ctrl/Cmd + Z: Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
                return
            }

            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
            if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
                ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
                e.preventDefault()
                handleRedo()
                return
            }

            // Ctrl/Cmd + C: Copy selected blocks
            if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedBlockIds.size > 0) {
                e.preventDefault()
                handleCopy()
                return
            }

            // Ctrl/Cmd + X: Cut selected blocks
            if ((e.metaKey || e.ctrlKey) && e.key === 'x' && selectedBlockIds.size > 0) {
                e.preventDefault()
                handleCut()
                return
            }

            // Ctrl/Cmd + V: Paste blocks (only when not in text input, or blocks are selected)
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                if (selectedBlockIds.size > 0 || !isInInput) {
                    e.preventDefault()
                    handlePaste()
                    return
                }
                // When in text input with no selection, let browser handle paste
            }

            // Ctrl/Cmd + A: Select all blocks
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                if (isInInput) {
                    const input = activeEl as HTMLTextAreaElement | HTMLInputElement
                    // If all text already selected, select all blocks instead
                    if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
                        e.preventDefault()
                        setSelectedBlockIds(new Set(page.blocks.map(b => b.id)))
                        input.blur()
                        return
                    }
                    // Otherwise let browser select all text first
                    return
                }
                e.preventDefault()
                setSelectedBlockIds(new Set(page.blocks.map(b => b.id)))
                return
            }

            // Delete/Backspace selected blocks
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedBlockIds.size > 0 && !isInInput) {
                e.preventDefault()
                const newBlocks = page.blocks.filter(b => !selectedBlockIds.has(b.id))
                updateBlocks(newBlocks, true)
                setSelectedBlockIds(new Set())
                if (newBlocks.length > 0) setFocusBlockId(newBlocks[0]!.id)
                return
            }

            // Escape: Clear selection
            if (e.key === 'Escape' && selectedBlockIds.size > 0) {
                setSelectedBlockIds(new Set())
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo, handleCopy, handleCut, handlePaste, selectedBlockIds, page, updateBlocks])

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
            {/* Undo/Redo/Clipboard Toast */}
            {(showUndoToast || showClipboardToast) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100
                                    text-white dark:text-gray-900 rounded-lg shadow-xl">
                        {showUndoToast === 'undo' && <><Undo2 size={16} /><span className="text-sm font-medium">Action annulée</span></>}
                        {showUndoToast === 'redo' && <><Redo2 size={16} /><span className="text-sm font-medium">Action rétablie</span></>}
                        {showClipboardToast === 'copy' && <><Copy size={16} /><span className="text-sm font-medium">{selectedBlockIds.size || ''} bloc{selectedBlockIds.size > 1 ? 's' : ''} copié{selectedBlockIds.size > 1 ? 's' : ''}</span></>}
                        {showClipboardToast === 'cut' && <><Scissors size={16} /><span className="text-sm font-medium">Bloc(s) coupé(s)</span></>}
                        {showClipboardToast === 'paste' && <><ClipboardPaste size={16} /><span className="text-sm font-medium">Bloc(s) collé(s)</span></>}
                    </div>
                </div>
            )}

            {/* Undo/Redo Floating Buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1 bg-white dark:bg-gray-800
                            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1
                            opacity-60 hover:opacity-100 transition-opacity">
                <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`p-2 rounded-md transition-colors ${canUndo
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                    title="Annuler (Ctrl+Z)"
                >
                    <Undo2 size={16} />
                </button>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`p-2 rounded-md transition-colors ${canRedo
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                    title="Rétablir (Ctrl+Shift+Z)"
                >
                    <Redo2 size={16} />
                </button>
            </div>

            {/* Selection info bar */}
            {selectedBlockIds.size > 0 && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 dark:bg-blue-500
                                    text-white rounded-xl shadow-xl text-sm font-medium">
                        <span>{selectedBlockIds.size} bloc{selectedBlockIds.size > 1 ? 's' : ''} sélectionné{selectedBlockIds.size > 1 ? 's' : ''}</span>
                        <div className="w-px h-4 bg-blue-400/50" />
                        <button onClick={handleCopy} className="hover:bg-blue-500 dark:hover:bg-blue-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" title="Copier (Ctrl+C)">
                            <Copy size={14} /> Copier
                        </button>
                        <button onClick={handleCut} className="hover:bg-blue-500 dark:hover:bg-blue-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" title="Couper (Ctrl+X)">
                            <Scissors size={14} /> Couper
                        </button>
                        <button
                            onClick={() => {
                                const newBlocks = page.blocks.filter(b => !selectedBlockIds.has(b.id))
                                updateBlocks(newBlocks, true)
                                setSelectedBlockIds(new Set())
                                if (newBlocks.length > 0) setFocusBlockId(newBlocks[0]!.id)
                            }}
                            className="hover:bg-red-500 px-2 py-1 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            Supprimer
                        </button>
                        <button
                            onClick={() => setSelectedBlockIds(new Set())}
                            className="hover:bg-blue-500 dark:hover:bg-blue-400 px-2 py-1 rounded-lg transition-colors text-blue-200"
                            title="Annuler la sélection (Esc)"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Cover */}
            {page.coverGradient && (
                <div
                    className="w-full h-52 bg-cover bg-center relative group"
                    style={{ background: page.coverGradient }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 dark:from-gray-900/20 to-transparent" />
                    <button
                        onClick={() => setShowCoverPicker(!showCoverPicker)}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                                   text-gray-700 dark:text-gray-300 text-sm rounded-lg
                                   hover:bg-white dark:hover:bg-gray-800 transition-all duration-200
                                   opacity-0 group-hover:opacity-100 shadow-sm"
                    >
                        Change cover
                    </button>
                </div>
            )}

            {/* Page Icon and Title */}
            <div className="max-w-12xl mx-auto px-8 pt-8 pb-4">
                <EmojiPicker
                    currentEmoji={page.icon}
                    onSelect={(emoji) =>
                        onUpdatePage({
                            ...page,
                            icon: emoji,
                            updatedAt: Date.now(),
                        })
                    }
                />
                <input
                    type="text"
                    value={page.title}
                    onChange={(e) =>
                        onUpdatePage({
                            ...page,
                            title: e.target.value,
                            updatedAt: Date.now(),
                        })
                    }
                    placeholder="Untitled"
                    className="text-4xl font-bold outline-none w-full bg-transparent tracking-tight
                             dark:text-gray-100 text-gray-900 transition-colors mt-4
                             placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
            </div>

            {/* Blocks */}
            <div className="max-w-12xl mx-auto px-8 pb-32">
                {page.blocks.length === 0 ? (
                    <div
                        className="py-8 text-center cursor-pointer group"
                        onClick={() => handleAddBlock(-1, '', 'text')}
                    >
                        <div className="text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">
                            Cliquez ici ou appuyez sur Entrée pour commencer à écrire...
                        </div>
                    </div>
                ) : (
                    page.blocks.map((block, index) => (
                        <div
                            key={block.id}
                            className={`transition-all duration-200 ${dragOverIndex === index
                                ? 'pt-4 border-t-2 border-blue-400 dark:border-blue-500'
                                : ''
                                } ${draggedBlockId === block.id ? 'opacity-50' : ''}`}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <BlockEditor
                                key={block.id}
                                block={block}
                                autoFocus={block.autoFocus || focusBlockId === block.id}
                                isSelected={selectedBlockIds.has(block.id)}
                                onBlockClick={(e) => handleBlockClick(block.id, e)}
                                onUpdate={(updated) => {
                                    if (updated.autoFocus) {
                                        updated = { ...updated, autoFocus: false }
                                    }
                                    handleBlockUpdate(block.id, updated)
                                }}
                                onDelete={() => handleDeleteBlock(block.id)}
                                onEnter={(splitContent?: string, blockType?: BlockType) =>
                                    handleAddBlock(index, splitContent || '', blockType || 'text')
                                }
                                onBackspace={() => {
                                    if (index > 0) {
                                        handleDeleteBlock(block.id)
                                    }
                                }}
                                onMoveUp={() => handleMoveBlock(index, 'up')}
                                onMoveDown={() => handleMoveBlock(index, 'down')}
                                onNavigateToPreviousBlock={() => handleNavigateBlock(index, 'up')}
                                onNavigateToNextBlock={() => handleNavigateBlock(index, 'down')}
                                canMoveUp={index > 0}
                                canMoveDown={index < page.blocks.length - 1}
                                onDuplicate={() => handleDuplicateBlock(index)}
                                onDragStart={() => handleDragStart(block.id)}
                                onDragEnd={handleDragEnd}
                                isDragging={draggedBlockId === block.id}
                                onChangeType={(newType) => handleChangeBlockType(block.id, newType)}
                                onCopyLink={() => handleCopyLink(block.id)}
                                onMergeUp={(contentToMerge: string) => handleMergeUp(index, contentToMerge)}
                                onConvertToText={() => handleConvertToText(block.id)}
                            />
                        </div>
                    ))
                )}

                {/* Add block at the end */}
                {page.blocks.length > 0 && (
                    <div
                        className="py-4 mt-2 cursor-pointer group opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => handleAddBlock(page.blocks.length - 1, '', 'text')}
                    >
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                            + Ajouter un bloc
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
