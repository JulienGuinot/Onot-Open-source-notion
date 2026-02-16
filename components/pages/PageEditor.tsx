'use client'

import { useState } from 'react'
import { Page, Block, BlockType } from '@/lib/types'
import BlockEditor from '@/components/blocks/BlockEditor'
import EmojiPicker from '@/components/EmojiPicker'

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

    const handleBlockUpdate = (blockId: string, updatedBlock: Block) => {
        const updatedPage: Page = {
            ...page,
            blocks: page.blocks.map((b) => (b.id === blockId ? updatedBlock : b)),
            updatedAt: Date.now(),
        }
        onUpdatePage(updatedPage)
    }

    const handleAddBlock = (index: number, blockType: BlockType = 'text') => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            type: blockType,
            content: '',
            autoFocus: true, // Focus on the new block
        }
        const newBlocks = [...page.blocks]
        newBlocks.splice(index + 1, 0, newBlock)
        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })
    }

    const handleDeleteBlock = (blockId: string) => {
        onUpdatePage({
            ...page,
            blocks: page.blocks.filter((b) => b.id !== blockId),
            updatedAt: Date.now(),
        })
    }

    const handleDragStart = (blockId: string) => {
        setDraggedBlockId(blockId)
    }

    const handleDragEnd = () => {
        setDraggedBlockId(null)
        setDragOverIndex(null)
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
    }

    const handleDragLeave = () => {
        setDragOverIndex(null)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
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

        onUpdatePage({
            ...page,
            blocks: newBlocks,
            updatedAt: Date.now(),
        })

        setDraggedBlockId(null)
        setDragOverIndex(null)
    }

    const handleChangeBlockType = (blockId: string, newType: string) => {
        const block = page.blocks.find((b) => b.id === blockId)
        if (!block) return

        const updatedBlock: Block = {
            ...block,
            type: newType as BlockType,
            // Reset certain properties when changing type
            ...(newType === 'divider' && { content: '' }),
        }
        handleBlockUpdate(blockId, updatedBlock)
    }

    const handleCopyLink = (blockId: string) => {
        const link = `${window.location.href}#${blockId}`
        navigator.clipboard.writeText(link)
        // You could add a toast notification here
    }

    const handleMergeUp = (index: number) => {
        if (index === 0) return

        const currentBlock = page.blocks[index]
        const previousBlock = page.blocks[index - 1]

        if (!currentBlock || !previousBlock) return

        // Merge content
        const mergedContent = previousBlock.content + '\n' + currentBlock.content

        const newBlocks = page.blocks.filter((_, i) => i !== index)
        const updatedBlocks = newBlocks.map((b) =>
            b.id === previousBlock.id ? { ...b, content: mergedContent } : b
        )

        onUpdatePage({
            ...page,
            blocks: updatedBlocks,
            updatedAt: Date.now(),
        })
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Cover */}
            {page.coverGradient && (
                <div
                    className="w-full h-48 bg-cover bg-center relative"
                    style={{ background: page.coverGradient }}
                >
                    <button
                        onClick={() => setShowCoverPicker(!showCoverPicker)}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/50 text-white text-sm rounded-lg
                       hover:bg-black/70 transition-colors duration-200"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* Page Icon and Title */}
            <div className="px-8 pt-8 pb-4">
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
                    className="text-4xl font-bold outline-none w-full bg-transparent
                     dark:text-gray-100 text-gray-900 transition-colors mt-4"
                />
            </div>

            {/* Blocks */}
            <div className="px-8 pb-20">
                {page.blocks.map((block, index) => (
                    <div
                        key={block.id}
                        className={`mb-1 transition-all duration-200 ${dragOverIndex === index ? 'pt-4 border-t-2 border-blue-400 dark:border-blue-500' : ''
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
                                // Clear autoFocus after update
                                if (updated.autoFocus) {
                                    updated = { ...updated, autoFocus: false }
                                }
                                handleBlockUpdate(block.id, updated)
                            }}
                            onDelete={() => handleDeleteBlock(block.id)}
                            onEnter={() => handleAddBlock(index)}
                            onBackspace={() => {
                                if (index > 0) {
                                    handleDeleteBlock(block.id)
                                }
                            }}
                            onMoveUp={() => {
                                if (index > 0) {
                                    const newBlocks = [...page.blocks]
                                    const temp = newBlocks[index]!
                                    newBlocks[index] = newBlocks[index - 1]!
                                    newBlocks[index - 1] = temp
                                    onUpdatePage({ ...page, blocks: newBlocks, updatedAt: Date.now() })
                                }
                            }}
                            onMoveDown={() => {
                                if (index < page.blocks.length - 1) {
                                    const newBlocks = [...page.blocks]
                                    const temp = newBlocks[index]!
                                    newBlocks[index] = newBlocks[index + 1]!
                                    newBlocks[index + 1] = temp
                                    onUpdatePage({ ...page, blocks: newBlocks, updatedAt: Date.now() })
                                }
                            }}
                            onNavigateToPreviousBlock={() => {
                                if (index > 0) {
                                    setFocusBlockId(page.blocks[index - 1]!.id)
                                }
                            }}
                            onNavigateToNextBlock={() => {
                                if (index < page.blocks.length - 1) {
                                    setFocusBlockId(page.blocks[index + 1]!.id)
                                }
                            }}
                            canMoveUp={index > 0}
                            canMoveDown={index < page.blocks.length - 1}
                            onDuplicate={() => {
                                const duplicated = { ...block, id: `block-${Date.now()}` }
                                const newBlocks = [...page.blocks]
                                newBlocks.splice(index + 1, 0, duplicated)
                                onUpdatePage({ ...page, blocks: newBlocks, updatedAt: Date.now() })
                            }}
                            onDragStart={() => handleDragStart(block.id)}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedBlockId === block.id}
                            onChangeType={(newType) => handleChangeBlockType(block.id, newType)}
                            onCopyLink={() => handleCopyLink(block.id)}
                            onMergeUp={() => handleMergeUp(index)}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

