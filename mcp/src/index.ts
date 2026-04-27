#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { assertWriteAccess, getAgentSession } from './supabase.js';
import {
    appendToPageOrder,
    deletePage,
    listPages,
    listWorkspaces,
    readPage,
    removeFromPageOrder,
    writePage,
} from './repo.js';
import {
    findBlock,
    genId,
    insertBlock,
    isBlockType,
    newBlock,
    pageToMarkdown,
    removeBlock,
    searchInPage,
} from './blocks.js';
import { BLOCK_TYPES, Block, BlockType, Page } from './types.js';

const server = new McpServer({
    name: 'onot-mcp',
    version: '0.1.0',
});

// ─── Helpers ──────────────────────────────────────────────────────────────

const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] });
const okJson = (obj: unknown) => ok(JSON.stringify(obj, null, 2));

async function mutatePage<T>(
    workspaceId: string,
    pageId: string,
    fn: (page: Page) => T | Promise<T>,
): Promise<{ result: T; page: Page }> {
    await assertWriteAccess(workspaceId);
    const page = await readPage(workspaceId, pageId);
    const result = await fn(page);
    await writePage(workspaceId, page);
    return { result, page };
}

// ─── Resources (read-only views) ──────────────────────────────────────────

server.resource(
    'workspaces',
    'onot://workspaces',
    async (uri) => {
        const ws = await listWorkspaces();
        return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(ws, null, 2) }] };
    },
);

server.resource(
    'workspace-pages',
    new ResourceTemplate('onot://workspace/{workspaceId}/pages', { list: undefined }),
    async (uri, { workspaceId }) => {
        const pages = await listPages(String(workspaceId));
        return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(pages, null, 2) }] };
    },
);

server.resource(
    'page-json',
    new ResourceTemplate('onot://workspace/{workspaceId}/page/{pageId}', { list: undefined }),
    async (uri, { workspaceId, pageId }) => {
        const page = await readPage(String(workspaceId), String(pageId));
        return {
            contents: [
                { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(page, null, 2) },
                { uri: uri.href + '?format=md', mimeType: 'text/markdown', text: pageToMarkdown(page) },
            ],
        };
    },
);

// ─── Tools — read ─────────────────────────────────────────────────────────

server.tool(
    'list_workspaces',
    'List every workspace the agent is a member of, with its role.',
    {},
    async () => okJson(await listWorkspaces()),
);

server.tool(
    'list_pages',
    'List pages of a workspace (id, title, type, parent, updated_at).',
    { workspace_id: z.string() },
    async ({ workspace_id }) => okJson(await listPages(workspace_id)),
);

server.tool(
    'read_page',
    'Read one page. Returns structured blocks JSON and a Markdown rendering.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        format: z.enum(['json', 'markdown', 'both']).default('both'),
    },
    async ({ workspace_id, page_id, format }) => {
        const page = await readPage(workspace_id, page_id);
        if (format === 'json') return okJson(page);
        if (format === 'markdown') return ok(pageToMarkdown(page));
        return okJson({ markdown: pageToMarkdown(page), page });
    },
);

server.tool(
    'search_pages',
    'Substring search across all pages of a workspace. Looks at titles and block content.',
    {
        workspace_id: z.string(),
        query: z.string().min(1),
        limit: z.number().int().positive().max(100).default(20),
    },
    async ({ workspace_id, query, limit }) => {
        const pages = await listPages(workspace_id);
        const q = query.toLowerCase();
        const out: any[] = [];

        for (const meta of pages) {
            if (out.length >= limit) break;
            const titleHit = meta.title.toLowerCase().includes(q);
            const page = await readPage(workspace_id, meta.id);
            const blockHits = searchInPage(page, query);
            if (titleHit || blockHits.length) {
                out.push({
                    page_id: meta.id,
                    title: meta.title,
                    title_match: titleHit,
                    block_hits: blockHits.slice(0, 5),
                });
            }
        }
        return okJson(out);
    },
);

// ─── Tools — page mutations ───────────────────────────────────────────────

server.tool(
    'create_page',
    'Create a new page. Returns the new page id.',
    {
        workspace_id: z.string(),
        title: z.string().default('Untitled'),
        parent_id: z.string().nullable().default(null),
        icon: z.string().optional(),
        type: z.enum(['page', 'folder']).default('page'),
    },
    async ({ workspace_id, title, parent_id, icon, type }) => {
        await assertWriteAccess(workspace_id);
        const id = genId('p');
        const now = Date.now();
        const page: Page = {
            id,
            title,
            type,
            icon,
            blocks: [],
            parentId: parent_id,
            createdAt: now,
            updatedAt: now,
        };
        await writePage(workspace_id, page);
        await appendToPageOrder(workspace_id, id);
        return okJson({ page_id: id });
    },
);

server.tool(
    'rename_page',
    'Rename a page (and optionally update its icon).',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        title: z.string().optional(),
        icon: z.string().optional(),
    },
    async ({ workspace_id, page_id, title, icon }) => {
        if (title === undefined && icon === undefined) {
            throw new Error('Provide at least one of: title, icon');
        }
        const { page } = await mutatePage(workspace_id, page_id, (p) => {
            if (title !== undefined) p.title = title;
            if (icon !== undefined) p.icon = icon;
        });
        return okJson({ page_id: page.id, title: page.title, icon: page.icon });
    },
);

server.tool(
    'delete_page',
    'Permanently delete a page. Requires confirm=true.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        confirm: z.literal(true),
    },
    async ({ workspace_id, page_id }) => {
        await assertWriteAccess(workspace_id);
        await deletePage(workspace_id, page_id);
        await removeFromPageOrder(workspace_id, page_id);
        return ok(`Deleted page ${page_id}`);
    },
);

// ─── Tools — block mutations ──────────────────────────────────────────────

const blockTypeSchema = z
    .string()
    .refine(isBlockType, { message: `type must be one of: ${BLOCK_TYPES.join(', ')}` });

server.tool(
    'append_block',
    'Append a block at the end of a page.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        type: blockTypeSchema,
        content: z.string().default(''),
        language: z.string().optional(),
        callout_icon: z.string().optional(),
        checked: z.boolean().optional(),
    },
    async (args) => {
        const { result } = await mutatePage(args.workspace_id, args.page_id, (page) => {
            const block = newBlock(args.type as BlockType, args.content, {
                language: args.language,
                calloutIcon: args.callout_icon,
                checked: args.checked,
            });
            page.blocks.push(block);
            return { block_id: block.id };
        });
        return okJson(result);
    },
);

server.tool(
    'insert_block',
    'Insert a block at a precise position.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        type: blockTypeSchema,
        content: z.string().default(''),
        position: z.enum(['append', 'prepend', 'before', 'after']),
        anchor_block_id: z.string().optional(),
        language: z.string().optional(),
        callout_icon: z.string().optional(),
        checked: z.boolean().optional(),
    },
    async (args) => {
        const { result } = await mutatePage(args.workspace_id, args.page_id, (page) => {
            const block = newBlock(args.type as BlockType, args.content, {
                language: args.language,
                calloutIcon: args.callout_icon,
                checked: args.checked,
            });
            insertBlock(page, block, args.position, args.anchor_block_id);
            return { block_id: block.id };
        });
        return okJson(result);
    },
);

server.tool(
    'update_block',
    'Update content and/or metadata of a block.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        content: z.string().optional(),
        language: z.string().optional(),
        callout_icon: z.string().optional(),
    },
    async (args) => {
        const { result } = await mutatePage(args.workspace_id, args.page_id, (page) => {
            const hit = findBlock(page, args.block_id);
            if (!hit) throw new Error(`Block not found: ${args.block_id}`);
            const before = hit.block.content;
            if (args.content !== undefined) hit.block.content = args.content;
            if (args.language !== undefined) hit.block.language = args.language;
            if (args.callout_icon !== undefined) hit.block.calloutIcon = args.callout_icon;
            return { block_id: hit.block.id, before, after: hit.block.content };
        });
        return okJson(result);
    },
);

server.tool(
    'change_block_type',
    'Change the type of an existing block (preserves its id and content).',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        new_type: blockTypeSchema,
    },
    async ({ workspace_id, page_id, block_id, new_type }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            const hit = findBlock(page, block_id);
            if (!hit) throw new Error(`Block not found: ${block_id}`);
            const old = hit.block.type;
            hit.block.type = new_type as BlockType;
            return { block_id, from: old, to: new_type };
        });
        return okJson(result);
    },
);

server.tool(
    'delete_block',
    'Delete a block by id. Requires confirm=true.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        confirm: z.literal(true),
    },
    async ({ workspace_id, page_id, block_id }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            const removed = removeBlock(page, block_id);
            if (!removed) throw new Error(`Block not found: ${block_id}`);
            return { block_id, type: removed.type };
        });
        return okJson(result);
    },
);

server.tool(
    'move_block',
    'Move a block to another position in the same page.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        position: z.enum(['append', 'prepend', 'before', 'after']),
        anchor_block_id: z.string().optional(),
    },
    async ({ workspace_id, page_id, block_id, position, anchor_block_id }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            if (anchor_block_id === block_id) throw new Error('Cannot anchor on the moved block itself');
            const moved = removeBlock(page, block_id);
            if (!moved) throw new Error(`Block not found: ${block_id}`);
            insertBlock(page, moved, position, anchor_block_id);
            return { block_id, position, anchor_block_id: anchor_block_id ?? null };
        });
        return okJson(result);
    },
);

// ─── Specialized helpers ──────────────────────────────────────────────────

server.tool(
    'set_todo_checked',
    'Set the checked state of a todo block.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        checked: z.boolean(),
    },
    async ({ workspace_id, page_id, block_id, checked }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            const hit = findBlock(page, block_id);
            if (!hit) throw new Error(`Block not found: ${block_id}`);
            if (hit.block.type !== 'todo') throw new Error(`Block ${block_id} is not a todo (type=${hit.block.type})`);
            hit.block.checked = checked;
            return { block_id, checked };
        });
        return okJson(result);
    },
);

server.tool(
    'update_table_cell',
    'Update one cell in a table block.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        block_id: z.string(),
        row_id: z.string(),
        column_id: z.string(),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
    },
    async ({ workspace_id, page_id, block_id, row_id, column_id, value }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            const hit = findBlock(page, block_id);
            if (!hit) throw new Error(`Block not found: ${block_id}`);
            if (hit.block.type !== 'table' || !hit.block.tableData) {
                throw new Error(`Block ${block_id} is not a table`);
            }
            const row = hit.block.tableData.rows.find((r) => r.id === row_id);
            if (!row) throw new Error(`Row not found: ${row_id}`);
            const col = hit.block.tableData.columns.find((c) => c.id === column_id);
            if (!col) throw new Error(`Column not found: ${column_id}`);
            const before = row.cells[column_id] ?? null;
            row.cells[column_id] = value;
            return { block_id, row_id, column_id, before, after: value };
        });
        return okJson(result);
    },
);

server.tool(
    'add_agent_note',
    'Append a callout block tagged as an agent note. Convenience wrapper over append_block.',
    {
        workspace_id: z.string(),
        page_id: z.string(),
        text: z.string().min(1),
        icon: z.string().default('🤖'),
    },
    async ({ workspace_id, page_id, text, icon }) => {
        const { result } = await mutatePage(workspace_id, page_id, (page) => {
            const block: Block = newBlock('callout', text, { calloutIcon: icon });
            page.blocks.push(block);
            return { block_id: block.id };
        });
        return okJson(result);
    },
);

// ─── Boot ─────────────────────────────────────────────────────────────────

async function main() {
    // Eagerly authenticate so startup errors surface immediately
    // instead of on the first tool call.
    await getAgentSession();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('[onot-mcp] ready (stdio)\n');
}

main().catch((err) => {
    process.stderr.write(`[onot-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
