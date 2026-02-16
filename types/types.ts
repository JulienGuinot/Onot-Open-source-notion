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
  | 'table';

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

// ─── Workspace ────────────────────────────────────────────────

export interface WorkspaceData {
  pages: Record<string, Page>;
  pageOrder: string[];
  darkMode?: boolean;
}
