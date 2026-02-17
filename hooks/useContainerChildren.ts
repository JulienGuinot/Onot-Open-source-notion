import { useState, useCallback, useEffect } from 'react'
import { Block, BlockType } from '@/lib/types'
import { createBlock } from '@/lib/blockUtils'

interface UseContainerChildrenProps {
    block: Block
    onUpdate: (block: Block) => void
}

export function useContainerChildren({ block, onUpdate }: UseContainerChildrenProps) {
    const [focusChildId, setFocusChildId] = useState<string | null>(null)

    // Clear focusChildId after it's applied
    useEffect(() => {
        if (!focusChildId) return
        const timer = setTimeout(() => setFocusChildId(null), 100)
        return () => clearTimeout(timer)
    }, [focusChildId])

    const addChildBlock = useCallback((afterIndex: number, content = '', type: BlockType = 'text') => {
        const newChild: Block = { ...createBlock(type, content), autoFocus: true }
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

    return { focusChildId, setFocusChildId, addChildBlock, updateChildBlock, deleteChildBlock }
}
