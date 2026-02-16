import { WorkspaceData, Page } from '@/lib/types'

const STORAGE_KEY = 'onot-workspace-v2'

export const loadWorkspace = (): WorkspaceData => {
    try {
        if (typeof window === 'undefined') {
            return getDefaultWorkspace()
        }
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) {
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('Failed to load workspace:', error)
    }

    return getDefaultWorkspace()
}

const getDefaultWorkspace = (): WorkspaceData => {
    const welcomePage: Page = {
        id: 'welcome',
        title: 'Welcome to Onot',
        icon: '🚀',
        coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        blocks: [
            {
                id: 'block-1',
                type: 'h1',
                content: 'Welcome to Onot ✨',
            },
            {
                id: 'block-2',
                type: 'text',
                content: 'A fully local, open-source Notion alternative. Type / to see all available block types.',
            },
            {
                id: 'block-3',
                type: 'callout',
                content: 'Try typing / in any empty block to see the command menu with all block types! Press Ctrl+? to see all keyboard shortcuts.',
                calloutIcon: '💡',
            },
            {
                id: 'block-4',
                type: 'h2',
                content: 'Keyboard Shortcuts',
            },
            {
                id: 'block-4a',
                type: 'text',
                content: 'Onot is designed for keyboard-first productivity. Press Ctrl+? (or Cmd+? on Mac) anytime to see the full list of shortcuts!',
            },
            {
                id: 'block-4b',
                type: 'bullet-list',
                content: 'Ctrl+K - Quick search',
            },
            {
                id: 'block-4c',
                type: 'bullet-list',
                content: 'Ctrl+N - New page',
            },
            {
                id: 'block-4d',
                type: 'bullet-list',
                content: 'Ctrl+D - Duplicate block',
            },
            {
                id: 'block-4e',
                type: 'bullet-list',
                content: 'Right-click - Context menu on any block or page',
            },
            {
                id: 'block-4f',
                type: 'bullet-list',
                content: 'Ctrl+↑/↓ - Move blocks up or down',
            },
            {
                id: 'block-5-divider',
                type: 'divider',
                content: '',
            },
            {
                id: 'block-4g',
                type: 'h2',
                content: 'Features',
            },
            {
                id: 'block-5',
                type: 'todo',
                content: 'Custom database tables with sort & filter',
                checked: true,
            },
            {
                id: 'block-6',
                type: 'todo',
                content: 'Toggle blocks for collapsible content',
                checked: true,
            },
            {
                id: 'block-7',
                type: 'todo',
                content: 'Callout blocks with custom icons',
                checked: true,
            },
            {
                id: 'block-8',
                type: 'todo',
                content: 'Image blocks (upload or embed)',
                checked: true,
            },
            {
                id: 'block-9',
                type: 'todo',
                content: 'Block colors and backgrounds',
                checked: true,
            },
            {
                id: 'block-10',
                type: 'todo',
                content: 'Page cover images & gradients',
                checked: true,
            },
            {
                id: 'block-11',
                type: 'todo',
                content: 'Dark mode',
                checked: true,
            },
            {
                id: 'block-12',
                type: 'todo',
                content: 'Favorites & search (Ctrl+K)',
                checked: true,
            },
            {
                id: 'block-12a',
                type: 'todo',
                content: 'Comprehensive keyboard shortcuts (Ctrl+?)',
                checked: true,
            },
            {
                id: 'block-12b',
                type: 'todo',
                content: 'Right-click context menus everywhere',
                checked: true,
            },
            {
                id: 'block-13',
                type: 'divider',
                content: '',
            },
            {
                id: 'block-14',
                type: 'toggle',
                content: 'How to use the slash menu',
                toggleOpen: false,
                children: [
                    {
                        id: 'block-14-child',
                        type: 'text',
                        content: 'Type / at the beginning of any block to open the command menu. You can then search for block types like "table", "image", "callout", etc.',
                    },
                ],
            },
            {
                id: 'block-15',
                type: 'quote',
                content: 'The best tool is the one you build yourself.',
            },
        ],
        parentId: null,
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }

    return {
        pages: { welcome: welcomePage },
        pageOrder: ['welcome'],
        darkMode: false,
    }
}

export const saveWorkspace = (workspace: WorkspaceData): void => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
        }
    } catch (error) {
        console.error('Failed to save workspace:', error)
    }
}

