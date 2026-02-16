'use client'

import { Block } from '@/lib/types'

interface ToggleBlockProps {
    block: Block
    onUpdate: (block: Block) => void
}

export default function ToggleBlock({ block, onUpdate }: ToggleBlockProps) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800/50">
            <button
                onClick={() => onUpdate({ ...block, toggleOpen: !block.toggleOpen })}
                className="text-left font-medium text-gray-900 dark:text-gray-100 hover:underline"
            >
                {block.toggleOpen ? '▼' : '▶'} {block.content || 'Toggle'}
            </button>
            {block.toggleOpen && block.children && (
                <div className="mt-3 space-y-2 ml-4">
                    {block.children.map((child) => (
                        <div key={child.id} className="text-sm text-gray-700 dark:text-gray-300">
                            {child.content}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

