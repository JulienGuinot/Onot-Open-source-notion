export function AudioPreview({ url, name }: { url: string; name?: string }) {
    return (
        <div className="px-6 py-5 flex flex-col items-center gap-3 bg-gradient-to-b from-gray-50 to-white dark:from-zinc-800/50 dark:to-zinc-900/30 rounded-t-xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-full">{name || 'Audio'}</span>
            <audio src={url} controls className="w-full max-w-md" />
        </div>
    )
}
