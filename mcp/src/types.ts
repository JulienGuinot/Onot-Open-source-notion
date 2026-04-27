// Local copy of the Onot data types the MCP server needs.
// Kept in sync with ../../lib/types.ts. Only the subset used by the server is duplicated
// to avoid pulling Next.js / React dependencies into the MCP runtime.

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

export const BLOCK_TYPES: BlockType[] = [
    'text', 'h1', 'h2', 'h3', 'bullet-list', 'numbered-list', 'todo', 'code',
    'markdown', 'quote', 'divider', 'toggle', 'callout', 'image', 'table',
    'drawing', 'youtube', 'file', 'map',
];

export type CellValue = string | number | boolean | string[] | null;

export interface TableColumn {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'checkbox' | 'url';
    width: number;
    options?: { id: string; label: string; color: string }[];
    wrap?: boolean;
    hidden?: boolean;
}

export interface TableRow {
    id: string;
    cells: Record<string, CellValue>;
}

export interface TableData {
    columns: TableColumn[];
    rows: TableRow[];
}

export interface Block {
    id: string;
    type: BlockType;
    content: string;
    checked?: boolean;
    language?: string;
    style?: { color?: string; backgroundColor?: string };
    tableData?: TableData;
    toggleOpen?: boolean;
    children?: Block[];
    calloutIcon?: string;
    imageUrl?: string;
    imageCaption?: string;
    youtubeUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
    mapUrl?: string;
}

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

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface WorkspaceRow {
    id: string;
    name: string;
    data: { darkMode?: boolean; pageOrder?: string[] } | null;
}
