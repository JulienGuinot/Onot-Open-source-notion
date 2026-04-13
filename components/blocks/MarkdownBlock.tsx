'use client'

import { ChangeEvent, forwardRef, KeyboardEvent, MutableRefObject, ReactNode, useEffect, useRef, useState } from 'react'

interface MarkdownBlockProps {
    value: string
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
    onFocus: () => void
    onBlur: () => void
    placeholder?: string
    autoFocus?: boolean
}

type ListKind = 'ul' | 'ol'

const inlinePattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string): ReactNode[] {
    return text.split(inlinePattern).filter(Boolean).map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index}>{part.slice(1, -1)}</code>
        }

        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={index}>{part.slice(2, -2)}</strong>
        }

        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={index}>{part.slice(1, -1)}</em>
        }

        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (link) {
            return (
                <a key={index} href={link[2]} target="_blank" rel="noreferrer">
                    {link[1]}
                </a>
            )
        }

        return part
    })
}

function renderMarkdown(markdown: string) {
    const lines = markdown.split('\n')
    const nodes: ReactNode[] = []
    let listItems: ReactNode[] = []
    let listKind: ListKind | null = null
    let paragraph: string[] = []
    let codeLines: string[] = []
    let inCode = false

    const flushParagraph = () => {
        if (paragraph.length === 0) return
        nodes.push(<p key={`p-${nodes.length}`}>{renderInline(paragraph.join(' '))}</p>)
        paragraph = []
    }

    const flushList = () => {
        if (!listKind) return
        const ListTag = listKind
        nodes.push(<ListTag key={`list-${nodes.length}`}>{listItems}</ListTag>)
        listItems = []
        listKind = null
    }

    const flushCode = () => {
        nodes.push(
            <pre key={`code-${nodes.length}`}>
                <code>{codeLines.join('\n')}</code>
            </pre>
        )
        codeLines = []
        inCode = false
    }

    lines.forEach((line) => {
        if (line.trim().startsWith('```')) {
            flushParagraph()
            flushList()
            if (inCode) flushCode()
            else inCode = true
            return
        }

        if (inCode) {
            codeLines.push(line)
            return
        }

        const trimmed = line.trim()

        if (!trimmed) {
            flushParagraph()
            flushList()
            return
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
        if (heading) {
            flushParagraph()
            flushList()
            const level = heading[1]!.length
            const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
            nodes.push(<HeadingTag key={`h-${nodes.length}`}>{renderInline(heading[2]!)}</HeadingTag>)
            return
        }

        if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
            flushParagraph()
            flushList()
            nodes.push(<hr key={`hr-${nodes.length}`} />)
            return
        }

        const quote = trimmed.match(/^>\s?(.*)$/)
        if (quote) {
            flushParagraph()
            flushList()
            nodes.push(<blockquote key={`q-${nodes.length}`}>{renderInline(quote[1]!)}</blockquote>)
            return
        }

        const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
        const ordered = trimmed.match(/^\d+\.\s+(.+)$/)
        if (unordered || ordered) {
            flushParagraph()
            const nextKind: ListKind = unordered ? 'ul' : 'ol'
            if (listKind && listKind !== nextKind) flushList()
            listKind = nextKind
            listItems.push(<li key={`li-${listItems.length}`}>{renderInline((unordered || ordered)![1]!)}</li>)
            return
        }

        flushList()
        paragraph.push(trimmed)
    })

    if (inCode) flushCode()
    flushParagraph()
    flushList()

    return nodes
}

const MarkdownBlock = forwardRef<HTMLTextAreaElement, MarkdownBlockProps>(
    ({ value, onChange, onKeyDown, onFocus, onBlur, placeholder, autoFocus }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement | null>(null)
        const [isEditing, setIsEditing] = useState(!value || !!autoFocus)

        const setRefs = (node: HTMLTextAreaElement | null) => {
            textareaRef.current = node
            if (typeof ref === 'function') {
                ref(node)
            } else if (ref) {
                ;(ref as MutableRefObject<HTMLTextAreaElement | null>).current = node
            }
        }

        useEffect(() => {
            if (!autoFocus) return
            setIsEditing(true)
        }, [autoFocus])

        useEffect(() => {
            if (!isEditing || !textareaRef.current) return
            textareaRef.current.focus()
            const length = textareaRef.current.value.length
            textareaRef.current.setSelectionRange(length, length)
        }, [isEditing])

        const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setIsEditing(false)
                e.currentTarget.blur()
                return
            }

            onKeyDown(e)
        }

        if (!isEditing && value.trim()) {
            return (
                <div
                    className="markdown-block"
                    tabIndex={0}
                    onFocus={() => {
                        setIsEditing(true)
                        onFocus()
                    }}
                    onDoubleClick={() => setIsEditing(true)}
                >
                    {renderMarkdown(value)}
                </div>
            )
        }

        return (
            <textarea
                ref={setRefs}
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    setIsEditing(true)
                    onFocus()
                }}
                onBlur={() => {
                    setIsEditing(false)
                    onBlur()
                }}
                placeholder={placeholder}
                className="outline-none w-full bg-transparent resize-none leading-relaxed font-mono text-sm
                    dark:text-gray-100 text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500
                    transition-colors"
                rows={6}
                style={{ minHeight: '10rem' }}
            />
        )
    }
)

MarkdownBlock.displayName = 'MarkdownBlock'
export default MarkdownBlock
