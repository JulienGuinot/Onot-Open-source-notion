import { useState, useCallback } from 'react'
import { Block } from '@/lib/types'

interface UseSlashMenuProps {
    block: Block
    onUpdate: (block: Block) => void
    onChangeType?: (type: string) => void
}

export function useSlashMenu({ block, onUpdate, onChangeType }: UseSlashMenuProps) {
    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null)
    const [slashQuery, setSlashQuery] = useState('')
    const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null)

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
    }, [])

    const handleSlashSelect = useCallback((type: string) => {
        const newContent = slashStartIndex !== null
            ? (block.content.substring(0, slashStartIndex) + block.content.substring(slashStartIndex + 1 + slashQuery.length)).trim()
            : ''

        closeSlashMenu()
        onChangeType?.(type)
        onUpdate({ ...block, content: newContent, type: type as Block['type'] })
    }, [slashStartIndex, slashQuery, block, closeSlashMenu, onChangeType, onUpdate])

    return {
        showSlashMenu,
        slashMenuPos,
        slashQuery,
        slashStartIndex,
        setSlashQuery,
        openSlashMenu,
        closeSlashMenu,
        handleSlashSelect,
    }
}
