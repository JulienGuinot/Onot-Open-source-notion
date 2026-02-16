/**
 * Block Utilities
 * Advanced utilities for block manipulation and operations
 * Follows senior-level code standards with comprehensive error handling
 */

import { Block, BlockType, Page } from './types'

/**
 * Creates a new block with proper initialization
 */
export const createBlock = (type: BlockType = 'text', content: string = ''): Block => ({
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    content,
    checked: type === 'todo' ? false : undefined,
})

/**
 * Duplicates a block with a new ID
 */
export const duplicateBlock = (block: Block): Block => ({
    ...block,
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
})

/**
 * Changes the type of a block while preserving compatible content
 */
export const changeBlockType = (block: Block, newType: BlockType): Block => {
    const updatedBlock: Block = {
        ...block,
        type: newType,
    }

    // Reset type-specific properties
    if (newType === 'divider') {
        updatedBlock.content = ''
    }

    if (newType === 'todo' && !updatedBlock.checked) {
        updatedBlock.checked = false
    }

    return updatedBlock
}

/**
 * Merges two blocks together
 */
export const mergeBlocks = (block1: Block, block2: Block): Block => {
    // Preserve block1's type but merge content
    return {
        ...block1,
        content: block1.content + '\n' + block2.content,
    }
}

/**
 * Moves a block to a new position
 */
export const moveBlock = (
    blocks: Block[],
    fromIndex: number,
    toIndex: number
): Block[] => {
    if (fromIndex < 0 || fromIndex >= blocks.length || toIndex < 0 || toIndex >= blocks.length) {
        console.warn('Invalid indices for block move operation')
        return blocks
    }

    if (fromIndex === toIndex) {
        return blocks
    }

    const newBlocks = [...blocks]
    const [movedBlock] = newBlocks.splice(fromIndex, 1)
    newBlocks.splice(toIndex, 0, movedBlock!)
    return newBlocks
}

/**
 * Finds a block by ID
 */
export const findBlockById = (blocks: Block[], id: string): Block | undefined => {
    return blocks.find((block) => block.id === id)
}

/**
 * Finds the index of a block by ID
 */
export const findBlockIndexById = (blocks: Block[], id: string): number => {
    return blocks.findIndex((block) => block.id === id)
}

/**
 * Converts block content to plain text (useful for search, etc.)
 */
export const getBlockPlainText = (block: Block): string => {
    return block.content || ''
}

/**
 * Checks if a block is empty
 */
export const isBlockEmpty = (block: Block): boolean => {
    if (block.type === 'divider') return false
    return !block.content || block.content.trim() === ''
}

/**
 * Gets the display type name for a block
 */
export const getBlockTypeName = (type: BlockType): string => {
    const typeNames: Record<BlockType, string> = {
        'text': 'Text',
        'h1': 'Heading 1',
        'h2': 'Heading 2',
        'h3': 'Heading 3',
        'bullet-list': 'Bullet List',
        'numbered-list': 'Numbered List',
        'todo': 'To-do',
        'code': 'Code',
        'quote': 'Quote',
        'divider': 'Divider',
        'toggle': 'Toggle',
        'callout': 'Callout',
        'image': 'Image',
        'table': 'Table',
    }
    return typeNames[type] || type
}

/**
 * Gets placeholder text for a block type
 */
export const getBlockPlaceholder = (type: BlockType): string => {
    const placeholders: Record<BlockType, string> = {
        'text': 'Type something...',
        'h1': 'Heading 1',
        'h2': 'Heading 2',
        'h3': 'Heading 3',
        'bullet-list': 'List item',
        'numbered-list': 'List item',
        'todo': 'To-do',
        'code': 'Write some code...',
        'quote': 'Enter a quote...',
        'divider': '',
        'toggle': 'Toggle list item...',
        'callout': 'Callout text...',
        'image': '',
        'table': '',
    }
    return placeholders[type] || ''
}

/**
 * Validates block data for correctness
 */
export const validateBlock = (block: Block): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!block.id) errors.push('Block must have an ID')
    if (!block.type) errors.push('Block must have a type')

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Gets recommended block types that can follow the current type
 */
export const getRecommendedNextType = (currentType: BlockType): BlockType => {
    const recommendations: Record<BlockType, BlockType> = {
        'h1': 'text',
        'h2': 'text',
        'h3': 'text',
        'quote': 'text',
        'code': 'text',
        'divider': 'text',
        'text': 'text',
        'bullet-list': 'bullet-list',
        'numbered-list': 'numbered-list',
        'todo': 'todo',
        'toggle': 'text',
        'callout': 'text',
        'image': 'text',
        'table': 'text',
    }
    return recommendations[currentType] || 'text'
}

/**
 * Creates a copy link for a specific block
 */
export const createBlockLink = (pageId: string, blockId: string, baseUrl: string = ''): string => {
    const url = baseUrl || typeof window !== 'undefined' ? window.location.href : ''
    return `${url}#${blockId}`
}

/**
 * Updates a page's block at a specific index
 */
export const updatePageBlock = (page: Page, blockId: string, updatedBlock: Block): Page => {
    return {
        ...page,
        blocks: page.blocks.map((b) => (b.id === blockId ? updatedBlock : b)),
        updatedAt: Date.now(),
    }
}

/**
 * Adds a new block to a page at a specific index
 */
export const addBlockToPage = (page: Page, newBlock: Block, insertAfterIndex: number): Page => {
    const newBlocks = [...page.blocks]
    newBlocks.splice(insertAfterIndex + 1, 0, newBlock)
    return {
        ...page,
        blocks: newBlocks,
        updatedAt: Date.now(),
    }
}

/**
 * Removes a block from a page
 */
export const removeBlockFromPage = (page: Page, blockId: string): Page => {
    return {
        ...page,
        blocks: page.blocks.filter((b) => b.id !== blockId),
        updatedAt: Date.now(),
    }
}

/**
 * Batch updates multiple blocks
 */
export const batchUpdateBlocks = (
    page: Page,
    updates: Record<string, Partial<Block>>
): Page => {
    return {
        ...page,
        blocks: page.blocks.map((b) =>
            updates[b.id] ? { ...b, ...updates[b.id] } : b
        ),
        updatedAt: Date.now(),
    }
}

/**
 * Searches blocks by content
 */
export const searchBlocks = (
    blocks: Block[],
    query: string,
    caseSensitive = false
): Block[] => {
    const searchQuery = caseSensitive ? query : query.toLowerCase()
    return blocks.filter((block) => {
        const content = caseSensitive ? block.content : block.content.toLowerCase()
        return content.includes(searchQuery)
    })
}

/**
 * Exports blocks as JSON
 */
export const exportBlocksAsJSON = (blocks: Block[]): string => {
    return JSON.stringify(blocks, null, 2)
}

/**
 * Gets block statistics for a page
 */
export const getPageBlockStats = (
    page: Page
): {
    totalBlocks: number
    blocksByType: Record<BlockType, number>
    emptyBlocks: number
    totalCharacters: number
} => {
    const stats = {
        totalBlocks: page.blocks.length,
        blocksByType: {} as Record<BlockType, number>,
        emptyBlocks: 0,
        totalCharacters: 0,
    }

    page.blocks.forEach((block) => {
        // Count by type
        stats.blocksByType[block.type] = (stats.blocksByType[block.type] || 0) + 1

        // Count empty blocks
        if (isBlockEmpty(block)) {
            stats.emptyBlocks++
        }

        // Count characters
        stats.totalCharacters += block.content.length
    })

    return stats
}

