'use client'

import { BLOCK_COLORS, BLOCK_BG_COLORS, BlockColorKey, BlockBgColorKey, BlockStyle } from '@/lib/types'
import { useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
    style?: BlockStyle
    onChange: (style: BlockStyle) => void
    onClose: () => void
}

const colorLabels: Record<BlockColorKey, string> = {
    default: 'Default',
    gray: 'Gray',
    brown: 'Brown',
    orange: 'Orange',
    yellow: 'Yellow',
    green: 'Green',
    blue: 'Blue',
    purple: 'Purple',
    pink: 'Pink',
    red: 'Red',
}

export default function ColorPicker({ style, onChange, onClose }: ColorPickerProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    return (
        <div
            ref={ref}
            className="absolute left-16 top-full mt-1 bg-white dark:bg-gray-800
                 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg
                 z-20 w-56 p-2"
        >
            {/* Text Colors */}
            <div className="mb-2">
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-1">
                    Color
                </div>
                <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(BLOCK_COLORS) as BlockColorKey[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => onChange({ ...style, color: key })}
                            className={`flex items-center justify-center w-8 h-8 rounded
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                         ${style?.color === key ? 'ring-2 ring-blue-500' : ''}`}
                            title={colorLabels[key]}
                        >
                            <span
                                className="text-base font-bold"
                                style={{ color: BLOCK_COLORS[key] || (key === 'default' ? '#37352f' : undefined) }}
                            >
                                A
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Background Colors */}
            <div>
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-1">
                    Background
                </div>
                <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(BLOCK_BG_COLORS) as BlockBgColorKey[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => onChange({ ...style, backgroundColor: key })}
                            className={`w-8 h-8 rounded border transition-colors
                         ${style?.backgroundColor === key
                                    ? 'ring-2 ring-blue-500'
                                    : 'border-gray-200 dark:border-gray-600'
                                }
                         ${key === 'default' ? 'bg-white dark:bg-gray-800' : ''}`}
                            style={{
                                backgroundColor: key !== 'default' ? BLOCK_BG_COLORS[key] : undefined,
                            }}
                            title={colorLabels[key as BlockColorKey]}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ColorPickerTrigger({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Color"
        >
            <Palette size={16} className="text-gray-400" />
        </button>
    )
}

