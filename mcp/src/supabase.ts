import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

export interface AgentSession {
    client: SupabaseClient;
    userId: string;
    expiresAt: number;
}

let cached: AgentSession | null = null;
const REFRESH_SKEW_SECONDS = 120;
const DEFAULT_ONOT_API_URL = 'https://onot-ruby.vercel.app';
const CONFIG_PATH = join(homedir(), '.onot', 'mcp.json');

interface AuthConfig {
    token: string;
    apiUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
}

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function envConfig(): AuthConfig | null {
    const token = process.env.ONOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseAnonKey) return null;
    return {
        token,
        apiUrl: process.env.ONOT_API_URL || DEFAULT_ONOT_API_URL,
        supabaseUrl,
        supabaseAnonKey,
    };
}

function isAuthConfig(value: unknown): value is AuthConfig {
    const v = value as Partial<AuthConfig>;
    return Boolean(v?.token && v.apiUrl && v.supabaseUrl && v.supabaseAnonKey);
}

async function readCachedConfig(): Promise<AuthConfig | null> {
    try {
        const raw = await readFile(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return isAuthConfig(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

async function writeCachedConfig(config: AuthConfig): Promise<void> {
    await mkdir(dirname(CONFIG_PATH), { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function openBrowser(url: string): void {
    const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
    const args = platform() === 'win32' ? ['/c', 'start', '', url] : [url];
    try {
        const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
        child.unref();
    } catch {
        // The URL is also printed to stderr for headless environments.
    }
}

async function browserAuth(): Promise<AuthConfig> {
    const state = randomBytes(16).toString('hex');
    const apiBase = process.env.ONOT_API_URL || DEFAULT_ONOT_API_URL;

    return new Promise<AuthConfig>((resolve, reject) => {
        const server = createServer((req, res) => {
            try {
                const url = new URL(req.url ?? '/', 'http://127.0.0.1');
                if (url.pathname !== '/callback') {
                    res.writeHead(404).end('Not found');
                    return;
                }
                if (url.searchParams.get('state') !== state) {
                    res.writeHead(400).end('Invalid state');
                    return;
                }

                const config: AuthConfig = {
                    token: url.searchParams.get('token') ?? '',
                    apiUrl: url.searchParams.get('api_url') ?? apiBase,
                    supabaseUrl: url.searchParams.get('supabase_url') ?? '',
                    supabaseAnonKey: url.searchParams.get('supabase_anon_key') ?? '',
                };
                if (!isAuthConfig(config)) {
                    res.writeHead(400).end('Missing auth data');
                    return;
                }

                res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
                res.end('<!doctype html><title>Onot MCP connected</title><p>Onot MCP is connected. You can close this tab.</p>');
                server.close();
                resolve(config);
            } catch (err) {
                reject(err);
            }
        });

        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Could not start local auth callback server'));
                return;
            }
            const redirectUri = `http://127.0.0.1:${address.port}/callback`;
            const authUrl = new URL('/mcp/connect', apiBase);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('state', state);

            process.stderr.write(`[onot-mcp] Open this URL to connect Onot:\n${authUrl.toString()}\n`);
            openBrowser(authUrl.toString());
        });

        setTimeout(() => {
            server.close();
            reject(new Error('Browser authentication timed out'));
        }, 10 * 60 * 1000).unref();
    });
}

async function resolveAuthConfig(): Promise<AuthConfig> {
    const fromEnv = envConfig();
    if (fromEnv) return fromEnv;

    const cachedConfig = await readCachedConfig();
    if (cachedConfig) return cachedConfig;

    const config = await browserAuth();
    await writeCachedConfig(config);
    return config;
}

interface TokenExchangeResponse {
    access_token: string;
    user_id: string;
    expires_at: number;
}

function apiUrl(base: string, path: string): string {
    return new URL(path, base).toString();
}

async function exchangeToken(config: AuthConfig): Promise<TokenExchangeResponse> {
    const res = await fetch(apiUrl(config.apiUrl, '/api/mcp/exchange'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: config.token }),
    });

    if (!res.ok) {
        let detail = res.statusText;
        try {
            const body = await res.json() as { error?: string };
            if (body.error) detail = body.error;
        } catch {
            // Keep the HTTP status text when the response is not JSON.
        }
        throw new Error(`Token exchange failed (${res.status}): ${detail}`);
    }

    const body = await res.json() as Partial<TokenExchangeResponse>;
    if (!body.access_token || !body.user_id || !body.expires_at) {
        throw new Error('Token exchange returned an invalid response');
    }
    return {
        access_token: body.access_token,
        user_id: body.user_id,
        expires_at: body.expires_at,
    };
}

/**
 * Returns a Supabase client authenticated as the user that approved MCP access.
 * The exchanged JWT is cached and refreshed shortly before expiry. RLS
 * continues to apply, so the agent can only see/edit that user's workspaces.
 */
export async function getAgentSession(): Promise<AgentSession> {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.expiresAt - REFRESH_SKEW_SECONDS > now) return cached;

    const config = await resolveAuthConfig();
    const session = await exchangeToken(config);

    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        },
    });

    cached = { client, userId: session.user_id, expiresAt: session.expires_at };
    return cached;
}

/**
 * Asserts the agent has a write-capable role on the workspace.
 * Throws an MCP-friendly error otherwise.
 */
export async function assertWriteAccess(workspaceId: string): Promise<void> {
    const { client, userId } = await getAgentSession();
    const { data, error } = await client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error(`No membership on workspace ${workspaceId}`);
    }
    if (!['owner', 'editor'].includes(data.role)) {
        throw new Error(`Role "${data.role}" cannot write on workspace ${workspaceId}`);
    }
}
