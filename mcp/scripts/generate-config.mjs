#!/usr/bin/env node
// Generate MCP client config for the published onot-mcp package.
// Usage:
//   node scripts/generate-config.mjs                       # print all client configs
//   node scripts/generate-config.mjs --client claude-desktop
//   node scripts/generate-config.mjs --client claude-desktop --write
//   node scripts/generate-config.mjs --name onot

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MCP_PACKAGE = 'onot-mcp@latest';

function parseArgs(argv) {
  const out = { client: 'all', write: false, serverName: 'onot' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--client') out.client = argv[++i];
    else if (a === '--write') out.write = true;
    else if (a === '--name') out.serverName = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: generate-config.mjs [--client claude-desktop|claude-code|cursor|codex|json|all] [--write] [--name <serverName>]');
      process.exit(0);
    }
  }
  return out;
}

function claudeDesktopConfigPath() {
  const home = homedir();
  switch (platform()) {
    case 'darwin': return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    default: return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'Claude', 'claude_desktop_config.json');
  }
}

function buildServerEntry() {
  return {
    command: 'npx',
    args: ['-y', MCP_PACKAGE],
  };
}

function shellQuote(s) {
  if (platform() === 'win32') {
    return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
  }
  return /[^\w@%+=:,./-]/.test(s) ? `'${s.replace(/'/g, `'\\''`)}'` : s;
}

function emitClaudeCodeCli(name) {
  return `claude mcp add ${name} -- npx -y ${MCP_PACKAGE}`;
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
  const entry = buildServerEntry();
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
    out.claudeCodeCli = emitClaudeCodeCli(name);
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
