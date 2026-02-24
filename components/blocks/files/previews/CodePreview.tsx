'use client'

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LANG_MAP } from "../../FileBlock";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function CodePreview({ url, mime }: { url: string; mime?: string }) {
    const [content, setContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetch(url)
            .then(r => r.text())
            .then(t => { if (!cancelled) setContent(t) })
            .catch(() => { if (!cancelled) setContent(null) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [url])

    if (loading) {
        return (
            // On harmonise le fond avec le thème de VS Code (#1E1E1E)
            <div className="p-8 flex justify-center rounded-t-xl bg-[#1E1E1E]">
                <Loader2 size={18} className="text-gray-400 animate-spin" />
            </div>
        )
    }

    if (content === null) return null

    // Si on ne trouve pas de langage, on fallback sur 'text' pour éviter que la librairie ne plante
    const lang = (mime && LANG_MAP[mime]) || 'text'

    return (
        <div className="relative rounded-t-xl overflow-hidden bg-[#1E1E1E] border border-gray-200 dark:border-zinc-800">
            {/* Badge du langage */}
            {lang && lang !== 'text' && (
                <span className="absolute top-3 right-4 z-10 text-[10px] font-mono uppercase tracking-wider text-gray-400 select-none bg-[#1E1E1E]/80 px-2 py-1 rounded">
                    {lang}
                </span>
            )}

            {/* Rendu avec coloration syntaxique */}
            <SyntaxHighlighter
                language={lang}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    maxHeight: '400px',
                    backgroundColor: 'transparent', // Laisse le parent gérer le fond
                }}
                wrapLongLines={true} // Remplace ton 'whitespace-pre-wrap'
            >
                {content}
            </SyntaxHighlighter>
        </div>
    )
}