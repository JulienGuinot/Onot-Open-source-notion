'use client'

import { X, Command, Keyboard } from 'lucide-react'
import { useEffect } from 'react'

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Shortcut {
    keys: string[]
    description: string
}

interface ShortcutCategory {
    title: string
    shortcuts: Shortcut[]
}

const SHORTCUTS: ShortcutCategory[] = [
    {
        title: 'General',
        shortcuts: [
            { keys: ['Ctrl', 'K'], description: 'Open search / Quick find' },
            { keys: ['Ctrl', '\\'], description: 'Toggle sidebar' },
            { keys: ['Ctrl', '?'], description: 'Show keyboard shortcuts' },
            { keys: ['Ctrl', 'D'], description: 'Toggle dark mode' },
            { keys: ['Ctrl', 'N'], description: 'Create new page' },
            { keys: ['Esc'], description: 'Close modals / Cancel actions' },
        ],
    },
    {
        title: 'Block Editing',
        shortcuts: [
            { keys: ['/'], description: 'Open block type menu' },
            { keys: ['Enter'], description: 'Create new block below' },
            { keys: ['Shift', 'Enter'], description: 'New line within block' },
            { keys: ['Backspace'], description: 'Delete empty block / Merge with previous' },
            { keys: ['Ctrl', '↑'], description: 'Move block up' },
            { keys: ['Ctrl', '↓'], description: 'Move block down' },
            { keys: ['Ctrl', 'D'], description: 'Duplicate block' },
            { keys: ['Ctrl', 'Shift', 'D'], description: 'Delete block' },
        ],
    },
]

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

function formatKey(key: string): string {
    if (key === 'Ctrl' && isMac) return '⌘'
    if (key === 'Ctrl') return 'Ctrl'
    if (key === 'Shift') return isMac ? '⇧' : 'Shift'
    if (key === 'Alt') return isMac ? '⌥' : 'Alt'
    if (key === '↑') return '↑'
    if (key === '↓') return '↓'
    if (key === '←') return '←'
    if (key === '→') return '→'
    return key
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Keyboard size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Master Onot with these shortcuts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {SHORTCUTS.map((category, idx) => (
                            <div key={idx} className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                                    {category.title}
                                </h3>
                                <div className="space-y-2">
                                    {category.shortcuts.map((shortcut, sidx) => (
                                        <div key={sidx} className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {shortcut.keys.map((key, kidx) => (
                                                    <span key={kidx} className="flex items-center gap-1">
                                                        <kbd
                                                            className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 
                                         bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                                         rounded shadow-sm min-w-[28px] text-center"
                                                        >
                                                            {formatKey(key)}
                                                        </kbd>
                                                        {kidx < shortcut.keys.length - 1 && (
                                                            <span className="text-gray-400 text-xs">+</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <Command size={14} />
                            <span>
                                Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl</kbd> +
                                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-1">?</kbd> anytime to view
                                this
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

