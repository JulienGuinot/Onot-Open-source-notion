import { Block, BlockType, BLOCK_TYPES, Page } from './types.js';

export function isBlockType(t: string): t is BlockType {
    return (BLOCK_TYPES as string[]).includes(t);
}

export function genId(prefix = 'b'): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newBlock(type: BlockType, content = '', extra: Partial<Block> = {}): Block {
    const b: Block = { id: genId(), type, content, ...extra };
    if (type === 'todo' && b.checked === undefined) b.checked = false;
    if (type === 'toggle' && b.toggleOpen === undefined) b.toggleOpen = true;
    return b;
}

/** Walk every block in a page (depth-first, including children of toggles). */
export function* walkBlocks(blocks: Block[], parent: Block[] = []): Generator<{ block: Block; parent: Block[]; index: number }> {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b) continue;
        yield { block: b, parent: blocks, index: i };
        if (b.children?.length) {
            yield* walkBlocks(b.children, b.children);
        }
    }
}

export function findBlock(page: Page, blockId: string): { block: Block; parent: Block[]; index: number } | null {
    for (const hit of walkBlocks(page.blocks)) {
        if (hit.block.id === blockId) return hit;
    }
    return null;
}

export function removeBlock(page: Page, blockId: string): Block | null {
    const hit = findBlock(page, blockId);
    if (!hit) return null;
    const [removed] = hit.parent.splice(hit.index, 1);
    return removed ?? null;
}

/**
 * Insert a block at a target position.
 * - position "append" / "prepend": relative to page root
 * - position "before" / "after" with anchorId: relative to that block (same parent)
 */
export function insertBlock(
    page: Page,
    block: Block,
    position: 'append' | 'prepend' | 'before' | 'after',
    anchorId?: string,
): void {
    if (position === 'append') {
        page.blocks.push(block);
        return;
    }
    if (position === 'prepend') {
        page.blocks.unshift(block);
        return;
    }
    if (!anchorId) throw new Error(`position "${position}" requires anchor_block_id`);
    const hit = findBlock(page, anchorId);
    if (!hit) throw new Error(`Anchor block not found: ${anchorId}`);
    const offset = position === 'after' ? 1 : 0;
    hit.parent.splice(hit.index + offset, 0, block);
}

/** Render a page to compact Markdown for read_page text mode. */
export function pageToMarkdown(page: Page): string {
    const lines: string[] = [];
    if (page.icon) lines.push(`# ${page.icon} ${page.title}`);
    else lines.push(`# ${page.title}`);
    lines.push('');
    renderBlocks(page.blocks, lines, 0);
    return lines.join('\n').trimEnd();
}

function renderBlocks(blocks: Block[], out: string[], depth: number): void {
    const indent = '  '.repeat(depth);
    for (const b of blocks) {
        switch (b.type) {
            case 'h1': out.push(`${indent}# ${b.content}`); break;
            case 'h2': out.push(`${indent}## ${b.content}`); break;
            case 'h3': out.push(`${indent}### ${b.content}`); break;
            case 'bullet-list': out.push(`${indent}- ${b.content}`); break;
            case 'numbered-list': out.push(`${indent}1. ${b.content}`); break;
            case 'todo': out.push(`${indent}- [${b.checked ? 'x' : ' '}] ${b.content}`); break;
            case 'code': out.push(`${indent}\`\`\`${b.language ?? ''}\n${b.content}\n${indent}\`\`\``); break;
            case 'quote': out.push(`${indent}> ${b.content}`); break;
            case 'divider': out.push(`${indent}---`); break;
            case 'callout': out.push(`${indent}> ${b.calloutIcon ?? '💡'} ${b.content}`); break;
            case 'image': out.push(`${indent}![${b.imageCaption ?? ''}](${b.imageUrl ?? ''})`); break;
            case 'youtube': out.push(`${indent}[YouTube](${b.youtubeUrl ?? ''})`); break;
            case 'file': out.push(`${indent}[${b.fileName ?? 'file'}](${b.fileUrl ?? ''})`); break;
            case 'map': out.push(`${indent}[Map](${b.mapUrl ?? ''})`); break;
            case 'table': out.push(`${indent}[table: ${b.tableData?.columns.length ?? 0} cols × ${b.tableData?.rows.length ?? 0} rows]`); break;
            case 'toggle':
                out.push(`${indent}<details><summary>${b.content}</summary>`);
                if (b.children?.length) renderBlocks(b.children, out, depth + 1);
                out.push(`${indent}</details>`);
                break;
            case 'markdown':
            case 'text':
            default:
                out.push(`${indent}${b.content}`);
        }
        out.push('');
    }
}

/** Case-insensitive substring search across blocks of a page. Returns block ids and snippets. */
export function searchInPage(page: Page, needle: string): { blockId: string; type: BlockType; snippet: string }[] {
    const q = needle.toLowerCase();
    const hits: { blockId: string; type: BlockType; snippet: string }[] = [];
    for (const { block } of walkBlocks(page.blocks)) {
        const hay = (block.content ?? '').toLowerCase();
        const idx = hay.indexOf(q);
        if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(block.content.length, idx + needle.length + 30);
            hits.push({ blockId: block.id, type: block.type, snippet: block.content.slice(start, end) });
        }
    }
    return hits;
}
