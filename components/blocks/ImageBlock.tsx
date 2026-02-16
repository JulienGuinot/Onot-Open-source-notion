'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'
import { Image as ImageIcon, Link, Upload, X } from 'lucide-react'

interface ImageBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export default function ImageBlock({ block, onUpdate, onKeyDown }: ImageBlockProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [showUrlInput, setShowUrlInput] = useState(!block.imageUrl)
    const [urlValue, setUrlValue] = useState(block.imageUrl || '')
    const [imageError, setImageError] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const urlInputRef = useRef<HTMLInputElement>(null)

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

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            const file = files[0]
            if (file && file.type.startsWith('image/')) {
                // Convert to base64 for local storage
                const reader = new FileReader()
                reader.onload = (event) => {
                    const dataUrl = event.target?.result as string
                    onUpdate({ ...block, imageUrl: dataUrl })
                    setShowUrlInput(false)
                    setImageError(false)
                }
                reader.readAsDataURL(file)
            }
        }
    }, [block, onUpdate])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                onUpdate({ ...block, imageUrl: dataUrl })
                setShowUrlInput(false)
                setImageError(false)
            }
            reader.readAsDataURL(file)
        }
    }, [block, onUpdate])

    const handleUrlSubmit = useCallback(() => {
        if (urlValue.trim()) {
            onUpdate({ ...block, imageUrl: urlValue.trim() })
            setShowUrlInput(false)
            setImageError(false)
        }
    }, [urlValue, block, onUpdate])

    const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleUrlSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            if (block.imageUrl) {
                setShowUrlInput(false)
                setUrlValue(block.imageUrl)
            }
        } else {
            onKeyDown?.(e)
        }
    }

    const handleRemoveImage = () => {
        onUpdate({ ...block, imageUrl: '', imageCaption: '' })
        setShowUrlInput(true)
        setUrlValue('')
        setImageError(false)
    }

    if (block.imageUrl && !showUrlInput && !imageError) {
        return (
            <div className="relative group">
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                        src={block.imageUrl}
                        alt={block.imageCaption || 'Image'}
                        className="max-w-full w-full object-contain"
                        onError={() => setImageError(true)}
                    />
                    
                    {/* Image overlay controls */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setShowUrlInput(true)}
                                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Change image"
                            >
                                <Link size={14} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={handleRemoveImage}
                                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Remove image"
                            >
                                <X size={14} className="text-gray-600 dark:text-gray-300 hover:text-red-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Caption */}
                <input
                    type="text"
                    value={block.imageCaption || ''}
                    onChange={(e) => onUpdate({ ...block, imageCaption: e.target.value })}
                    onKeyDown={onKeyDown}
                    placeholder="Add a caption..."
                    className="w-full mt-2 px-2 py-1 text-sm text-center text-gray-500 dark:text-gray-400 
                               bg-transparent outline-none italic
                               placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>
        )
    }

    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200
                ${isDragging 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${imageError ? 'border-red-300 dark:border-red-800' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="p-8 flex flex-col items-center justify-center gap-4">
                {imageError ? (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X size={24} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">
                                Failed to load image
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Please check the URL and try again
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                            ${isDragging 
                                ? 'bg-blue-100 dark:bg-blue-800/50' 
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                            <ImageIcon size={24} className={`transition-colors
                                ${isDragging 
                                    ? 'text-blue-500' 
                                    : 'text-gray-400 dark:text-gray-500'
                                }`} 
                            />
                        </div>

                        {isDragging ? (
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Drop image here
                            </div>
                        ) : (
                            <>
                                <div className="text-center">
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        Drag & drop an image, or
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 
                                                   text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium
                                                   hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Upload size={14} />
                                        Upload
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowUrlInput(true)
                                            setTimeout(() => urlInputRef.current?.focus(), 0)
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 
                                                   text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium
                                                   hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Link size={14} />
                                        Paste URL
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* URL Input */}
                {(showUrlInput || imageError) && !isDragging && (
                    <div className="w-full max-w-md flex gap-2 mt-2">
                        <input
                            ref={urlInputRef}
                            type="text"
                            value={urlValue}
                            onChange={(e) => setUrlValue(e.target.value)}
                            onKeyDown={handleUrlKeyDown}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 
                                       border border-gray-200 dark:border-gray-700 rounded-lg
                                       outline-none focus:border-blue-400 dark:focus:border-blue-500 
                                       transition-colors"
                            autoFocus
                        />
                        <button
                            onClick={handleUrlSubmit}
                            disabled={!urlValue.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium
                                       hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                                       transition-colors"
                        >
                            Embed
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
