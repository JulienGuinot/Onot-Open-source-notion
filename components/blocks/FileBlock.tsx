'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'
import {
    FileText, Upload, X, Download, File, FileSpreadsheet,
    FileImage, FileVideo, FileAudio, FileArchive, FileCode, Loader2,
} from 'lucide-react'
import { useSupabaseUpload, formatFileSize } from '@/hooks/useSupabaseUpload'

interface FileBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

const BUCKET = 'onot-bucket'
const MAX_SIZE_MB = 50

function getFileIcon(mimeType?: string) {
    if (!mimeType) return File
    if (mimeType.startsWith('image/')) return FileImage
    if (mimeType.startsWith('video/')) return FileVideo
    if (mimeType.startsWith('audio/')) return FileAudio
    if (mimeType.includes('pdf')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('gzip')) return FileArchive
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml')) return FileCode
    if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('text')) return FileText
    return File
}

function getFileColorClass(mimeType?: string): string {
    if (!mimeType) return 'bg-gray-100 dark:bg-gray-800 text-gray-500'
    if (mimeType.includes('pdf')) return 'bg-red-50 dark:bg-red-900/20 text-red-500'
    if (mimeType.startsWith('image/')) return 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'
    if (mimeType.startsWith('video/')) return 'bg-pink-50 dark:bg-pink-900/20 text-pink-500'
    if (mimeType.startsWith('audio/')) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'bg-green-50 dark:bg-green-900/20 text-green-600'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
    return 'bg-gray-100 dark:bg-gray-800 text-gray-500'
}

export default function FileBlock({ block, onUpdate, onKeyDown }: FileBlockProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { upload, status, error, progress, reset } = useSupabaseUpload({
        bucket: BUCKET,
        folder: 'files',
        maxSizeMB: MAX_SIZE_MB,
        createSignedUrl: false,
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
        } catch {
            // error state is handled by the hook
        }
    }, [upload, block, onUpdate])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) handleUpload(file)
    }, [handleUpload])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }, [handleUpload])

    const handleRemoveFile = useCallback(() => {
        reset()
        onUpdate({
            ...block,
            fileUrl: '',
            fileName: '',
            fileSize: undefined,
            fileMimeType: '',
        })
    }, [block, onUpdate, reset])

    // File is uploaded - show preview
    if (hasFile) {
        const Icon = getFileIcon(block.fileMimeType)
        const colorClass = getFileColorClass(block.fileMimeType)

        return (
            <div className="group/file relative">
                <a
                    href={block.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-zinc-700
                               bg-white dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800
                               transition-all duration-150 no-underline cursor-pointer"
                >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {block.fileName || 'File'}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                            {block.fileSize != null && (
                                <span>{formatFileSize(block.fileSize)}</span>
                            )}
                            {block.fileMimeType && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    <span className="truncate">{block.fileMimeType.split('/').pop()?.toUpperCase()}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                        <span
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Download"
                        >
                            <Download size={14} className="text-gray-500 dark:text-gray-400" />
                        </span>
                    </div>
                </a>

                {/* Remove button */}
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFile() }}
                    className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                               rounded-full shadow-sm opacity-0 group-hover/file:opacity-100 transition-opacity
                               hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remove file"
                >
                    <X size={12} className="text-gray-400 hover:text-red-500" />
                </button>
            </div>
        )
    }

    // Uploading state
    if (status === 'uploading') {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800
                            bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Uploading...
                    </div>
                    <div className="mt-1.5 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <button
                    onClick={() => reset()}
                    className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                    title="Cancel"
                >
                    <X size={14} className="text-blue-500" />
                </button>
            </div>
        )
    }

    // Empty state - drop zone
    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200
                ${isDragging
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${status === 'error' ? 'border-red-300 dark:border-red-800' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="p-6 flex flex-col items-center justify-center gap-3">
                {status === 'error' ? (
                    <>
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X size={20} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">
                                {error || 'Upload failed'}
                            </div>
                            <button
                                onClick={() => reset()}
                                className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
                            >
                                Try again
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                            ${isDragging
                                ? 'bg-blue-100 dark:bg-blue-800/50'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                            <Upload size={20} className={`transition-colors
                                ${isDragging
                                    ? 'text-blue-500'
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}
                            />
                        </div>

                        {isDragging ? (
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Drop file here
                            </div>
                        ) : (
                            <>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Drag & drop a file, or
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800
                                               text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium
                                               hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Upload size={14} />
                                    Choose file
                                </button>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Max {MAX_SIZE_MB} MB
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
