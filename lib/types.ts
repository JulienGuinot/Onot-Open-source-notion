// ─── Block Types ──────────────────────────────────────────────

export type BlockType =
    | 'text'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'bullet-list'
    | 'numbered-list'
    | 'todo'
    | 'code'
    | 'quote'
    | 'divider'
    | 'toggle'
    | 'callout'
    | 'image'
    | 'table'
    | 'youtube'
    | 'file'

// ─── Table / Database Types ───────────────────────────────────

export type ColumnType =
    | 'text'
    | 'number'
    | 'select'
    | 'multi-select'
    | 'date'
    | 'checkbox'
    | 'url';

export interface SelectOption {
    id: string;
    label: string;
    color: string;
}

export interface TableColumn {
    id: string;
    name: string;
    type: ColumnType;
    width: number;
    options?: SelectOption[];
    hidden?: boolean;
    wrap?: boolean;
}

export interface TableRow {
    id: string;
    cells: Record<string, CellValue>;
}

export type CellValue = string | number | boolean | string[] | null;

export interface TableData {
    columns: TableColumn[];
    rows: TableRow[];
}

export type SortDirection = 'asc' | 'desc';

export interface TableSort {
    columnId: string;
    direction: SortDirection;
}

export interface TableFilter {
    columnId: string;
    operator: 'contains' | 'equals' | 'not-empty' | 'empty' | 'gt' | 'lt';
    value: string;
}

// ─── Block Styling ────────────────────────────────────────────

export const BLOCK_COLORS = {
    default: '',
    gray: '#9b9a97',
    brown: '#64473a',
    orange: '#d9730d',
    yellow: '#dfab01',
    green: '#0f7b6c',
    blue: '#0b6e99',
    purple: '#6940a5',
    pink: '#ad1a72',
    red: '#e03e3e',
} as const;

export const BLOCK_BG_COLORS = {
    default: '',
    gray: '#f1f1ef',
    brown: '#f4eeee',
    orange: '#fbecdd',
    yellow: '#fbf3db',
    green: '#edf3ec',
    blue: '#e7f3f8',
    purple: '#f6f3f9',
    pink: '#f9f0f5',
    red: '#fdebec',
} as const;

export type BlockColorKey = keyof typeof BLOCK_COLORS;
export type BlockBgColorKey = keyof typeof BLOCK_BG_COLORS;

export interface BlockStyle {
    color?: BlockColorKey;
    backgroundColor?: BlockBgColorKey;
}

// ─── Block ────────────────────────────────────────────────────

export interface Block {
    id: string;
    type: BlockType;
    content: string;
    checked?: boolean;
    language?: string;
    style?: BlockStyle;
    // Table specific
    tableData?: TableData;
    // Toggle specific
    toggleOpen?: boolean;
    children?: Block[];
    // Callout specific
    calloutIcon?: string;
    // Image specific
    imageUrl?: string;
    imageCaption?: string;
    // YouTube specific
    youtubeUrl?: string;
    // File specific
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
    // UI state
    autoFocus?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────

export interface Page {
    id: string;
    title: string;
    icon?: string;
    coverImage?: string;
    coverGradient?: string;
    blocks: Block[];
    parentId: string | null;
    isFavorite?: boolean;
    createdAt: number;
    updatedAt: number;
}

// ─── Collaboration ────────────────────────────────────────────

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface WorkspaceMember {
    workspace_id: string;
    user_id: string;
    role: MemberRole;
    created_at: string;
    email?: string;
}

export interface WorkspaceInvite {
    id: string;
    workspace_id: string;
    token: string;
    role: Exclude<MemberRole, 'owner'>;
    created_by: string;
    expires_at: string | null;
    created_at: string;
}

export interface PresenceUser {
    user_id: string;
    email: string;
    online_at: string;
}

// ─── Workspace ────────────────────────────────────────────────

export interface WorkspaceData {
    id: string;
    name: string;
    pageOrder: string[];
    darkMode?: boolean;
    role?: MemberRole;
}

/**
 * Local-storage format embeds pages inside each workspace for offline use.
 * The cloud schema stores pages in a separate `pages` table.
 */
export interface AppData {
    currentWorkspaceId: string;
    workspaces: Record<string, WorkspaceData & { pages: Record<string, Page> }>;
}
