# Onot - Next.js Note Taking App

Migration from Vite to Next.js completed! 

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

### Type Check

```bash
npm run typecheck
```

## MCP Server

Onot includes an MCP server so Claude Desktop, Claude Code, Cursor and other
MCP clients can read and edit a user's Onot workspaces through a personal
access token.

End users do not need to clone this repository. MCP clients can launch the
published package with one command:

```bash
npx -y onot-mcp@latest
```

The first launch opens Onot in the browser so the user can approve access.

See [`mcp/README.md`](mcp/README.md) for client configs, local development
instructions, and the npm release checklist.

## Features

- 📝 Rich note-taking with multiple block types
- 🎨 Dark mode support
- ⌨️ Keyboard shortcuts
- 🔍 Quick search (Ctrl+K)
- 📦 Local storage persistence
- 🔐 Supabase integration (optional)
- 💾 Auto-save functionality

## Keyboard Shortcuts

- **Ctrl+K** - Open search
- **Ctrl+N** - Create new page
- **Ctrl+D** - Duplicate block
- **Ctrl+Shift+D** - Delete block
- **Ctrl+↑/↓** - Move block
- **Ctrl+?** - Show shortcuts
- **Ctrl+\\** - Toggle sidebar

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── providers.tsx      # Client providers
│   └── providers/         # Context providers
├── components/            # React components
│   ├── Sidebar.tsx
│   ├── blocks/            # Block components
│   ├── pages/             # Page components
│   └── table/             # Table components
├── lib/                   # Utility functions
│   ├── types.ts          # TypeScript types
│   ├── storage.ts        # LocalStorage utilities
│   └── supabase.ts       # Supabase client
├── public/               # Static files
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── next.config.mjs       # Next.js config
└── tailwind.config.js    # Tailwind CSS config
```

## Migration Notes

✅ Successfully migrated from Vite to Next.js 15
✅ All core features preserved
✅ TypeScript configuration updated
✅ Tailwind CSS configured
✅ Environment variables updated for Next.js

## Development

The app is fully client-side for now but ready for server-side features:
- API routes can be added in `app/api/`
- Database integration ready via Supabase
- Authentication ready via AuthProvider

## License

Open source
