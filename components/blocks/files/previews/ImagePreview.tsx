export function ImagePreview({ url, name }: { url: string; name?: string }) {
    return <img src={url} alt={name || 'File'} className="w-full object-contain rounded-t-xl bg-gray-50 dark:bg-zinc-900" />
}
