export function VideoPreview({ url }: { url: string }) {
    return <video src={url} controls className="w-full rounded-t-xl bg-black" />
}