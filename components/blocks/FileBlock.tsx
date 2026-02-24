'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'
import { Upload, X, Loader2 } from 'lucide-react'
import { useSupabaseUpload, formatFileSize } from '@/hooks/useSupabaseUpload'
import { FileControls } from './files/FileControls'
import { ImagePreview } from './files/previews/ImagePreview'
import { VideoPreview } from './files/previews/VideoPreview'
import { AudioPreview } from './files/previews/AudioPreview'
import { PdfPreview } from './files/previews/PdfPreview'
import { TextPreview } from './files/previews/TextPreview'
import { FileInfoBar } from './files/FileInfoBar'
import { CodePreview } from './files/previews/CodePreview'

interface FileBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

const BUCKET = 'onot-bucket'
const MAX_SIZE_MB = 50

// ─── Mime helpers ─────────────────────────────────────────────

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'generic' | "code"

function previewKind(mime?: string): PreviewKind {
    if (!mime) return 'generic'
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/pdf') return 'pdf'
    if (mime.startsWith('text/')) return 'text'
    if (/\b(json|xml|javascript|typescript|yaml|sh)\b/.test(mime)) return 'code'
    return 'generic'
}

export const LANG_MAP: Record<string, string> = {
    'text/javascript': 'js', 'application/javascript': 'js',
    'text/typescript': 'ts', 'application/typescript': 'ts',
    'text/html': 'html', 'text/css': 'css', 'text/csv': 'csv',
    'application/json': 'json', 'application/xml': 'xml', 'text/xml': 'xml',
    'text/markdown': 'md', 'text/plain': 'txt',
    'application/x-yaml': 'yaml', 'application/x-sh': 'sh',
}


// ─── Main component ──────────────────────────────────────────

export default function FileBlock({ block, onUpdate, onKeyDown }: FileBlockProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { upload, status, error, progress, reset } = useSupabaseUpload({
        bucket: BUCKET, folder: 'files', maxSizeMB: MAX_SIZE_MB, createSignedUrl: false,
    })

    const hasFile = !!block.fileUrl

    const handleUpload = useCallback(async (file: File) => {
        try {
            const res = await upload(file)
            if (res) {
                onUpdate({
                    ...block,
                    fileUrl: res.publicUrl || res.signedUrl || '',
                    fileName: res.fileName,
                    fileSize: res.fileSize,
                    fileMimeType: res.mimeType,
                })
            }
        } catch { /* handled by hook */ }
    }, [upload, block, onUpdate])

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }, [])
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }, [])
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleUpload(file)
    }, [handleUpload])

    const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }, [handleUpload])

    const handleRemove = useCallback(() => {
        reset()
        onUpdate({ ...block, fileUrl: '', fileName: '', fileSize: undefined, fileMimeType: '' })
    }, [block, onUpdate, reset])

    // ─── File uploaded → preview ──────────────────────────────

    if (hasFile) {
        const kind = previewKind(block.fileMimeType)
        const hasPreview = kind !== 'generic'

        return (
            <div className="group/file relative rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800/50">
                <FileControls url={block.fileUrl!} name={block.fileName} onRemove={handleRemove} />

                {kind === 'image' && <ImagePreview url={block.fileUrl!} name={block.fileName} />}
                {kind === 'video' && <VideoPreview url={block.fileUrl!} />}
                {kind === 'audio' && <AudioPreview url={block.fileUrl!} name={block.fileName} />}
                {kind === 'pdf' && <PdfPreview url={block.fileUrl!} />}
                {kind === 'text' && <TextPreview url={block.fileUrl!} mime={block.fileMimeType} />}
                {kind === "code" && <CodePreview url={block.fileUrl!} mime={block.fileMimeType} />}

                <div className={hasPreview ? 'border-t border-gray-200 dark:border-zinc-700' : ''}>
                    <FileInfoBar url={block.fileUrl!} name={block.fileName} size={block.fileSize} mime={block.fileMimeType} />
                </div>
            </div>
        )
    }

    // ─── Uploading ────────────────────────────────────────────

    if (status === 'uploading') {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                <Loader2 size={20} className="text-blue-500 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 dark:text-gray-300">Uploading…</div>
                    <div className="mt-1.5 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <button onClick={() => reset()} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors" title="Cancel">
                    <X size={14} className="text-blue-500" />
                </button>
            </div>
        )
    }

    // ─── Empty drop zone ──────────────────────────────────────

    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200
                ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                ${status === 'error' ? 'border-red-300 dark:border-red-800' : ''}`}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        >
            <input ref={fileInputRef} type="file" onChange={onFileSelect} className="hidden" />

            <div className="p-6 flex flex-col items-center justify-center gap-3">
                {status === 'error' ? (
                    <>
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X size={20} className="text-red-500" />
                        </div>
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">{error || 'Upload failed'}</div>
                        <button onClick={() => reset()} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">Try again</button>
                    </>
                ) : (
                    <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                            ${isDragging ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Upload size={20} className={isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'} />
                        </div>
                        {isDragging ? (
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop file here</div>
                        ) : (
                            <>
                                <div className="text-sm text-gray-600 dark:text-gray-300">Drag & drop a file, or</div>
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <Upload size={14} /> Choose file
                                </button>
                                <div className="text-xs text-gray-400 dark:text-gray-500">Max {MAX_SIZE_MB} MB</div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
