'use client'

import { X, Command, Keyboard, Zap } from 'lucide-react'
import { useEffect } from 'react'

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Shortcut {
    keys: string[]
    description: string
    category?: 'essential' | 'power'
}

interface ShortcutCategory {
    title: string
    icon?: string
    shortcuts: Shortcut[]
}

const SHORTCUTS: ShortcutCategory[] = [
    {
        title: 'Essentials',
        icon: '⭐',
        shortcuts: [
            { keys: ['Ctrl', 'K'], description: 'Quick search / Find pages', category: 'essential' },
            { keys: ['Ctrl', 'Z'], description: 'Undo last action', category: 'essential' },
            { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo action', category: 'essential' },
            { keys: ['Ctrl', 'N'], description: 'Create new page', category: 'essential' },
            { keys: ['/'], description: 'Open block menu', category: 'essential' },
            { keys: ['Esc'], description: 'Close menus / Cancel', category: 'essential' },
        ],
    },
    {
        title: 'Navigation',
        icon: '🧭',
        shortcuts: [
            { keys: ['↑', '↓'], description: 'Move between blocks' },
            { keys: ['←', '→'], description: 'Move cursor / Navigate blocks' },
            { keys: ['Ctrl', '\\'], description: 'Toggle sidebar' },
            { keys: ['Ctrl', 'P'], description: 'Quick page switcher' },
            { keys: ['Ctrl', '?'], description: 'Show keyboard shortcuts' },
        ],
    },
    {
        title: 'Block Editing',
        icon: '✏️',
        shortcuts: [
            { keys: ['Enter'], description: 'Create new block below' },
            { keys: ['Shift', 'Enter'], description: 'New line in current block' },
            { keys: ['Backspace'], description: 'Delete empty block' },
            { keys: ['Ctrl', 'D'], description: 'Duplicate block', category: 'power' },
            { keys: ['Ctrl', 'Shift', 'D'], description: 'Delete block', category: 'power' },
        ],
    },
    {
        title: 'Block Organization',
        icon: '📦',
        shortcuts: [
            { keys: ['Ctrl', '↑'], description: 'Move block up' },
            { keys: ['Ctrl', '↓'], description: 'Move block down' },
            { keys: ['Tab'], description: 'Indent / Next cell (table)' },
            { keys: ['Shift', 'Tab'], description: 'Outdent / Previous cell' },
        ],
    },
    {
        title: 'Appearance',
        icon: '🎨',
        shortcuts: [
            { keys: ['Ctrl', 'D'], description: 'Toggle dark mode (global)' },
        ],
    },
    {
        title: 'Slash Commands',
        icon: '⚡',
        shortcuts: [
            { keys: ['/text'], description: 'Text block' },
            { keys: ['/h1', '/h2', '/h3'], description: 'Headings' },
            { keys: ['/todo'], description: 'To-do checkbox' },
            { keys: ['/bullet'], description: 'Bullet list' },
            { keys: ['/table'], description: 'Create a table' },
            { keys: ['/code'], description: 'Code block' },
            { keys: ['/callout'], description: 'Callout box' },
            { keys: ['/divider'], description: 'Horizontal divider' },
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
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] 
                           overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 
                                        flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Keyboard size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Keyboard Shortcuts
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Boost your productivity with these shortcuts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {SHORTCUTS.map((category, idx) => (
                            <div 
                                key={idx} 
                                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                            >
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 
                                               flex items-center gap-2">
                                    <span className="text-lg">{category.icon}</span>
                                    {category.title}
                                </h3>
                                <div className="space-y-1">
                                    {category.shortcuts.map((shortcut, sidx) => (
                                        <div 
                                            key={sidx} 
                                            className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg 
                                                       hover:bg-white dark:hover:bg-gray-700/50 transition-colors group"
                                        >
                                            <span className={`text-sm flex-1 ${
                                                shortcut.category === 'essential' 
                                                    ? 'text-gray-900 dark:text-gray-100 font-medium' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {shortcut.description}
                                                {shortcut.category === 'power' && (
                                                    <Zap size={12} className="inline ml-1 text-amber-500" />
                                                )}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {shortcut.keys.map((key, kidx) => (
                                                    <span key={kidx} className="flex items-center gap-1">
                                                        <kbd
                                                            className={`px-2 py-1 text-xs font-medium rounded-md
                                                                       border transition-all min-w-[28px] text-center
                                                                       ${key.startsWith('/') 
                                                                           ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700'
                                                                           : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 shadow-sm'
                                                                       }
                                                                       group-hover:border-blue-300 dark:group-hover:border-blue-600`}
                                                        >
                                                            {formatKey(key)}
                                                        </kbd>
                                                        {kidx < shortcut.keys.length - 1 && (
                                                            <span className="text-gray-300 dark:text-gray-600 text-xs mx-0.5">+</span>
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
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 
                                bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <Command size={14} />
                            <span>
                                Press 
                                <kbd className="mx-1 px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs border border-gray-200 dark:border-gray-600 shadow-sm">
                                    {isMac ? '⌘' : 'Ctrl'}
                                </kbd>
                                +
                                <kbd className="ml-1 px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs border border-gray-200 dark:border-gray-600 shadow-sm">
                                    ?
                                </kbd>
                                anytime to view shortcuts
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white 
                                       rounded-lg text-sm font-medium hover:from-violet-600 hover:to-purple-700 
                                       transition-all shadow-lg shadow-purple-500/20"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
