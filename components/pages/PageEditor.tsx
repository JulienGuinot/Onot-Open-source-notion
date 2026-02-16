'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Block, BlockType } from '@/lib/types'
import BlockEditor from '@/components/blocks/BlockEditor'
import EmojiPicker from '@/components/EmojiPicker'
import { useHistory } from '@/lib/useHistory'
import { Undo2, Redo2 } from 'lucide-react'

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
    const containerRef = useRef<HTMLDivElement>(null)

    // History system for undo/redo
    const {
        state: historyBlocks,
        pushState: pushBlocksHistory,
        undo: undoBlocks,
        redo: redoBlocks,
        canUndo,
        canRedo,
    } = useHistory<Block[]>(page.blocks, { maxHistory: 100, debounceMs: 500 })

    // Sync page blocks with history when page changes externally
    useEffect(() => {
        // Only sync if the blocks are different (external change)
        if (JSON.stringify(page.blocks) !== JSON.stringify(historyBlocks)) {
            pushBlocksHistory(page.blocks, true)
        }
    }, [page.id]) // Only on page change

    // Clear focusBlockId after focus is applied to allow re-focusing the same block
    useEffect(() => {
        if (!focusBlockId) return

        const timer = setTimeout(() => {
            setFocusBlockId(null)
        }, 100)
        return () => clearTimeout(timer)
    }, [focusBlockId])

    const handleBlockUpdate = useCallback((blockId: string, updatedBlock: Block) => {
        const newBlocks = page.blocks.map((b) => (b.id === blockId ? updatedBlock : b))
        pushBlocksHistory(newBlocks)

        const updatedPage: Page = {
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        }
        onUpdatePage(updatedPage)
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleAddBlock = useCallback((index: number, initialContent: string = '', blockType: BlockType = 'text') => {
        const newBlock: Block = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: blockType,
            content: initialContent,
            autoFocus: true,
        }
        const newBlocks = [...page.blocks]
        newBlocks.splice(index + 1, 0, newBlock)

        pushBlocksHistory(newBlocks, true)
        setFocusBlockId(newBlock.id)

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleConvertToText = useCallback((blockId: string) => {
        const block = page.blocks.find((b) => b.id === blockId)
        if (!block) return

        const updatedBlock: Block = {
            ...block,
            type: 'text',
        }
        handleBlockUpdate(blockId, updatedBlock)
    }, [page.blocks, handleBlockUpdate])

    const handleDeleteBlock = useCallback((blockId: string) => {
        const index = page.blocks.findIndex(b => b.id === blockId)
        const newBlocks = page.blocks.filter((b) => b.id !== blockId)

        pushBlocksHistory(newBlocks, true)

        // Focus previous block, or next block if deleting the first one
        if (index > 0) {
            const prevBlock = page.blocks[index - 1]
            if (prevBlock) {
                setFocusBlockId(prevBlock.id)
            }
        } else if (newBlocks.length > 0) {
            // Deleting first block, focus the new first block
            setFocusBlockId(newBlocks[0]!.id)
        }

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleUndo = useCallback(() => {
        const previousBlocks = undoBlocks()
        if (previousBlocks) {
            onUpdatePage({
                ...page,
                blocks: previousBlocks,
                updatedAt: Date.now(),
            })
            setShowUndoToast('undo')
            setTimeout(() => setShowUndoToast(null), 1500)
        }
    }, [undoBlocks, page, onUpdatePage])

    const handleRedo = useCallback(() => {
        const nextBlocks = redoBlocks()
        if (nextBlocks) {
            onUpdatePage({
                ...page,
                blocks: nextBlocks,
                updatedAt: Date.now(),
            })
            setShowUndoToast('redo')
            setTimeout(() => setShowUndoToast(null), 1500)
        }
    }, [redoBlocks, page, onUpdatePage])

    // Global keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo])

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

        pushBlocksHistory(newBlocks, true)

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })

        setDraggedBlockId(null)
        setDragOverIndex(null)
    }, [draggedBlockId, page, onUpdatePage, pushBlocksHistory])

    const handleChangeBlockType = useCallback((blockId: string, newType: string) => {
        const block = page.blocks.find((b) => b.id === blockId)
        if (!block) return

        const updatedBlock: Block = {
            ...block,
            type: newType as BlockType,
            ...(newType === 'divider' && { content: '' }),
        }
        handleBlockUpdate(blockId, updatedBlock)
    }, [page.blocks, handleBlockUpdate])

    const handleCopyLink = useCallback((blockId: string) => {
        const link = `${window.location.href}#${blockId}`
        navigator.clipboard.writeText(link)
    }, [])

    const handleMergeUp = useCallback((index: number, contentToMerge?: string) => {
        if (index === 0) return

        const currentBlock = page.blocks[index]
        const previousBlock = page.blocks[index - 1]

        if (!currentBlock || !previousBlock) return

        // Use provided content or fall back to current block content
        const content = contentToMerge !== undefined ? contentToMerge : currentBlock.content

        // Only add content if there is any
        const mergedContent = content
            ? previousBlock.content + content
            : previousBlock.content

        const newBlocks = page.blocks.filter((_, i) => i !== index)
        const updatedBlocks = newBlocks.map((b) =>
            b.id === previousBlock.id ? { ...b, content: mergedContent, autoFocus: true } : b
        )

        pushBlocksHistory(updatedBlocks, true)
        setFocusBlockId(previousBlock.id)

        onUpdatePage({
            ...page,
            blocks: updatedBlocks,
            updatedAt: Date.now(),
        })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleMoveBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= page.blocks.length) return

        const newBlocks = [...page.blocks]
        const temp = newBlocks[index]!
        newBlocks[index] = newBlocks[targetIndex]!
        newBlocks[targetIndex] = temp

        pushBlocksHistory(newBlocks, true)

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleDuplicateBlock = useCallback((index: number) => {
        const block = page.blocks[index]
        if (!block) return

        const duplicated: Block = {
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            autoFocus: true,
        }
        const newBlocks = [...page.blocks]
        newBlocks.splice(index + 1, 0, duplicated)

        pushBlocksHistory(newBlocks, true)
        setFocusBlockId(duplicated.id)

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })
    }, [page, onUpdatePage, pushBlocksHistory])

    const handleNavigateBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex >= 0 && targetIndex < page.blocks.length) {
            const targetBlock = page.blocks[targetIndex]
            if (targetBlock) {
                setFocusBlockId(targetBlock.id)
            }
        }
    }, [page.blocks])

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
            {/* Undo/Redo Toast */}
            {showUndoToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 
                                    text-white dark:text-gray-900 rounded-lg shadow-xl">
                        {showUndoToast === 'undo' ? (
                            <>
                                <Undo2 size={16} />
                                <span className="text-sm font-medium">Action annulée</span>
                            </>
                        ) : (
                            <>
                                <Redo2 size={16} />
                                <span className="text-sm font-medium">Action rétablie</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Undo/Redo Floating Buttons - Subtle */}
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
            <div className="max-w-7xl mx-auto px-8 pt-8 pb-4">
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
            <div className="max-w-6xl mx-auto px-8 pb-32">
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
