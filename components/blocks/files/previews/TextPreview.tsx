"use client"
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LANG_MAP } from "../../FileBlock";

export function TextPreview({ url, mime }: { url: string; mime?: string }) {
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
            <div className="p-8 flex justify-center rounded-t-xl bg-gray-50 dark:bg-zinc-900">
                <Loader2 size={18} className="text-gray-400 animate-spin" />
            </div>
        )
    }
    if (content === null) return null

    const lang = (mime && LANG_MAP[mime]) || ''

    return (
        <div className="relative rounded-t-xl bg-gray-50 dark:bg-zinc-900 overflow-hidden">
            {lang && (
                <span className="absolute top-2 right-3 text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none">
                    {lang}
                </span>
            )}
            <pre className="p-4 overflow-auto text-[13px] leading-relaxed font-mono text-gray-800 dark:text-gray-200 max-h-[400px] whitespace-pre-wrap break-words">
                <code>{content}</code>
            </pre>
        </div>
    )
}
