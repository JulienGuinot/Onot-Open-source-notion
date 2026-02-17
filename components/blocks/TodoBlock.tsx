'use client'

import { forwardRef, KeyboardEvent, ChangeEvent } from 'react'
import { Block } from '@/lib/types'

interface TodoBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
    onFocus: () => void
    onBlur: () => void
    placeholder?: string
    blockStyle?: string
}

const TodoBlock = forwardRef<HTMLTextAreaElement, TodoBlockProps>(
    ({ block, onUpdate, onChange, onKeyDown, onFocus, onBlur, placeholder, blockStyle }, ref) => {
        return (
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
                    ref={ref}
                    value={block.content}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`outline-none w-full bg-transparent resize-none leading-relaxed
                        dark:text-gray-100 text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500
                        ${block.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}
                        ${blockStyle || ''}`}
                    rows={1}
                    style={{ minHeight: '1.5rem' }}
                />
            </label>
        )
    }
)

TodoBlock.displayName = 'TodoBlock'
export default TodoBlock
