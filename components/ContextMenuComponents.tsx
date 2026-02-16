'use client'

import { ReactNode } from 'react'

/**
 * Menu separator component for visual grouping
 */
export const MenuDivider = () => (
    <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
)

/**
 * Menu header component for section titles
 */
export interface MenuHeaderProps {
    label: string
}

export const MenuHeader = ({ label }: MenuHeaderProps) => (
    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
    </div>
)

/**
 * Keyboard shortcut display component
 */
export interface KeyboardShortcutProps {
    keys: string[]
}

export const KeyboardShortcut = ({ keys }: KeyboardShortcutProps) => (
    <span className="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500 flex items-center gap-1">
        {keys.map((key, idx) => (
            <span key={idx}>
                {idx > 0 && '+'}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                    {key}
                </kbd>
            </span>
        ))}
    </span>
)

/**
 * Icon wrapper component for consistent sizing
 */
export interface IconProps {
    children: ReactNode
    size?: number
}

export const Icon = ({ children, size = 16 }: IconProps) => (
    <div className="flex-shrink-0 flex items-center justify-center w-4 h-4">
        {children}
    </div>
)

/**
 * Tooltip component for menu items
 */
export interface TooltipProps {
    text: string
    children: ReactNode
}

export const Tooltip = ({ text, children }: TooltipProps) => (
    <div className="group relative inline-block">
        {children}
        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap">
            {text}
        </div>
    </div>
)

