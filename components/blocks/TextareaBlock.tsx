'use client'

import { forwardRef, KeyboardEvent, ChangeEvent } from 'react'

interface TextareaBlockProps {
    value: string
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
    onFocus: () => void
    onBlur: () => void
    placeholder?: string
    blockStyle?: string
}

const TextareaBlock = forwardRef<HTMLTextAreaElement, TextareaBlockProps>(
    ({ value, onChange, onKeyDown, onFocus, onBlur, placeholder, blockStyle }, ref) => {
        return (
            <textarea
                ref={ref}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={placeholder}
                className={`outline-none w-full bg-transparent resize-none leading-relaxed
                    dark:text-gray-100 text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500
                    transition-colors ${blockStyle || ''}`}
                rows={1}
                style={{ minHeight: '1.5rem' }}
            />
        )
    }
)

TextareaBlock.displayName = 'TextareaBlock'
export default TextareaBlock
