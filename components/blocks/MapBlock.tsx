'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Block } from '@/lib/types'
import { MapPin, Trash2 } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────

interface MapBlockProps {
    block: Block
    onUpdate: (block: Block) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export default function MapBlock({ block, onUpdate, onKeyDown }: MapBlockProps) {
    // Note: Assurez-vous d'ajouter 'mapUrl' ou d'utiliser 'content' dans votre type Block
    const [placeValue, setPlaceValue] = useState(block.mapUrl || block.content || '')
    const [showInput, setShowInput] = useState(!(block.mapUrl || block.content))
    const [inputError, setInputError] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // ─── Handlers ────────────────────────────────────────────

    const handlePlaceSubmit = useCallback(() => {
        const trimmed = placeValue.trim()

        if (trimmed) {
            onUpdate({ ...block, mapUrl: trimmed, content: trimmed })
            setShowInput(false)
            setInputError(false)
        } else {
            setInputError(true)
        }
    }, [placeValue, block, onUpdate])

    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handlePlaceSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            const existingPlace = block.mapUrl || block.content
            if (existingPlace) {
                setShowInput(false)
                setPlaceValue(existingPlace)
                setInputError(false)
            }
        } else {
            onKeyDown?.(e)
        }
    }

    const handleRemove = () => {
        onUpdate({ ...block, mapUrl: '', content: '' })
        setShowInput(true)
        setPlaceValue('')
        setInputError(false)
    }

    // ─── Render: Embedded Map ──────────────────────────────

    if (!showInput) {
        // Astuce : Cette URL permet d'embed une recherche Google Maps sans clé API
        const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(placeValue)}&output=embed`

        return (
            <div className="relative group w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <iframe
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={embedUrl}
                />

                {/* Bouton pour modifier/supprimer la carte au survol */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={handleRemove}
                        className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove map"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render: Place Input ───────────────────────────────────

    return (
        <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200
                ${inputError
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
        >
            <div className="p-8 flex flex-col items-center justify-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center
                    ${inputError ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                >
                    <MapPin size={24} className={inputError ? "text-red-500" : "text-blue-500"} />
                </div>

                <div className="text-center">
                    <div className={`text-sm font-medium
                        ${inputError
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        {inputError ? 'Invalid location' : 'Embed a Google Map'}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {inputError
                            ? 'Please enter a valid address or place name'
                            : 'Type an address, city, or place name (e.g., Eiffel Tower)'}
                    </div>
                </div>

                <div className="w-full max-w-md flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={placeValue}
                        onChange={(e) => { setPlaceValue(e.target.value); setInputError(false) }}
                        onKeyDown={handleInputKeyDown}
                        placeholder="E.g., 1600 Amphitheatre Parkway, Mountain View, CA"
                        className={`flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900
                            border rounded-lg outline-none transition-colors
                            ${inputError
                                ? 'border-red-300 dark:border-red-700 focus:border-red-400'
                                : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500'
                            }`}
                        autoFocus
                    />
                    <button
                        onClick={handlePlaceSubmit}
                        disabled={!placeValue.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium
                                   hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors"
                    >
                        Embed
                    </button>
                </div>
            </div>
        </div>
    )
}