/**
 * Keyboard Shortcuts Configuration
 * Centralized management of all keyboard shortcuts for consistency
 */

export interface KeyboardShortcut {
    keys: string[]
    description: string
    category: 'block' | 'page' | 'navigation' | 'general'
    action: string
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    // Block operations
    {
        keys: ['Ctrl', 'D'],
        description: 'Duplicate block',
        category: 'block',
        action: 'duplicate',
    },
    {
        keys: ['Ctrl', 'Shift', 'D'],
        description: 'Delete block',
        category: 'block',
        action: 'delete',
    },
    {
        keys: ['Ctrl', '↑'],
        description: 'Move block up',
        category: 'block',
        action: 'moveUp',
    },
    {
        keys: ['Ctrl', '↓'],
        description: 'Move block down',
        category: 'block',
        action: 'moveDown',
    },
    {
        keys: ['F2'],
        description: 'Rename/Edit block name',
        category: 'block',
        action: 'rename',
    },
    {
        keys: ['Enter'],
        description: 'Create new block below',
        category: 'block',
        action: 'newBlockBelow',
    },
    {
        keys: ['Shift', 'Enter'],
        description: 'New line in current block',
        category: 'block',
        action: 'newLine',
    },
    {
        keys: ['Backspace'],
        description: 'Delete block (when empty)',
        category: 'block',
        action: 'deleteWhenEmpty',
    },

    // Page operations
    {
        keys: ['Ctrl', 'N'],
        description: 'Create new page',
        category: 'page',
        action: 'newPage',
    },
    {
        keys: ['Ctrl', 'K'],
        description: 'Search/Quick switcher',
        category: 'navigation',
        action: 'search',
    },
    {
        keys: ['Ctrl', 'P'],
        description: 'Quick page switcher',
        category: 'navigation',
        action: 'pageSwitch',
    },
    {
        keys: ['Ctrl', '\\'],
        description: 'Toggle sidebar',
        category: 'navigation',
        action: 'toggleSidebar',
    },
    {
        keys: ['Ctrl', '?'],
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: 'showShortcuts',
    },
    {
        keys: ['Escape'],
        description: 'Close menus/dialogs',
        category: 'general',
        action: 'escape',
    },
]

/**
 * Get shortcuts by category
 */
export const getShortcutsByCategory = (category: 'block' | 'page' | 'navigation' | 'general') => {
    return KEYBOARD_SHORTCUTS.filter((s) => s.category === category)
}

/**
 * Format keyboard shortcut for display
 */
export const formatShortcut = (keys: string[]): string => {
    return keys.join(' + ')
}

/**
 * Get shortcut by action name
 */
export const getShortcutByAction = (action: string): KeyboardShortcut | undefined => {
    return KEYBOARD_SHORTCUTS.find((s) => s.action === action)
}

