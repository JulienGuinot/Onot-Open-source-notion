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
    | 'markdown'
    | 'quote'
    | 'divider'
    | 'toggle'
    | 'callout'
    | 'image'
    | 'table'
    | 'drawing'
    | 'youtube'
    | 'file'
    | 'map';

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
    wrap?: boolean;
    hidden?: boolean;
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
    // Map specific
    mapUrl?: string;
    // UI state
    autoFocus?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────

export type PageType = 'page' | 'folder';

export interface Page {
    id: string;
    title: string;
    type?: PageType;
    icon?: string;
    coverImage?: string;
    coverGradient?: string;
    blocks: Block[];
    parentId: string | null;
    isFavorite?: boolean;
    createdAt: number;
    updatedAt: number;
}

// ─── Workspace ────────────────────────────────────────────────

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
    user_id: string;
    workspace_id: string;
    role: MemberRole;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    profile?: UserProfile;
}

export interface WorkspaceInvite {
    id: string;
    workspace_id: string;
    token: string;
    role: MemberRole;
    expires_at: string;
    created_by?: string;
}

export interface AgentToken {
    id: string;
    user_id: string;
    name: string;
    token_prefix: string;
    created_at: string;
    last_used_at?: string | null;
    revoked_at?: string | null;
}

export interface PresenceUser {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    last_seen?: number;
}

export interface UserProfile {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
}

export interface WorkspaceData {
    id: string;
    name: string;
    pages?: Record<string, Page>;
    pageOrder: string[];
    darkMode?: boolean;
    role?: MemberRole;
}

// ─── App Data ────────────────────────────────────────────────

export interface AppData {
    currentWorkspaceId: string;
    workspaces: Record<string, WorkspaceData>;
}
