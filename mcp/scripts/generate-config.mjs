#!/usr/bin/env node
// Generate MCP client config for the onot-mcp server, adapted to local machine.
// Usage:
//   node scripts/generate-config.mjs                       # print all client configs
//   node scripts/generate-config.mjs --client claude-desktop
//   node scripts/generate-config.mjs --client claude-desktop --write
//   node scripts/generate-config.mjs --env-file .env.local

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MCP_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(MCP_DIR, '..');

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ONOT_TOKEN', 'ONOT_API_URL'];
const ALIASES = {
  SUPABASE_URL: ['NEXT_PUBLIC_SUPABASE_URL'],
  SUPABASE_ANON_KEY: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
};

function parseArgs(argv) {
  const out = { client: 'all', write: false, envFiles: [], serverName: 'onot' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--client') out.client = argv[++i];
    else if (a === '--write') out.write = true;
    else if (a === '--env-file') out.envFiles.push(argv[++i]);
    else if (a === '--name') out.serverName = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: generate-config.mjs [--client claude-desktop|claude-code|cursor|codex|json|all] [--write] [--env-file <path>]... [--name <serverName>]');
      process.exit(0);
    }
  }
  return out;
}

function parseEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const text = readFileSync(path, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, eq).trim()] = v;
  }
  return env;
}

function loadEnv(extraFiles) {
  const candidates = [
    join(MCP_DIR, '.env'),
    join(MCP_DIR, '.env.local'),
    join(REPO_ROOT, '.env'),
    join(REPO_ROOT, '.env.local'),
    ...extraFiles.map((f) => resolve(process.cwd(), f)),
  ];
  let merged = {};
  for (const p of candidates) merged = { ...merged, ...parseEnvFile(p) };
  merged = { ...merged, ...process.env };

  const resolved = {};
  const missing = [];
  for (const key of REQUIRED) {
    let v = merged[key];
    if (!v) {
      for (const alias of ALIASES[key] ?? []) {
        if (merged[alias]) { v = merged[alias]; break; }
      }
    }
    if (!v) missing.push(key);
    else resolved[key] = v;
  }
  return { env: resolved, missing, sources: candidates.filter(existsSync) };
}

function detectNode() {
  return process.execPath; // abs path to current node binary
}

function claudeDesktopConfigPath() {
  const home = homedir();
  switch (platform()) {
    case 'darwin': return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    default: return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'Claude', 'claude_desktop_config.json');
  }
}

function buildServerEntry(distEntry, env, nodeBin) {
  return {
    command: nodeBin,
    args: [distEntry],
    env: { ...env },
  };
}

function shellQuote(s) {
  if (platform() === 'win32') {
    return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
  }
  return /[^\w@%+=:,./-]/.test(s) ? `'${s.replace(/'/g, `'\\''`)}'` : s;
}

function emitClaudeCodeCli(name, distEntry, env, nodeBin) {
  const envFlags = Object.entries(env).map(([k, v]) => `--env ${k}=${shellQuote(v)}`).join(' \\\n  ');
  return `claude mcp add ${name} \\\n  ${envFlags} \\\n  -- ${shellQuote(nodeBin)} ${shellQuote(distEntry)}`;
}

function writeClaudeDesktop(name, entry) {
  const path = claudeDesktopConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  let cfg = {};
  if (existsSync(path)) {
    copyFileSync(path, path + '.bak');
    try { cfg = JSON.parse(readFileSync(path, 'utf8')); } catch { cfg = {}; }
  }
  cfg.mcpServers ??= {};
  cfg.mcpServers[name] = entry;
  writeFileSync(path, JSON.stringify(cfg, null, 2));
  return path;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const distEntry = join(MCP_DIR, 'dist', 'index.js');
  if (!existsSync(distEntry)) {
    console.error(`[warn] ${distEntry} missing. Run \`npm run build\` in mcp/ first.`);
  }
  const { env, missing, sources } = loadEnv(args.envFiles);
  if (missing.length) {
    console.error(`[error] missing env vars: ${missing.join(', ')}`);
    console.error(`        searched: ${sources.join(', ') || '(none)'}`);
    console.error(`        set them in mcp/.env or pass --env-file <path>`);
    process.exit(1);
  }
  const nodeBin = detectNode();
  const entry = buildServerEntry(distEntry, env, nodeBin);
  const name = args.serverName;

  if (args.write) {
    if (args.client !== 'claude-desktop') {
      console.error('[error] --write only supported for --client claude-desktop');
      process.exit(1);
    }
    const path = writeClaudeDesktop(name, entry);
    console.error(`[ok] wrote ${path} (backup: ${path}.bak if existed). Restart Claude Desktop.`);
    return;
  }

  const out = {};
  if (args.client === 'all' || args.client === 'claude-desktop' || args.client === 'cursor' || args.client === 'codex' || args.client === 'json') {
    out.claudeDesktop = { mcpServers: { [name]: entry } };
  }
  if (args.client === 'all' || args.client === 'claude-code') {
    out.claudeCodeCli = emitClaudeCodeCli(name, distEntry, env, nodeBin);
  }

  if (args.client === 'json') {
    console.log(JSON.stringify(out.claudeDesktop, null, 2));
    return;
  }
  if (args.client === 'claude-desktop' || args.client === 'cursor' || args.client === 'codex') {
    const target = args.client === 'claude-desktop' ? claudeDesktopConfigPath()
                 : args.client === 'cursor' ? '~/.cursor/mcp.json (or project .cursor/mcp.json)'
                 : '~/.codex/config.toml mcpServers section';
    console.log(`# ${args.client} config — paste into ${target}`);
    console.log(JSON.stringify(out.claudeDesktop, null, 2));
    return;
  }
  if (args.client === 'claude-code') {
    console.log('# Claude Code CLI:');
    console.log(out.claudeCodeCli);
    return;
  }
  // all
  console.log('=== Claude Desktop ===');
  console.log(`# path: ${claudeDesktopConfigPath()}`);
  console.log(JSON.stringify(out.claudeDesktop, null, 2));
  console.log('\n=== Cursor / Codex / generic stdio ===');
  console.log('# same JSON shape as above');
  console.log('\n=== Claude Code CLI ===');
  console.log(out.claudeCodeCli);
}

main();
